import { Response } from 'express';

export function ok(res: Response, data: any) {
  return res.json({ success: true, data });
}

export function fail(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}