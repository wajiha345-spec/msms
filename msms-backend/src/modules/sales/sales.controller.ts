import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { getSales, getSaleById, createSale } from './sales.service';

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
    const date = getQueryValue(req.query.date);

    const sales = await getSales(productId, date);
    return ok(res, sales);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const sale = await getSaleById(id);
    return ok(res, sale);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const {
      productId,
      quantity,
      salePrice,
      customerName,
      customerPhone,
      imei,
      secondhandId,
    } = req.body;

    if (!productId) return fail(res, 'productId is required');
    if (!quantity) return fail(res, 'quantity is required');
    if (!salePrice) return fail(res, 'salePrice is required');

    const io = req.app.get('io');

    const sale = await createSale(
      {
        productId,
        quantity: Number(quantity),
        salePrice: Number(salePrice),
        customerName,
        customerPhone,
        imei,
        secondhandId,
        userId: req.user!.userId,
      },
      io
    );

    return ok(res, sale);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
