import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; plan: string };
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
    ) as { userId: string; role: string; plan: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Middleware factory — gates a route to users whose JWT plan matches.
// Must be placed AFTER authenticate so req.user is populated.
// Usage:  router.use(authenticate, requirePlan('PRO'), handler)
export function requirePlan(requiredPlan: 'PRO') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (req.user.plan !== requiredPlan) {
      return res.status(403).json({
        success: false,
        error: `This feature requires the ${requiredPlan} plan. Please upgrade your license.`,
      });
    }
    next();
  };
}