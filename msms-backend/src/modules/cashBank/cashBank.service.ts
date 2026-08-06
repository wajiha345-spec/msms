import { prisma } from '../../config/db';
import {
  createJournalEntry,
  getJournalEntries,
  getGeneralLedger,
} from '../accounting/accounting.service';

const SOURCE_MODULES = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'] as const;
type CashBankSourceModule = (typeof SOURCE_MODULES)[number];

async function getAccountBalance(shopId: string, accountId: string): Promise<number> {
  const account = await prisma.account.findFirst({ where: { id: accountId, shopId } });
  if (!account) throw new Error('Account not found');

  const sums = await prisma.journalEntryLine.aggregate({
    where: { accountId, journalEntry: { shopId } },
    _sum: { debit: true, credit: true },
  });

  // Cash/Bank accounts are always ASSET (debit-normal)
  return account.openingBalance + (sums._sum.debit ?? 0) - (sums._sum.credit ?? 0);
}

export async function listCashBankAccounts(shopId: string) {
  const accounts = await prisma.account.findMany({
    where:   { shopId, type: 'ASSET', isActive: true },
    orderBy: { code: 'asc' },
  });

  const balances = await Promise.all(accounts.map((a) => getAccountBalance(shopId, a.id)));
  return accounts.map((a, i) => ({ ...a, balance: balances[i] }));
}

async function assertAssetAccount(shopId: string, accountId: string, label: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, shopId } });
  if (!account) throw new Error(`${label} not found`);
  if (account.type !== 'ASSET') throw new Error(`${label} must be a Cash/Bank (ASSET) account`);
  return account;
}

interface MoveMoneyInput {
  toAccountId:   string;
  fromAccountId: string;
  amount:        number;
  date?:         string | Date;
  memo?:         string;
  userId:        string;
}

async function postMoneyMovement(
  shopId: string,
  data: MoveMoneyInput,
  sourceModule: CashBankSourceModule
) {
  if (!data.amount || data.amount <= 0) throw new Error('amount must be greater than 0');
  if (data.toAccountId === data.fromAccountId) throw new Error('From and To accounts must be different');

  return createJournalEntry(
    shopId,
    data.userId,
    {
      date: data.date,
      memo: data.memo ?? sourceModule.charAt(0) + sourceModule.slice(1).toLowerCase(),
      lines: [
        { accountId: data.toAccountId,   debit:  data.amount },
        { accountId: data.fromAccountId, credit: data.amount },
      ],
    },
    { sourceType: 'SYSTEM', sourceModule }
  );
}

export async function recordDeposit(shopId: string, data: MoveMoneyInput) {
  await assertAssetAccount(shopId, data.toAccountId, 'Deposit-to account');
  return postMoneyMovement(shopId, data, 'DEPOSIT');
}

export async function recordWithdrawal(shopId: string, data: MoveMoneyInput) {
  await assertAssetAccount(shopId, data.fromAccountId, 'Withdrawal-from account');
  return postMoneyMovement(shopId, data, 'WITHDRAWAL');
}

export async function recordTransfer(shopId: string, data: MoveMoneyInput) {
  await assertAssetAccount(shopId, data.toAccountId,   'Transfer-to account');
  await assertAssetAccount(shopId, data.fromAccountId, 'Transfer-from account');
  return postMoneyMovement(shopId, data, 'TRANSFER');
}

export async function listTransactions(shopId: string, accountId?: string) {
  const entries = await getJournalEntries(shopId, {});
  const filtered = entries.filter((e) => (SOURCE_MODULES as readonly string[]).includes(e.sourceModule ?? ''));
  if (!accountId) return filtered;
  return filtered.filter((e) => e.lines.some((l) => l.accountId === accountId));
}

interface CreateReconciliationInput {
  accountId:        string;
  statementDate:    string | Date;
  statementBalance: number;
  note?:            string;
  userId:           string;
}

export async function createReconciliation(shopId: string, data: CreateReconciliationInput) {
  await assertAssetAccount(shopId, data.accountId, 'Account');
  if (data.statementBalance === undefined || data.statementBalance === null) {
    throw new Error('statementBalance is required');
  }

  const statementDate = new Date(data.statementDate);
  const ledger = await getGeneralLedger(shopId, data.accountId, undefined, statementDate.toISOString());
  const bookBalance = ledger.closingBalance;
  const difference  = data.statementBalance - bookBalance;

  return prisma.reconciliation.create({
    data: {
      shopId,
      accountId:        data.accountId,
      statementDate,
      statementBalance: data.statementBalance,
      bookBalance,
      difference,
      note:             data.note,
      userId:           data.userId,
    },
    include: { account: { select: { code: true, name: true } } },
  });
}

export async function listReconciliations(shopId: string, accountId?: string) {
  return prisma.reconciliation.findMany({
    where:   { shopId, ...(accountId ? { accountId } : {}) },
    include: { account: { select: { code: true, name: true } }, createdBy: { select: { username: true } } },
    orderBy: { statementDate: 'desc' },
  });
}
