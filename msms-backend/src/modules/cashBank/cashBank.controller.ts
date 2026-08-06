import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listCashBankAccounts,
  recordDeposit,
  recordWithdrawal,
  recordTransfer,
  listTransactions,
  createReconciliation,
  listReconciliations,
} from './cashBank.service';

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export async function listAccountsHandler(req: AuthRequest, res: Response) {
  try {
    const accounts = await listCashBankAccounts(req.user!.shopId);
    return ok(res, accounts);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

function buildMoveInput(req: AuthRequest) {
  const { toAccountId, fromAccountId, amount, date, memo } = req.body;
  if (!toAccountId)   throw new Error('toAccountId is required');
  if (!fromAccountId) throw new Error('fromAccountId is required');
  if (!amount)          throw new Error('amount is required');
  return { toAccountId, fromAccountId, amount: Number(amount), date, memo, userId: req.user!.userId };
}

export async function createDepositHandler(req: AuthRequest, res: Response) {
  try {
    const entry = await recordDeposit(req.user!.shopId, buildMoveInput(req));
    return ok(res, entry);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createWithdrawalHandler(req: AuthRequest, res: Response) {
  try {
    const entry = await recordWithdrawal(req.user!.shopId, buildMoveInput(req));
    return ok(res, entry);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createTransferHandler(req: AuthRequest, res: Response) {
  try {
    const entry = await recordTransfer(req.user!.shopId, buildMoveInput(req));
    return ok(res, entry);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function listTransactionsHandler(req: AuthRequest, res: Response) {
  try {
    const accountId = getQueryValue(req.query.accountId);
    const transactions = await listTransactions(req.user!.shopId, accountId);
    return ok(res, transactions);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createReconciliationHandler(req: AuthRequest, res: Response) {
  try {
    const { accountId, statementDate, statementBalance, note } = req.body;
    if (!accountId)      return fail(res, 'accountId is required');
    if (!statementDate)  return fail(res, 'statementDate is required');
    if (statementBalance === undefined) return fail(res, 'statementBalance is required');

    const reconciliation = await createReconciliation(req.user!.shopId, {
      accountId, statementDate, statementBalance: Number(statementBalance), note, userId: req.user!.userId,
    });
    return ok(res, reconciliation);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function listReconciliationsHandler(req: AuthRequest, res: Response) {
  try {
    const accountId = getQueryValue(req.query.accountId);
    const reconciliations = await listReconciliations(req.user!.shopId, accountId);
    return ok(res, reconciliations);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
