import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from './products.service';

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
    const search = getQueryValue(req.query.search);
    const condition = getQueryValue(req.query.condition);

    const products = await getProducts(search, condition);
    return ok(res, products);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const product = await getProductById(id);
    return ok(res, product);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      brand,
      category,
      condition,
      imei,
      purchasePrice,
      salePrice,
      stock,
      isSecondhand,
    } = req.body;

    if (
      !name ||
      !brand ||
      !condition ||
      purchasePrice == null ||
      salePrice == null
    ) {
      return fail(
        res,
        'name, brand, condition, purchasePrice and salePrice are required',
      );
    }

    const product = await createProduct({
      name,
      brand,
      category: category ?? 'phone',
      condition,
      imei: imei ?? undefined,
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      stock: Number(stock ?? 0),
      isSecondhand: Boolean(isSecondhand ?? false),
    });

    return ok(res, product);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const product = await updateProduct(id, req.body);
    return ok(res, product);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    await deleteProduct(id);
    return ok(res, { message: 'Product deleted' });
  } catch (e: any) {
    return fail(res, e.message);
  }
}


