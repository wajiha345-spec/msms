import { Request, Response } from 'express';
import { loginUser } from './auth.service';
import { ok, fail } from '../../utils/response';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return fail(res, 'Username and password required');
    const result = await loginUser(username, password);
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message, 401);
  }
}
