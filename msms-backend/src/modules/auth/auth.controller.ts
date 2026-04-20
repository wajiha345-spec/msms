import { Request, Response } from 'express';
import { loginUser, registerUser } from './auth.service';
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

export async function register(req: Request, res: Response) {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return fail(res, 'Username and password required');
    const result = await registerUser(username, password, role);
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message);
  }
}