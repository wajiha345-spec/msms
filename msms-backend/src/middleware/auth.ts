import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; plan: string; shopId: string; trialEndsAt: string | null };
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

// Blocks ALL access once a TRIAL shop's 48-hour window has passed.
// Must run AFTER authenticate. Deliberately NOT applied to the upgrade route,
// since that's the only action a shop with an expired trial is still allowed to take.
export function checkTrialExpiry(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.user.plan === 'TRIAL' && !isActiveTrial(req.user)) {
    return res.status(402).json({
      success: false,
      error: 'Your free trial has ended. Please purchase a license to continue.',
      trialExpired: true,
    });
  }
  next();
}

// Middleware factory — gates a route to users whose plan matches.
// An active (non-expired) trial counts as PRO, since trials unlock every PRO feature.
// Must be placed AFTER authenticate so req.user is populated.
// Usage:  router.use(authenticate, requirePlan('PRO'), handler)
export function requirePlan(requiredPlan: 'PRO') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const hasAccess = req.user.plan === requiredPlan || isActiveTrial(req.user);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: `This feature requires the ${requiredPlan} plan. Please upgrade your license.`,
      });
    }
    next();
  };
}