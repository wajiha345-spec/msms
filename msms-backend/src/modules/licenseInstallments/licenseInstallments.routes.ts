import { Router } from 'express';
import { upload } from '../../middleware/upload';
import { start, status, submit, publicSubmit } from './licenseInstallments.controller';

const router = Router();

// Mounted with only `authenticate` in app.ts (deliberately no checkTrialExpiry
// — a locked-out shop must still be able to pay, same carve-out reasoning as
// /api/setup/upgrade).
//
// Note: payment SUBMISSION from the app (`start`/`submit`) is legacy at this
// point — the app no longer has any UI that calls them (installment payments
// now happen on the website, see the public router below). Left in place
// since they're harmless and `/status` (still used for the app's lock
// detection) lives in this same router.
router.get('/status', status);
router.post('/start', upload.single('screenshot'), start);
router.post('/:number/submit', upload.single('screenshot'), submit);

export default router;

// ── Public (no session — the website has no login) ─────────────────────────
// Mounted separately in app.ts, BEFORE the authenticated router above, at
// `/api/license-installments/public` so it's reachable without `authenticate`
// (same pattern as /api/orders — the website's existing full-payment form).
export const publicRouter = Router();
publicRouter.post('/submit', upload.single('screenshot'), publicSubmit);
