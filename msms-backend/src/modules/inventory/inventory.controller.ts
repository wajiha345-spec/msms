import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { getLowStockProducts, setReorderPoint, transferStock } from './inventory.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function getLowStockHandler(req: AuthRequest, res: Response) {
  try {
    const products = await getLowStockProducts(req.user!.shopId);
    return ok(res, products);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function setReorderPointHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { reorderPoint } = req.body;
    const value = reorderPoint === null || reorderPoint === '' || reorderPoint === undefined
      ? null
      : Number(reorderPoint);
    const product = await setReorderPoint(req.user!.shopId, id, value);
    return ok(res, product);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function transferStockHandler(req: AuthRequest, res: Response) {
  try {
    const { productId, toBranchId, quantity } = req.body;
    if (!productId)  return fail(res, 'productId is required');
    if (!toBranchId) return fail(res, 'toBranchId is required');
    if (!quantity)   return fail(res, 'quantity is required');

    const io = req.app.get('io');
    const result = await transferStock(
      req.user!.shopId,
      { productId, toBranchId, quantity: Number(quantity), userId: req.user!.userId },
      io
    );
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
