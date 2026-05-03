import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { verifyImei, isValidImei } from './imei-verify.service';

// GET /api/imei-verify/:imei
export async function verify(req: AuthRequest, res: Response) {
  try {
    const imei = (req.params.imei as string)?.trim().replace(/\s/g, '');
    if (!imei) return fail(res, 'IMEI is required', 400);
    if (!/^\d{14,16}$/.test(imei)) return fail(res, 'IMEI must be 15 digits', 400);

    const result = await verifyImei(imei);
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
