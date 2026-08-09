import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mirrors authenticate() in auth.ts but verifies against ADMIN_JWT_SECRET
// (a separate secret from shop-user JWT_SECRET) and attaches req.admin, a
// distinctly-shaped object — never req.user, so there's no accidental
// cross-use with shop-scoped requireRole/requirePermission. Replaces the
// old requireAdminSecret (a shared, non-constant-time-compared string in the
// query string) entirely.
export interface AdminRequest extends Request {
  admin?: { adminId: string; username: string };
}

export function authenticateAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.ADMIN_JWT_SECRET!) as {
      adminId: string;
      username: string;
    };
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
