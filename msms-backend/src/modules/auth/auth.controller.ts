import { Request, Response } from 'express';
import { loginUser, requestPasswordReset, resetPassword } from './auth.service';
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

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { username } = req.body;
    if (!username) return fail(res, 'Username required');

    const result = await requestPasswordReset(username.trim());

    // Same generic message either way — never reveal whether the username exists.
    return ok(res, {
      message: 'If that account has an email on file, we sent a reset code to it.',
      maskedEmail: result.sent ? result.maskedEmail : undefined,
    });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { username, otp, newPassword } = req.body;
    if (!username || !otp || !newPassword) {
      return fail(res, 'username, otp, and newPassword are all required');
    }
    if (newPassword.length < 6) return fail(res, 'Password must be at least 6 characters');

    await resetPassword(username.trim(), otp.trim(), newPassword);
    return ok(res, { message: 'Password reset successfully. You can now log in.' });
  } catch (e: any) {
    return fail(res, e.message, 400);
  }
}
