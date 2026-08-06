import { Router } from 'express';
import {
  listPurchaseOrdersHandler,
  getPurchaseOrderHandler,
  createPurchaseOrderHandler,
  cancelPurchaseOrderHandler,
  receiveGoodsHandler,
} from './purchaseOrders.controller';

const router = Router();

router.get('/',              listPurchaseOrdersHandler);
router.post('/',             createPurchaseOrderHandler);
router.get('/:id',           getPurchaseOrderHandler);
router.post('/:id/cancel',   cancelPurchaseOrderHandler);
router.post('/:id/receive',  receiveGoodsHandler);

export default router;
