import { Router } from 'express';
import { login, forgotPassword, resetPasswordHandler } from './auth.controller';
import { loginLimiter } from '../../middleware/rateLimit';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetPasswordHandler);

export default router;