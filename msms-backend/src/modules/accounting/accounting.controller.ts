import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
  setOpeningBalance,
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  getGeneralLedger,
  getTrialBalance,
  getBalanceSheet,
  getProfitAndLoss,
  getCashFlowReport,
  closePeriod,
  listClosingEntries,
} from './accounting.service';

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

// ── Chart of Accounts ────────────────────────────────────────────────────────

export async function listAccountsHandler(req: AuthRequest, res: Response) {
  try {
    const accounts = await listAccounts(req.user!.shopId);
    return ok(res, accounts);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createAccountHandler(req: AuthRequest, res: Response) {
  try {
    const { code, name, type, parentId } = req.body;
    const account = await createAccount(req.user!.shopId, { code, name, type, parentId });
    return ok(res, account);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function updateAccountHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { code, name, type, parentId, isActive } = req.body;
    const account = await updateAccount(req.user!.shopId, id, { code, name, type, parentId, isActive });
    return ok(res, account);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function deleteAccountHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const account = await deactivateAccount(req.user!.shopId, id);
    return ok(res, account);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function setOpeningBalanceHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { amount, date } = req.body;
    if (amount === undefined) return fail(res, 'amount is required');
    const account = await setOpeningBalance(
      req.user!.shopId,
      id,
      Number(amount),
      date ? new Date(date) : new Date()
    );
    return ok(res, account);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── Journal Entries ──────────────────────────────────────────────────────────

export async function listJournalEntriesHandler(req: AuthRequest, res: Response) {
  try {
    const dateFrom = getQueryValue(req.query.dateFrom);
    const dateTo   = getQueryValue(req.query.dateTo);
    const entries  = await getJournalEntries(req.user!.shopId, { dateFrom, dateTo });
    return ok(res, entries);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getJournalEntryHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const entry = await getJournalEntryById(req.user!.shopId, id);
    return ok(res, entry);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function createJournalEntryHandler(req: AuthRequest, res: Response) {
  try {
    const { date, memo, lines } = req.body;
    if (!lines) return fail(res, 'lines is required');
    const entry = await createJournalEntry(req.user!.shopId, req.user!.userId, { date, memo, lines });
    return ok(res, entry);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── General Ledger & Trial Balance ──────────────────────────────────────────

export async function getGeneralLedgerHandler(req: AuthRequest, res: Response) {
  try {
    const accountId = getParamValue(req.params.accountId);
    const dateFrom   = getQueryValue(req.query.dateFrom);
    const dateTo     = getQueryValue(req.query.dateTo);
    const ledger = await getGeneralLedger(req.user!.shopId, accountId, dateFrom, dateTo);
    return ok(res, ledger);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getTrialBalanceHandler(req: AuthRequest, res: Response) {
  try {
    const asOfDate = getQueryValue(req.query.asOfDate);
    const trialBalance = await getTrialBalance(req.user!.shopId, asOfDate);
    return ok(res, trialBalance);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── Balance Sheet, P&L, Cash Flow & Closing ─────────────────────────────────

export async function getBalanceSheetHandler(req: AuthRequest, res: Response) {
  try {
    const asOfDate = getQueryValue(req.query.asOfDate);
    const balanceSheet = await getBalanceSheet(req.user!.shopId, asOfDate);
    return ok(res, balanceSheet);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getProfitAndLossHandler(req: AuthRequest, res: Response) {
  try {
    const dateFrom = getQueryValue(req.query.dateFrom);
    const dateTo   = getQueryValue(req.query.dateTo);
    const pl = await getProfitAndLoss(req.user!.shopId, dateFrom, dateTo);
    return ok(res, pl);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getCashFlowHandler(req: AuthRequest, res: Response) {
  try {
    const dateFrom = getQueryValue(req.query.dateFrom);
    const dateTo   = getQueryValue(req.query.dateTo);
    const cashFlow = await getCashFlowReport(req.user!.shopId, dateFrom, dateTo);
    return ok(res, cashFlow);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createClosingEntryHandler(req: AuthRequest, res: Response) {
  try {
    const { periodStart, periodEnd, equityAccountId, memo } = req.body;
    if (!periodStart)      return fail(res, 'periodStart is required');
    if (!periodEnd)        return fail(res, 'periodEnd is required');
    if (!equityAccountId)  return fail(res, 'equityAccountId is required');

    const closingEntry = await closePeriod(req.user!.shopId, req.user!.userId, {
      periodStart, periodEnd, equityAccountId, memo,
    });
    return ok(res, closingEntry);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function listClosingEntriesHandler(req: AuthRequest, res: Response) {
  try {
    const closingEntries = await listClosingEntries(req.user!.shopId);
    return ok(res, closingEntries);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
