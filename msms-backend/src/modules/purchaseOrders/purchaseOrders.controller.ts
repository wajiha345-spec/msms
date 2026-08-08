import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  cancelPurchaseOrder,
  receiveGoods,
} from './purchaseOrders.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function listPurchaseOrdersHandler(req: AuthRequest, res: Response) {
  try {
    const orders = await listPurchaseOrders(req.user!.shopId);
    return ok(res, orders);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getPurchaseOrderHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const order = await getPurchaseOrderById(req.user!.shopId, id);
    return ok(res, order);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function createPurchaseOrderHandler(req: AuthRequest, res: Response) {
  try {
    const { supplierName, supplierPhone, expectedDate, notes, items } = req.body;
    if (!items) return fail(res, 'items is required');

    const order = await createPurchaseOrder(req.user!.shopId, {
      supplierName, supplierPhone, expectedDate, notes, items, userId: req.user!.userId,
    });
    return ok(res, order);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function cancelPurchaseOrderHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const order = await cancelPurchaseOrder(req.user!.shopId, id);
    return ok(res, order);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function receiveGoodsHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { receipts, paymentType, paymentMethod, cashAmount, accountId, accountAmount } = req.body;
    if (!receipts) return fail(res, 'receipts is required');

    const io = req.app.get('io');
    const order = await receiveGoods(req.user!.shopId, id, {
      receipts, paymentType, userId: req.user!.userId,
      paymentMethod,
      cashAmount:    cashAmount    !== undefined ? Number(cashAmount)    : undefined,
      accountId,
      accountAmount: accountAmount !== undefined ? Number(accountAmount) : undefined,
    }, io);
    return ok(res, order);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
