import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ok, fail } from '../../utils/response';
import { prisma } from '../../config/db';
import { AuthRequest } from '../../middleware/auth';

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
    const license = await prisma.licenseKey.findUnique({
      where: { key: licenseKey },
      include: { order: { select: { customerEmail: true } } },
    });
    if (!license)           return fail(res, 'Invalid license key', 404);
    if (license.isActivated) return fail(res, 'This license key has already been used', 409);

    // Make sure username isn't taken
    const exists = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (exists) return fail(res, 'That username is already taken. Please choose another.');

    const passwordHash = await bcrypt.hash(password, 10);

    // Create the shop, its first admin user, and mark the license as activated atomically
    const [shop, user] = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: { name: shopName.trim(), plan: license.plan },
      });
      const user = await tx.user.create({
        data: {
          username:     username.trim(),
          passwordHash,
          shopId:       shop.id,
          role:         'admin', // shop owner gets admin role
          email:        license.order.customerEmail,
        },
      });
      await tx.licenseKey.update({
        where: { key: licenseKey },
        data:  { isActivated: true, activatedAt: new Date(), shopName: shopName.trim() },
      });
      return [shop, user];
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, plan: shop.plan, shopId: shop.id, trialEndsAt: null },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return ok(res, {
      token,
      user: {
        id:       user.id,
        username: user.username,
        shopName: shop.name,
        plan:     shop.plan,
        role:     user.role,
        trialEndsAt: null,
      },
    });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// POST /api/setup/upgrade (authenticated — works even when the trial has expired)
// Converts the caller's EXISTING shop from TRIAL to a paid plan in place, using a
// license key from a real order. Never creates a new shop, so all data the
// customer saved during the trial (products, sales, etc.) stays exactly as is.
export async function upgradeShop(req: AuthRequest, res: Response) {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) return fail(res, 'licenseKey is required');

    const license = await prisma.licenseKey.findUnique({ where: { key: licenseKey } });
    if (!license)            return fail(res, 'Invalid license key', 404);
    if (license.isActivated) return fail(res, 'This license key has already been used', 409);

    const user = await prisma.user.findUnique({
      where:   { id: req.user!.userId },
      include: { shop: true },
    });
    if (!user) return fail(res, 'Account not found', 404);

    const shop = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.update({
        where: { id: user.shopId },
        data:  { plan: license.plan, trialEndsAt: null },
      });
      await tx.licenseKey.update({
        where: { key: licenseKey },
        data:  { isActivated: true, activatedAt: new Date(), shopName: shop.name },
      });
      return shop;
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, plan: shop.plan, shopId: shop.id, trialEndsAt: null },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return ok(res, {
      token,
      user: {
        id:       user.id,
        username: user.username,
        shopName: shop.name,
        plan:     shop.plan,
        role:     user.role,
        trialEndsAt: null,
      },
    });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
