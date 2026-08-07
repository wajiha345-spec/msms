import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { exportShopData } from './backup.service';

export async function exportHandler(req: AuthRequest, res: Response) {
  try {
    const payload = await exportShopData(req.user!.shopId);
    return ok(res, payload);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
