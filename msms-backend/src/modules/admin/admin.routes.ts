import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticateAdmin';
import {
  listOrders,
  approveOrder,
  rejectOrder,
  resendLicense,
  cancelOrder,
  listLicenseInstallments,
  approveLicenseInstallment,
  rejectLicenseInstallment,
  listShops,
  suspendShop,
  reactivateShop,
  resetDevice,
  getDashboardStats,
} from './admin.controller';

const router = Router();

// Every route below requires a real authenticated admin session — replaces
// the old shared ADMIN_SECRET-in-URL scheme entirely. No route here is
// reachable by a shop-user JWT (authenticateAdmin only accepts tokens signed
// with ADMIN_JWT_SECRET, a different secret from shop-user JWT_SECRET).
router.use(authenticateAdmin as any);

router.get('/dashboard', getDashboardStats);

router.get('/orders',                     listOrders);
router.post('/orders/:id/approve',        approveOrder);
router.post('/orders/:id/reject',         rejectOrder);
router.post('/orders/:id/resend-license', resendLicense);
router.post('/orders/:id/cancel',         cancelOrder);

router.get('/license-installments',                  listLicenseInstallments);
router.post('/license-installments/:id/approve',     approveLicenseInstallment);
router.post('/license-installments/:id/reject',      rejectLicenseInstallment);

router.get('/shops',                     listShops);
router.post('/shops/:id/suspend',        suspendShop);
router.post('/shops/:id/reactivate',     reactivateShop);

router.post('/license-keys/:key/reset-device', resetDevice);

export default router;
