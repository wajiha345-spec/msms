import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { getSalesProfitSummary } from './reports.service';

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export async function getSalesSummaryHandler(req: AuthRequest, res: Response) {
  try {
    const fromStr = getQueryValue(req.query.from);
    const toStr   = getQueryValue(req.query.to);
    const from = fromStr ? new Date(fromStr) : undefined;
    const to   = toStr   ? new Date(toStr)   : undefined;

    const summary = await getSalesProfitSummary(req.user!.shopId, from, to);
    return ok(res, summary);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
