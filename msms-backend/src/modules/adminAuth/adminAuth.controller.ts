import { Request, Response } from 'express';
import { ok, fail } from '../../utils/response';
import { loginAdmin } from './adminAuth.service';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return fail(res, 'Username and password are required');

    const result = await loginAdmin(username, password);
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message, 401);
  }
}
