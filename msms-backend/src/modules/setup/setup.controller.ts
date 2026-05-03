import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ok, fail } from '../../utils/response';
import { prisma } from '../../config/db';

// POST /api/setup
// Called once from the app when a new customer sets up their account.
// Validates the license key, creates the User, marks the key as activated.
export async function setupShop(req: Request, res: Response) {
  try {
    const { licenseKey, shopName, username, password } = req.body;

    if (!licenseKey || !shopName || !username || !password) {
      return fail(res, 'licenseKey, shopName, username, and password are all required');
    }

    if (username.trim().length < 3) return fail(res, 'Username must be at least 3 characters');
    if (password.length < 6)        return fail(res, 'Password must be at least 6 characters');
    if (shopName.trim().length < 2) return fail(res, 'Shop name must be at least 2 characters');

    // Validate the license key
    const license = await prisma.licenseKey.findUnique({ where: { key: licenseKey } });
    if (!license)           return fail(res, 'Invalid license key', 404);
    if (license.isActivated) return fail(res, 'This license key has already been used', 409);

    // Make sure username isn't taken
    const exists = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (exists) return fail(res, 'That username is already taken. Please choose another.');

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and mark license as activated atomically
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          username:     username.trim(),
          passwordHash,
          shopName:     shopName.trim(),
          plan:         license.plan,
          role:         'admin', // shop owner gets admin role
        },
      }),
      prisma.licenseKey.update({
        where: { key: licenseKey },
        data:  { isActivated: true, activatedAt: new Date(), shopName: shopName.trim() },
      }),
    ]);

    const token = jwt.sign(
      { userId: user.id, role: user.role, plan: user.plan },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return ok(res, {
      token,
      user: {
        id:       user.id,
        username: user.username,
        shopName: user.shopName,
        plan:     user.plan,
        role:     user.role,
      },
    });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
