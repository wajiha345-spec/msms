import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { getDashboardSummary } from './dashboard.service';

export async function summary(req: AuthRequest, res: Response) {
  try {
    const data = await getDashboardSummary();
    return ok(res, data);
  } catch (e: any) {
    return fail(res, e.message);
  }
}