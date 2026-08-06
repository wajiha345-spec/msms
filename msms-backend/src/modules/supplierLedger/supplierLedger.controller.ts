import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listSuppliers,
  getSupplierStatement,
  getAgingReport,
  recordPayment,
  createCreditPurchase,
} from './supplierLedger.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid value is required');
}

export async function listSuppliersHandler(req: AuthRequest, res: Response) {
  try {
    const suppliers = await listSuppliers(req.user!.shopId);
    return ok(res, suppliers);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getStatementHandler(req: AuthRequest, res: Response) {
  try {
    const phone = getParamValue(req.params.phone);
    const statement = await getSupplierStatement(req.user!.shopId, phone);
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
    const { purchaseId, amount, method, note } = req.body;
    if (!purchaseId) return fail(res, 'purchaseId is required');
    if (!amount) return fail(res, 'amount is required');

    const result = await recordPayment(req.user!.shopId, {
      purchaseId, amount: Number(amount), method, note, userId: req.user!.userId,
    });
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createCreditPurchaseHandler(req: AuthRequest, res: Response) {
  try {
    const { productId, quantity, purchasePrice, supplierName, supplierPhone, paymentDueDate } = req.body;

    if (!productId)      return fail(res, 'productId is required');
    if (!quantity)        return fail(res, 'quantity is required');
    if (!purchasePrice)  return fail(res, 'purchasePrice is required');

    const io = req.app.get('io');
    const purchase = await createCreditPurchase(
      req.user!.shopId,
      {
        productId,
        quantity: Number(quantity),
        purchasePrice: Number(purchasePrice),
        supplierName,
        supplierPhone,
        paymentDueDate,
        userId: req.user!.userId,
      },
      io
    );
    return ok(res, purchase);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
