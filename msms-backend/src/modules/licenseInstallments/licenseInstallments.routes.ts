import { Router } from 'express';
import { upload } from '../../middleware/upload';
import { start, status, submit } from './licenseInstallments.controller';

const router = Router();

// Mounted with only `authenticate` in app.ts (deliberately no checkTrialExpiry
// — a locked-out shop must still be able to pay, same carve-out reasoning as
// /api/setup/upgrade).
router.get('/status', status);
router.post('/start', upload.single('screenshot'), start);
router.post('/:number/submit', upload.single('screenshot'), submit);

export default router;
