import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
} from './purchases.service';
import { notifyPurchaseRecorded } from '../notifications/notifications.service';

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const productId = getQueryValue(req.query.productId);
    const purchases = await getPurchases(req.user!.shopId, productId);
    return ok(res, purchases);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const purchase = await getPurchaseById(req.user!.shopId, id);
    return ok(res, purchase);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const {
      productId,
      quantity,
      purchasePrice,
      supplierName,
      supplierPhone,
      paymentType,
      paymentDueDate,
      branchId,
    } = req.body;

    if (!productId) return fail(res, 'productId is required');
    if (!quantity) return fail(res, 'quantity is required');
    if (!purchasePrice) return fail(res, 'purchasePrice is required');

    const io = req.app.get('io');

    const purchase = await createPurchase(
      req.user!.shopId,
      {
        productId,
        quantity: Number(quantity),
        purchasePrice: Number(purchasePrice),
        supplierName,
        supplierPhone,
        paymentType,
        paymentDueDate,
        branchId: branchId ?? undefined,
        userId: req.user!.userId,
      },
      io
    );

    // Fire-and-forget — manual "New Purchase" entry only; PO receiveGoods
    // calls createPurchase directly and fires its own distinct
    // PURCHASE_ORDER_RECEIVED notification instead, so this doesn't
    // double-notify per line item on a received PO.
    notifyPurchaseRecorded(req.user!.shopId, {
      purchaseId:  purchase.id,
      productId:   purchase.productId,
      quantity:    purchase.quantity,
      actorUserId: req.user!.userId,
      actorRole:   req.user!.role,
    }).catch(() => {});

    return ok(res, purchase);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
