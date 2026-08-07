import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { getSettings, updateSettings } from './settings.service';

export async function getSettingsHandler(req: AuthRequest, res: Response) {
  try {
    const settings = await getSettings(req.user!.shopId);
    return ok(res, settings);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function updateSettingsHandler(req: AuthRequest, res: Response) {
  try {
    const { lowStockThreshold, shopAddress, shopPhone, invoiceFooterNote } = req.body;
    const settings = await updateSettings(req.user!.shopId, {
      lowStockThreshold: lowStockThreshold != null ? Number(lowStockThreshold) : undefined,
      shopAddress,
      shopPhone,
      invoiceFooterNote,
    });
    return ok(res, settings);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
