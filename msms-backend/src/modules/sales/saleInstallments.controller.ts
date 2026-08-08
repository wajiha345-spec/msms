import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { listDueInstallments, markInstallmentPaid } from './saleInstallments.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const installments = await listDueInstallments(req.user!.shopId);
    return ok(res, installments);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function markPaid(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { paymentMethod, cashAmount, accountId, accountAmount } = req.body;
    const io = req.app.get('io');

    const installment = await markInstallmentPaid(
      req.user!.shopId,
      id,
      {
        userId: req.user!.userId,
        paymentMethod,
        cashAmount:    cashAmount    !== undefined ? Number(cashAmount)    : undefined,
        accountId,
        accountAmount: accountAmount !== undefined ? Number(accountAmount) : undefined,
      },
      io
    );
    return ok(res, installment);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
