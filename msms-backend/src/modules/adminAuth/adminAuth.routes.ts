import { Router } from 'express';
import { login } from './adminAuth.controller';
import { adminLoginLimiter } from '../../middleware/rateLimit';

const router = Router();

// Public — this IS the login route. Rate-limited to slow brute-force guessing.
router.post('/login', adminLoginLimiter, login);

export default router;
