import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ok, fail } from '../../utils/response';
import { prisma } from '../../config/db';

const TRIAL_DURATION_MS = 48 * 60 * 60 * 1000;

// POST /api/trial/start
// Lets a brand-new customer create a real Shop + admin User with no license
// key at all, unlocked for 48 hours with full PRO access. If they pay before
// or after it expires, POST /api/setup/upgrade converts this SAME shop to a
// paid plan in place — trial data is never touched or migrated.
export async function startTrial(req: Request, res: Response) {
  try {
    const { shopName, username, password, email } = req.body;

    if (!shopName || !username || !password || !email) {
      return fail(res, 'shopName, username, password, and email are all required');
    }

    if (username.trim().length < 3) return fail(res, 'Username must be at least 3 characters');
    if (password.length < 6)        return fail(res, 'Password must be at least 6 characters');
    if (shopName.trim().length < 2) return fail(res, 'Shop name must be at least 2 characters');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail(res, 'Please enter a valid email address');

    const exists = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (exists) return fail(res, 'That username is already taken. Please choose another.');

    const passwordHash = await bcrypt.hash(password, 10);
    const trialEndsAt  = new Date(Date.now() + TRIAL_DURATION_MS);

    const [shop, user] = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: { name: shopName.trim(), plan: 'TRIAL', trialEndsAt },
      });
      const user = await tx.user.create({
        data: {
          username:     username.trim(),
          passwordHash,
          shopId:       shop.id,
          role:         'admin',
          email:        email.trim(),
        },
      });
      return [shop, user];
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, plan: shop.plan, shopId: shop.id, trialEndsAt: shop.trialEndsAt!.toISOString() },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return ok(res, {
      token,
      user: {
        id:          user.id,
        username:    user.username,
        shopName:    shop.name,
        plan:        shop.plan,
        role:        user.role,
        trialEndsAt: shop.trialEndsAt,
      },
    });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
