import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { checkPermission } from '../modules/users/users.service';
import { getInstallmentGate } from '../modules/licenseInstallments/licenseInstallments.service';
import { computeLicenseStatus } from '../modules/licenseStatus/licenseStatus.service';
import { prisma } from '../config/db';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; plan: string; shopId: string; trialEndsAt: string | null };
  installmentGate?: Awaited<ReturnType<typeof getInstallmentGate>>;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET!
    ) as { userId: string; role: string; plan: string; shopId: string; trialEndsAt: string | null };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function isActiveTrial(user: { plan: string; trialEndsAt: string | null }) {
  return user.plan === 'TRIAL' && !!user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
}

// Blocks ALL access once a TRIAL shop's 5-day window has passed, and also
// once a license-installment payment has gone overdue. Must run AFTER
// authenticate. Deliberately NOT applied to the upgrade route or to
// /api/license-installments, since paying is the one thing a locked-out shop
// must still be able to do.
//
// Also handles a subtlety of the installment feature: a shop's first
// installment gets approved by an admin clicking an emailed link, not by a
// request from the shop's own session — so that shop's JWT keeps saying
// `plan: 'TRIAL'` (now expired) forever, since nothing ever re-issues it a
// fresh token. getInstallmentGate() checks live DB state so that shop isn't
// stuck locked out after having paid.
export async function checkTrialExpiry(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  let gate: Awaited<ReturnType<typeof getInstallmentGate>> = null;
  let suspended = false;
  try {
    const [gateResult, shop] = await Promise.all([
      getInstallmentGate(req.user.shopId),
      prisma.shop.findUnique({ where: { id: req.user.shopId }, select: { suspended: true } }),
    ]);
    gate = gateResult;
    suspended = shop?.suspended ?? false;
  } catch {
    gate = null; // fail open — a transient DB hiccup must never lock out every user
    suspended = false;
  }
  req.installmentGate = gate; // let requirePlan reuse this instead of querying again

  const status = computeLicenseStatus(
    { plan: req.user.plan, trialEndsAt: req.user.trialEndsAt, suspended },
    gate
  );

  if (status === 'SUSPENDED') {
    return res.status(403).json({
      success: false,
      error: 'This account has been suspended. Please contact support.',
      suspended: true,
    });
  }

  if (status === 'PENDING_FIRST_PAYMENT') {
    return res.status(402).json({
      success: false,
      error: 'Your free trial has ended. Please purchase a license to continue.',
      trialExpired: true,
    });
  }

  if (status === 'LOCKED') {
    const overdue = gate!.overdue!;
    return res.status(402).json({
      success: false,
      error: `Your installment payment of Rs ${overdue.amount.toLocaleString()} was due on ${overdue.dueDate?.toDateString()}. Please pay to continue using the app.`,
      installmentOverdue: true,
      installment: overdue,
    });
  }

  next();
}

// Middleware factory — gates a route to users whose plan matches.
// An active (non-expired) trial counts as PRO, since trials unlock every PRO feature.
// A shop that has paid its first license installment also counts as PRO, for
// the same stale-JWT reason documented on checkTrialExpiry above — reuses
// req.installmentGate if that already ran (every route mount pairs the two),
// falling back to its own DB check so this middleware stays correct standalone.
// Must be placed AFTER authenticate so req.user is populated.
// Usage:  router.use(authenticate, requirePlan('PRO'), handler)
export function requirePlan(requiredPlan: 'PRO') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (req.user.plan === requiredPlan || isActiveTrial(req.user)) {
      return next();
    }
    let gate = req.installmentGate;
    if (gate === undefined) {
      try {
        gate = await getInstallmentGate(req.user.shopId);
      } catch {
        gate = null;
      }
    }
    if (gate?.installment1Paid) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: `This feature requires the ${requiredPlan} plan. Please upgrade your license.`,
    });
  };
}

// Middleware factory — gates a route to a specific user role.
// Shop owners get role 'admin' at signup (see setup.controller.ts / trial.controller.ts);
// used to restrict sensitive Business Management routes (e.g. accounting) to the owner.
// Must be placed AFTER authenticate so req.user is populated.
export function requireRole(requiredRole: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        error: 'This feature is only available to shop owners.',
      });
    }
    next();
  };
}

// Middleware factory — gates a route to a specific configurable permission
// (see modules/users/users.service.ts for the fixed permission set and
// default matrix). The shop owner ('admin') always bypasses this, exactly
// like requireRole('admin') already does — so for every existing shop
// (which today has exactly one user, the admin), this is a no-op. Only a
// newly-created team member with a non-admin role is actually checked
// against their shop's configurable RolePermission grants. Also enforces
// that a deactivated user is blocked immediately, since this is the one
// place in the request path that already needs a DB round-trip.
// Must be placed AFTER authenticate so req.user is populated.
export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (req.user.role === 'admin') {
      return next();
    }
    try {
      const result = await checkPermission(req.user.shopId, req.user.userId, permission);
      if (!result.isActive) {
        return res.status(403).json({
          success: false,
          error: 'This account has been deactivated. Contact your shop owner.',
        });
      }
      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Your role does not have permission to access this feature.',
        });
      }
      next();
    } catch {
      return res.status(500).json({ success: false, error: 'Could not verify permissions' });
    }
  };
}