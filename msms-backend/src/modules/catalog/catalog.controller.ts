import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { lookupCatalog, contributeToCatalog, deleteCatalogEntry, listCatalog } from './catalog.service';

// GET /api/catalog/:barcode
export async function lookup(req: AuthRequest, res: Response) {
  try {
    const barcode = (req.params.barcode as string)?.trim();
    if (!barcode) return fail(res, 'Barcode is required', 400);

    const entry = await lookupCatalog(barcode);
    if (!entry) return fail(res, 'Not found in catalog', 404);

    return ok(res, entry);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// GET /api/catalog  (list all entries for management screen)
export async function list(req: AuthRequest, res: Response) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const entries = await listCatalog(search);
    return ok(res, entries);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// POST /api/catalog
export async function contribute(req: AuthRequest, res: Response) {
  try {
    const { barcode, name, brand, category } = req.body;
    if (!barcode || !name) return fail(res, 'barcode and name are required', 400);

    await contributeToCatalog({
      barcode,
      name,
      brand:    brand    ?? '',
      category: category ?? 'phone',
    });

    return ok(res, { contributed: true });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// DELETE /api/catalog/:id
export async function remove(req: AuthRequest, res: Response) {
  try {
    const id = (req.params.id as string)?.trim();
    if (!id) return fail(res, 'id is required', 400);
    await deleteCatalogEntry(id);
    return ok(res, { deleted: true });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
