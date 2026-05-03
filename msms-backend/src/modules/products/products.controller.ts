import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  getProducts,
  getProductById,
  getProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
} from './products.service';
import { contributeToCatalog } from '../catalog/catalog.service';

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

// ── GET /api/products/scan/:code — look up by IMEI or barcode ──
export async function scanProduct(req: AuthRequest, res: Response) {
  try {
    const code = getParamValue(req.params.code);
    const product = await getProductByCode(code);
    if (!product) return fail(res, 'Product not found for this IMEI/barcode', 404);
    return ok(res, product);
  } catch (e: any) {
    return fail(res, e.message);
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
      barcode,
      purchasePrice,
      salePrice,
      stock,
      isSecondhand,
      storage,
      color,
      ram,
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
      imei:     imei    ?? undefined,
      barcode:  barcode ?? undefined,
      purchasePrice: Number(purchasePrice),
      salePrice:     Number(salePrice),
      stock:         Number(stock ?? 0),
      isSecondhand:  Boolean(isSecondhand ?? false),
      storage:  storage  ?? undefined,
      color:    color    ?? undefined,
      ram:      ram      ?? undefined,
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

// ── POST /api/products/import — bulk create from CSV rows ─────────────────────
export async function importProducts(req: AuthRequest, res: Response) {
  try {
    const rows: any[] = req.body.products;
    if (!Array.isArray(rows) || rows.length === 0) {
      return fail(res, 'products array is required', 400);
    }

    const created: string[] = [];
    const errors:  { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.name || !r.brand || r.purchasePrice == null || r.salePrice == null) {
          throw new Error('name, brand, purchasePrice and salePrice are required');
        }
        const product = await createProduct({
          name:          String(r.name).trim(),
          brand:         String(r.brand).trim(),
          category:      String(r.category  || 'phone').trim(),
          condition:     r.condition === 'used' ? 'used' : 'new',
          imei:          r.imei    ? String(r.imei).trim()    : undefined,
          barcode:       r.barcode ? String(r.barcode).trim() : undefined,
          purchasePrice: Number(r.purchasePrice),
          salePrice:     Number(r.salePrice),
          stock:         Number(r.stock ?? 0),
          isSecondhand:  false,
        });

        // Contribute to shared catalog automatically
        if (r.barcode && r.name) {
          await contributeToCatalog({
            barcode:  String(r.barcode).trim(),
            name:     String(r.name).trim(),
            brand:    String(r.brand).trim(),
            category: String(r.category || 'phone').trim(),
          });
        }

        created.push(product.id);
      } catch (e: any) {
        errors.push({ row: i + 2, name: r.name ?? '—', error: e.message });
      }
    }

    return ok(res, { created: created.length, errors });
  } catch (e: any) {
    return fail(res, e.message);
  }
}


