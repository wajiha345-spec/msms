import { prisma } from '../../config/db';

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

// Debit-normal account types increase with a debit and decrease with a credit
// (Asset, Expense); the rest (Liability, Equity, Income) are credit-normal.
function isDebitNormal(type: string) {
  return type === 'ASSET' || type === 'EXPENSE';
}

interface AccountInput {
  code:      string;
  name:      string;
  type:      string;
  parentId?: string | null;
}

// Minimal starter Chart of Accounts, seeded once per shop on first access —
// mirrors how other modules (secondhand, catalog) lazily set up shop state
// instead of requiring a separate migration data script.
const DEFAULT_ACCOUNTS: { code: string; name: string; type: string }[] = [
  { code: '1000', name: 'Cash',                type: 'ASSET' },
  { code: '1010', name: 'Bank',                type: 'ASSET' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable',    type: 'LIABILITY' },
  { code: '3000', name: "Owner's Equity",      type: 'EQUITY' },
  { code: '4000', name: 'Sales Income',        type: 'INCOME' },
  { code: '5000', name: 'Cost of Goods Sold',  type: 'EXPENSE' },
  { code: '5100', name: 'General Expense',     type: 'EXPENSE' },
];

export async function ensureDefaultAccounts(shopId: string) {
  const count = await prisma.account.count({ where: { shopId } });
  if (count > 0) return;
  await prisma.account.createMany({
    data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, shopId, isSystem: true })),
  });
}

export async function listAccounts(shopId: string) {
  await ensureDefaultAccounts(shopId);
  return prisma.account.findMany({
    where:   { shopId },
    orderBy: { code: 'asc' },
  });
}

export async function createAccount(shopId: string, data: AccountInput) {
  if (!data.code?.trim()) throw new Error('Account code is required');
  if (!data.name?.trim()) throw new Error('Account name is required');
  if (!ACCOUNT_TYPES.includes(data.type)) throw new Error('Invalid account type');

  if (data.parentId) {
    const parent = await prisma.account.findFirst({ where: { id: data.parentId, shopId } });
    if (!parent) throw new Error('Parent account not found');
  }

  const existing = await prisma.account.findFirst({ where: { shopId, code: data.code.trim() } });
  if (existing) throw new Error('An account with this code already exists');

  return prisma.account.create({
    data: {
      shopId,
      code:     data.code.trim(),
      name:     data.name.trim(),
      type:     data.type,
      parentId: data.parentId ?? null,
    },
  });
}

export async function updateAccount(
  shopId: string,
  id: string,
  data: Partial<AccountInput> & { isActive?: boolean }
) {
  const existing = await prisma.account.findFirst({ where: { id, shopId } });
  if (!existing) throw new Error('Account not found');
  if (data.type && !ACCOUNT_TYPES.includes(data.type)) throw new Error('Invalid account type');

  return prisma.account.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code.trim() } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function deactivateAccount(shopId: string, id: string) {
  const existing = await prisma.account.findFirst({ where: { id, shopId } });
  if (!existing) throw new Error('Account not found');
  if (existing.isSystem) throw new Error('Default system accounts cannot be deleted');
  return prisma.account.update({ where: { id }, data: { isActive: false } });
}

export async function setOpeningBalance(
  shopId: string,
  accountId: string,
  amount: number,
  date: Date
) {
  const existing = await prisma.account.findFirst({ where: { id: accountId, shopId } });
  if (!existing) throw new Error('Account not found');
  return prisma.account.update({
    where: { id: accountId },
    data:  { openingBalance: amount, openingBalanceDate: date },
  });
}

// Build entry number like JE-20260806-0001 — same per-shop-per-day counter
// pattern as sales.service.ts:generateInvoiceNo.
async function generateEntryNo(shopId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.journalEntry.count({
    where: { shopId, createdAt: { gte: startOfDay } },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `JE-${dateStr}-${seq}`;
}

export interface JournalLineInput {
  accountId:    string;
  debit?:       number;
  credit?:      number;
  description?: string;
}

interface CreateJournalEntryInput {
  date?: string | Date;
  memo?: string;
  lines: JournalLineInput[];
}

interface PostOptions {
  sourceType?:   'MANUAL' | 'SYSTEM';
  sourceModule?: string;
  sourceId?:     string;
}

export async function createJournalEntry(
  shopId: string,
  userId: string,
  data: CreateJournalEntryInput,
  opts: PostOptions = {}
) {
  if (!Array.isArray(data.lines) || data.lines.length < 2) {
    throw new Error('A journal entry needs at least two lines');
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const accountIds = new Set<string>();

  for (const line of data.lines) {
    if (!line.accountId) throw new Error('Each line requires an accountId');
    const debit  = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    if (debit < 0 || credit < 0) throw new Error('Debit/credit cannot be negative');
    if (debit > 0 && credit > 0) throw new Error('A line cannot have both a debit and a credit');
    if (debit === 0 && credit === 0) throw new Error('Each line needs a debit or a credit amount');
    totalDebit  += debit;
    totalCredit += credit;
    accountIds.add(line.accountId);
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Journal entry does not balance: debit ${totalDebit.toFixed(2)} vs credit ${totalCredit.toFixed(2)}`
    );
  }

  const accounts = await prisma.account.findMany({
    where: { id: { in: [...accountIds] }, shopId },
  });
  if (accounts.length !== accountIds.size) {
    throw new Error('One or more accounts were not found');
  }

  const entryNo = await generateEntryNo(shopId);
  const date    = data.date ? new Date(data.date) : new Date();

  return prisma.journalEntry.create({
    data: {
      shopId,
      entryNo,
      date,
      memo:            data.memo,
      sourceType:      opts.sourceType ?? 'MANUAL',
      sourceModule:    opts.sourceModule,
      sourceId:        opts.sourceId,
      createdByUserId: userId,
      lines: {
        create: data.lines.map((l) => ({
          accountId:   l.accountId,
          debit:       Number(l.debit ?? 0),
          credit:      Number(l.credit ?? 0),
          description: l.description,
        })),
      },
    },
    include: {
      lines: { include: { account: { select: { code: true, name: true } } } },
    },
  });
}

// Thin wrapper for future Business Management modules (Expense, Income,
// Customer/Supplier Ledger, Cash & Bank) to post system-generated entries
// without duplicating the balance-check/validation logic above.
export async function postJournalEntry(
  shopId: string,
  userId: string,
  data: {
    date?:         string | Date;
    memo?:         string;
    sourceModule:  string;
    sourceId:      string;
    lines:         JournalLineInput[];
  }
) {
  return createJournalEntry(
    shopId,
    userId,
    { date: data.date, memo: data.memo, lines: data.lines },
    { sourceType: 'SYSTEM', sourceModule: data.sourceModule, sourceId: data.sourceId }
  );
}

export async function getJournalEntries(
  shopId: string,
  filters: { dateFrom?: string; dateTo?: string } = {}
) {
  const where: any = { shopId };
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo)   where.date.lte = new Date(filters.dateTo);
  }

  return prisma.journalEntry.findMany({
    where,
    include: {
      lines:     { include: { account: { select: { code: true, name: true } } } },
      createdBy: { select: { username: true } },
    },
    orderBy: { date: 'desc' },
  });
}

export async function getJournalEntryById(shopId: string, id: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id, shopId },
    include: {
      lines:     { include: { account: { select: { code: true, name: true } } } },
      createdBy: { select: { username: true } },
    },
  });
  if (!entry) throw new Error('Journal entry not found');
  return entry;
}

export async function getGeneralLedger(
  shopId: string,
  accountId: string,
  dateFrom?: string,
  dateTo?: string
) {
  const account = await prisma.account.findFirst({ where: { id: accountId, shopId } });
  if (!account) throw new Error('Account not found');

  const journalEntryFilter: any = { shopId };
  if (dateFrom || dateTo) {
    journalEntryFilter.date = {};
    if (dateFrom) journalEntryFilter.date.gte = new Date(dateFrom);
    if (dateTo)   journalEntryFilter.date.lte = new Date(dateTo);
  }

  const lines = await prisma.journalEntryLine.findMany({
    where:   { accountId, journalEntry: journalEntryFilter },
    include: { journalEntry: { select: { entryNo: true, date: true, memo: true } } },
    orderBy: { journalEntry: { date: 'asc' } },
  });

  const debitNormal = isDebitNormal(account.type);
  let balance = account.openingBalance;

  const entries = lines.map((line) => {
    const delta = debitNormal ? line.debit - line.credit : line.credit - line.debit;
    balance += delta;
    return {
      id:          line.id,
      entryNo:     line.journalEntry.entryNo,
      date:        line.journalEntry.date,
      memo:        line.journalEntry.memo,
      description: line.description,
      debit:       line.debit,
      credit:      line.credit,
      balance,
    };
  });

  return {
    account: {
      id:             account.id,
      code:           account.code,
      name:           account.name,
      type:           account.type,
      openingBalance: account.openingBalance,
    },
    entries,
    closingBalance: balance,
  };
}

export async function getTrialBalance(shopId: string, asOfDate?: string) {
  const accounts = await prisma.account.findMany({
    where:   { shopId, isActive: true },
    orderBy: { code: 'asc' },
  });

  const journalEntryFilter: any = { shopId };
  if (asOfDate) journalEntryFilter.date = { lte: new Date(asOfDate) };

  const grouped = await prisma.journalEntryLine.groupBy({
    by:    ['accountId'],
    where: { journalEntry: journalEntryFilter },
    _sum:  { debit: true, credit: true },
  });
  const sumsByAccount = new Map(
    grouped.map((g) => [g.accountId, { debit: g._sum.debit ?? 0, credit: g._sum.credit ?? 0 }])
  );

  let totalDebit = 0;
  let totalCredit = 0;

  const rows = accounts.map((acc) => {
    const sums = sumsByAccount.get(acc.id) ?? { debit: 0, credit: 0 };
    const debitNormal   = isDebitNormal(acc.type);
    const openingDebit  = debitNormal ? acc.openingBalance : 0;
    const openingCredit = debitNormal ? 0 : acc.openingBalance;
    const net = (openingDebit + sums.debit) - (openingCredit + sums.credit);

    const debit  = net > 0 ? net : 0;
    const credit = net < 0 ? -net : 0;
    totalDebit  += debit;
    totalCredit += credit;

    return {
      accountId: acc.id,
      code:      acc.code,
      name:      acc.name,
      type:      acc.type,
      debit,
      credit,
    };
  });

  return { asOfDate: asOfDate ?? null, rows, totalDebit, totalCredit };
}

// ── Phase 5: Balance Sheet, P&L, Cash Flow & Closing ──────────────────────────
// Reports below reuse getTrialBalance()/the same groupBy patterns rather than
// recomputing balances independently. Closing reuses createJournalEntry()
// unchanged — a closing entry is just a specially-constructed journal entry.

export async function getBalanceSheet(shopId: string, asOfDate?: string) {
  const trialBalance = await getTrialBalance(shopId, asOfDate);
  const netOf = (r: { debit: number; credit: number }) => r.debit - r.credit;

  const assets = trialBalance.rows
    .filter((r) => r.type === 'ASSET')
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balance: netOf(r) }));
  const liabilities = trialBalance.rows
    .filter((r) => r.type === 'LIABILITY')
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balance: -netOf(r) }));
  const equity = trialBalance.rows
    .filter((r) => r.type === 'EQUITY')
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balance: -netOf(r) }));

  // Assets = Liabilities + Equity + Income - Expense always holds (every
  // journal entry balances), so an as-yet-unclosed period's net income has
  // to be folded into Equity's total for the sheet to balance.
  const totalIncome = trialBalance.rows
    .filter((r) => r.type === 'INCOME')
    .reduce((sum, r) => sum - netOf(r), 0);
  const totalExpense = trialBalance.rows
    .filter((r) => r.type === 'EXPENSE')
    .reduce((sum, r) => sum + netOf(r), 0);
  const currentPeriodEarnings = totalIncome - totalExpense;

  const totalAssets      = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity      = equity.reduce((sum, a) => sum + a.balance, 0) + currentPeriodEarnings;

  return {
    asOfDate: trialBalance.asOfDate,
    assets,
    liabilities,
    equity,
    currentPeriodEarnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

export async function getProfitAndLoss(shopId: string, dateFrom?: string, dateTo?: string) {
  const accounts = await prisma.account.findMany({
    where:   { shopId, isActive: true, type: { in: ['INCOME', 'EXPENSE'] } },
    orderBy: { code: 'asc' },
  });

  const journalEntryFilter: any = { shopId };
  if (dateFrom || dateTo) {
    journalEntryFilter.date = {};
    if (dateFrom) journalEntryFilter.date.gte = new Date(dateFrom);
    if (dateTo)   journalEntryFilter.date.lte = new Date(dateTo);
  }

  const grouped = await prisma.journalEntryLine.groupBy({
    by:    ['accountId'],
    where: { accountId: { in: accounts.map((a) => a.id) }, journalEntry: journalEntryFilter },
    _sum:  { debit: true, credit: true },
  });
  const sumsByAccount = new Map(
    grouped.map((g) => [g.accountId, { debit: g._sum.debit ?? 0, credit: g._sum.credit ?? 0 }])
  );

  const income = accounts
    .filter((a) => a.type === 'INCOME')
    .map((a) => {
      const s = sumsByAccount.get(a.id) ?? { debit: 0, credit: 0 };
      return { accountId: a.id, code: a.code, name: a.name, amount: s.credit - s.debit };
    })
    .filter((r) => Math.abs(r.amount) > 0.001);

  const expense = accounts
    .filter((a) => a.type === 'EXPENSE')
    .map((a) => {
      const s = sumsByAccount.get(a.id) ?? { debit: 0, credit: 0 };
      return { accountId: a.id, code: a.code, name: a.name, amount: s.debit - s.credit };
    })
    .filter((r) => Math.abs(r.amount) > 0.001);

  const totalIncome  = income.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = expense.reduce((sum, r) => sum + r.amount, 0);
  const netProfit     = totalIncome - totalExpense;

  return { dateFrom: dateFrom ?? null, dateTo: dateTo ?? null, income, expense, totalIncome, totalExpense, netProfit };
}

export async function getCashFlowReport(shopId: string, dateFrom?: string, dateTo?: string) {
  // Same convention as cashBank.service.ts: any active ASSET account counts
  // as Cash/Bank for this report.
  const accounts = await prisma.account.findMany({ where: { shopId, type: 'ASSET', isActive: true } });
  const accountIds = accounts.map((a) => a.id);

  const journalEntryFilter: any = { shopId };
  if (dateFrom || dateTo) {
    journalEntryFilter.date = {};
    if (dateFrom) journalEntryFilter.date.gte = new Date(dateFrom);
    if (dateTo)   journalEntryFilter.date.lte = new Date(dateTo);
  }

  const lines = await prisma.journalEntryLine.findMany({
    where:   { accountId: { in: accountIds }, journalEntry: journalEntryFilter },
    include: { journalEntry: { select: { sourceModule: true } } },
  });

  const byCategory = new Map<string, { inflow: number; outflow: number }>();
  for (const line of lines) {
    const cat = line.journalEntry.sourceModule ?? 'MANUAL';
    const entry = byCategory.get(cat) ?? { inflow: 0, outflow: 0 };
    entry.inflow  += line.debit;
    entry.outflow += line.credit;
    byCategory.set(cat, entry);
  }
  const categories = [...byCategory.entries()]
    .map(([category, v]) => ({ category, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const totalInflow  = categories.reduce((sum, c) => sum + c.inflow, 0);
  const totalOutflow = categories.reduce((sum, c) => sum + c.outflow, 0);
  const netChange    = totalInflow - totalOutflow;

  // Closing balance as of dateTo, computed the same way cashBank.service.ts
  // does per-account, summed across all Cash/Bank accounts; opening balance
  // is derived rather than queried separately.
  const closingFilter: any = { shopId };
  if (dateTo) closingFilter.date = { lte: new Date(dateTo) };
  const closingSums = await prisma.journalEntryLine.aggregate({
    where: { accountId: { in: accountIds }, journalEntry: closingFilter },
    _sum:  { debit: true, credit: true },
  });
  const openingBalanceSum = accounts.reduce((sum, a) => sum + a.openingBalance, 0);
  const closingBalance = openingBalanceSum + (closingSums._sum.debit ?? 0) - (closingSums._sum.credit ?? 0);
  const openingBalance = closingBalance - netChange;

  return {
    dateFrom: dateFrom ?? null,
    dateTo:   dateTo ?? null,
    categories,
    totalInflow,
    totalOutflow,
    netChange,
    openingBalance,
    closingBalance,
  };
}

interface ClosePeriodInput {
  periodStart:     string | Date;
  periodEnd:       string | Date;
  equityAccountId: string;
  memo?:           string;
}

export async function closePeriod(shopId: string, userId: string, data: ClosePeriodInput) {
  const equityAccount = await prisma.account.findFirst({ where: { id: data.equityAccountId, shopId } });
  if (!equityAccount) throw new Error('Equity account not found');
  if (equityAccount.type !== 'EQUITY') throw new Error('equityAccountId must reference an EQUITY account');

  const periodStart = new Date(data.periodStart);
  const periodEnd   = new Date(data.periodEnd);
  if (periodStart > periodEnd) throw new Error('periodStart must be before periodEnd');

  const overlap = await prisma.closingEntry.findFirst({
    where: { shopId, periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart } },
  });
  if (overlap) throw new Error('This period overlaps with an existing closing entry');

  const pl = await getProfitAndLoss(shopId, periodStart.toISOString(), periodEnd.toISOString());
  if (pl.income.length === 0 && pl.expense.length === 0) {
    throw new Error('No income or expense activity to close for this period');
  }

  const lines: JournalLineInput[] = [];
  for (const inc of pl.income) {
    if (inc.amount > 0)      lines.push({ accountId: inc.accountId, debit:  inc.amount, description: 'Closing entry' });
    else if (inc.amount < 0) lines.push({ accountId: inc.accountId, credit: -inc.amount, description: 'Closing entry' });
  }
  for (const exp of pl.expense) {
    if (exp.amount > 0)      lines.push({ accountId: exp.accountId, credit: exp.amount, description: 'Closing entry' });
    else if (exp.amount < 0) lines.push({ accountId: exp.accountId, debit:  -exp.amount, description: 'Closing entry' });
  }
  // Net profit/loss balances the entry — omitted when exactly zero, since
  // the income/expense lines alone already balance in that case.
  if (pl.netProfit > 0.01)      lines.push({ accountId: data.equityAccountId, credit: pl.netProfit });
  else if (pl.netProfit < -0.01) lines.push({ accountId: data.equityAccountId, debit: -pl.netProfit });

  const entry = await createJournalEntry(
    shopId,
    userId,
    {
      date: periodEnd,
      memo: data.memo ?? `Closing entry: ${periodStart.toDateString()} - ${periodEnd.toDateString()}`,
      lines,
    },
    { sourceType: 'SYSTEM', sourceModule: 'CLOSING' }
  );

  return prisma.closingEntry.create({
    data: {
      shopId,
      periodStart,
      periodEnd,
      netIncome:       pl.netProfit,
      equityAccountId: data.equityAccountId,
      journalEntryId:  entry.id,
      userId,
    },
    include: {
      equityAccount: { select: { code: true, name: true } },
      journalEntry:  { select: { entryNo: true } },
    },
  });
}

export async function listClosingEntries(shopId: string) {
  return prisma.closingEntry.findMany({
    where:   { shopId },
    include: {
      equityAccount: { select: { code: true, name: true } },
      journalEntry:  { select: { entryNo: true } },
      createdBy:     { select: { username: true } },
    },
    orderBy: { periodEnd: 'desc' },
  });
}
