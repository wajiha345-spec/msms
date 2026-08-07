import { Router } from 'express';
import { requireRole } from '../../middleware/auth';
import { getLowStockHandler, setReorderPointHandler, transferStockHandler } from './inventory.controller';

const router = Router();

// Readable by any PRO user — same tier as Sales/Purchases, useful for staff
// too. Structural edits (reorder point, stock transfer) stay admin-only,
// applied below via router.use() — same split as branches.routes.ts.
router.get('/low-stock', getLowStockHandler);

router.use(requireRole('admin'));

router.patch('/products/:id/reorder-point', setReorderPointHandler);
router.post('/transfer',                    transferStockHandler);

export default router;
