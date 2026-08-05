import { Router } from 'express';
import { login, forgotPassword, resetPasswordHandler } from './auth.controller';

const router = Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordHandler);

export default router;