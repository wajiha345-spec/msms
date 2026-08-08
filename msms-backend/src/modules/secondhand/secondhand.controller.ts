import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { uploadToCloudinary } from '../../middleware/upload';
import {
  getSecondhandRecords,
  getSecondhandById,
  createSecondhandRecord,
  updateSecondhandRecord,
} from './secondhand.service';

function getQueryValue(value: unknown): string | undefined { // CHANGED
  if (typeof value === 'string') return value; // CHANGED
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]; // CHANGED
  return undefined; // CHANGED
} // CHANGED

function getParamValue(value: unknown): string { // CHANGED
  if (typeof value === 'string' && value.trim()) return value; // CHANGED
  throw new Error('Valid id is required'); // CHANGED
} // CHANGED

export async function list(req: AuthRequest, res: Response) {
  try {
    const isSold = getQueryValue(req.query.isSold); // CHANGED
    const filter =
      isSold === 'true' ? true :
      isSold === 'false' ? false : undefined;
    const records = await getSecondhandRecords(req.user!.shopId, filter);
    return ok(res, records);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id); // CHANGED
    const record = await getSecondhandById(req.user!.shopId, id); // CHANGED
    return ok(res, record);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const {
      mobileName, brand, category, imei,
      sellerName, sellerCnic, sellerPhone,
      purchasePrice, notes,
      storage, color, ram,
      paymentMethod, cashAmount, accountId, accountAmount,
    } = req.body;

    if (!mobileName) return fail(res, 'mobileName is required');
    if (!brand) return fail(res, 'brand is required');
    if (!sellerName) return fail(res, 'sellerName is required');
    if (!sellerCnic) return fail(res, 'sellerCnic is required');
    if (!sellerPhone) return fail(res, 'sellerPhone is required');
    if (!purchasePrice) return fail(res, 'purchasePrice is required');

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;

    let sellerPhotoUrl: string | undefined;
    let cnicPhotoUrl: string | undefined;

    if (files?.sellerPhoto?.[0]) {
      sellerPhotoUrl = await uploadToCloudinary(
        files.sellerPhoto[0].buffer,
        'sellers',
        `seller_${Date.now()}`
      );
    }

    if (files?.cnicPhoto?.[0]) {
      cnicPhotoUrl = await uploadToCloudinary(
        files.cnicPhoto[0].buffer,
        'cnics',
        `cnic_${Date.now()}`
      );
    }

    const io = req.app.get('io');

    const record = await createSecondhandRecord(
      req.user!.shopId,
      {
        mobileName,
        brand,
        category: category ?? undefined,
        imei: imei ?? undefined,
        sellerName,
        sellerCnic,
        sellerPhone,
        purchasePrice: Number(purchasePrice),
        notes: notes ?? undefined,
        sellerPhotoUrl,
        cnicPhotoUrl,
        storage: storage ?? undefined,
        color:   color   ?? undefined,
        ram:     ram     ?? undefined,
        paymentMethod,
        cashAmount:    cashAmount    !== undefined ? Number(cashAmount)    : undefined,
        accountId,
        accountAmount: accountAmount !== undefined ? Number(accountAmount) : undefined,
      },
      io
    );

    return ok(res, record);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id); // CHANGED
    const { notes, salePrice } = req.body;
    const record = await updateSecondhandRecord(req.user!.shopId, id, { // CHANGED
      notes,
      salePrice: salePrice ? Number(salePrice) : undefined,
    });
    return ok(res, record);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
