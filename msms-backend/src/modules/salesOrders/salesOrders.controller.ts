import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateStatus,
  cancelSalesOrder,
  markDelivered,
} from './salesOrders.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function listSalesOrdersHandler(req: AuthRequest, res: Response) {
  try {
    const orders = await listSalesOrders(req.user!.shopId);
    return ok(res, orders);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getSalesOrderHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const order = await getSalesOrderById(req.user!.shopId, id);
    return ok(res, order);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function createSalesOrderHandler(req: AuthRequest, res: Response) {
  try {
    const {
      customerName, customerPhone, deliveryDate, notes, items,
      paymentMethod, cashAmount, accountId, accountAmount,
    } = req.body;
    if (!items) return fail(res, 'items is required');

    const order = await createSalesOrder(req.user!.shopId, {
      customerName, customerPhone, deliveryDate, notes, items, userId: req.user!.userId,
      paymentMethod,
      cashAmount:    cashAmount    !== undefined ? Number(cashAmount)    : undefined,
      accountId,
      accountAmount: accountAmount !== undefined ? Number(accountAmount) : undefined,
    });
    return ok(res, order);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function updateStatusHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { status } = req.body;
    if (!status) return fail(res, 'status is required');
    const order = await updateStatus(req.user!.shopId, id, status);
    return ok(res, order);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function cancelSalesOrderHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const order = await cancelSalesOrder(req.user!.shopId, id);
    return ok(res, order);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function markDeliveredHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const io = req.app.get('io');
    const { paymentMethod, cashAmount, accountId, accountAmount } = req.body;
    const sales = await markDelivered(req.user!.shopId, req.user!.userId, id, io, {
      paymentMethod,
      cashAmount:    cashAmount    !== undefined ? Number(cashAmount)    : undefined,
      accountId,
      accountAmount: accountAmount !== undefined ? Number(accountAmount) : undefined,
    });
    return ok(res, sales);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
