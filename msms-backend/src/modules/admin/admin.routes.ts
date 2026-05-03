import { Router } from 'express';
import {
  requireAdminSecret,
  listOrders,
  approveOrder,
  resendLicense,
  cancelOrder,
} from './admin.controller';

const router = Router();

router.use(requireAdminSecret as any);

router.get('/orders',                       listOrders);
router.get('/orders/:id/approve',           approveOrder);   // GET so email link works
router.post('/orders/:id/approve',          approveOrder);
router.get('/orders/:id/resend-license',    resendLicense);  // GET so browser link works
router.post('/orders/:id/resend-license',   resendLicense);
router.post('/orders/:id/cancel',           cancelOrder);

export default router;
