import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
} from './purchases.service';

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
    const purchases = await getPurchases(productId);
    return ok(res, purchases);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const purchase = await getPurchaseById(id);
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
    } = req.body;

    if (!productId) return fail(res, 'productId is required');
    if (!quantity) return fail(res, 'quantity is required');
    if (!purchasePrice) return fail(res, 'purchasePrice is required');

    const io = req.app.get('io');

    const purchase = await createPurchase(
      {
        productId,
        quantity: Number(quantity),
        purchasePrice: Number(purchasePrice),
        supplierName,
        supplierPhone,
        userId: req.user!.userId,
      },
      io
    );

    return ok(res, purchase);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
