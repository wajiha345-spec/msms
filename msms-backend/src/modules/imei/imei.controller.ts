import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { searchByImei } from './imei.service';

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export async function search(req: AuthRequest, res: Response) {
  try {
    const q = getQueryValue(req.query.q);

    if (!q) return fail(res, 'Query parameter "q" is required');

    const results = await searchByImei(q);
    return ok(res, results);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
