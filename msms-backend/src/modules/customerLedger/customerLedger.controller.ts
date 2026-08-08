import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listCustomers,
  getCustomerStatement,
  getAgingReport,
  recordPayment,
} from './customerLedger.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid value is required');
}

export async function listCustomersHandler(req: AuthRequest, res: Response) {
  try {
    const customers = await listCustomers(req.user!.shopId);
    return ok(res, customers);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getStatementHandler(req: AuthRequest, res: Response) {
  try {
    const phone = getParamValue(req.params.phone);
    const statement = await getCustomerStatement(req.user!.shopId, phone);
    return ok(res, statement);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getAgingHandler(req: AuthRequest, res: Response) {
  try {
    const report = await getAgingReport(req.user!.shopId);
    return ok(res, report);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function recordPaymentHandler(req: AuthRequest, res: Response) {
  try {
    const { saleId, amount, method, note, cashAmount, accountId, accountAmount } = req.body;
    if (!saleId) return fail(res, 'saleId is required');
    if (!amount) return fail(res, 'amount is required');

    const io = req.app.get('io');
    const result = await recordPayment(
      req.user!.shopId,
      {
        saleId, amount: Number(amount), method, note, userId: req.user!.userId,
        cashAmount:    cashAmount    !== undefined ? Number(cashAmount)    : undefined,
        accountId,
        accountAmount: accountAmount !== undefined ? Number(accountAmount) : undefined,
      },
      io
    );
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
