import { Router } from 'express';
import {
  listSalesOrdersHandler,
  getSalesOrderHandler,
  createSalesOrderHandler,
  updateStatusHandler,
  cancelSalesOrderHandler,
  markDeliveredHandler,
} from './salesOrders.controller';

const router = Router();

router.get('/',              listSalesOrdersHandler);
router.post('/',             createSalesOrderHandler);
router.get('/:id',           getSalesOrderHandler);
router.patch('/:id/status',  updateStatusHandler);
router.post('/:id/cancel',   cancelSalesOrderHandler);
router.post('/:id/deliver',  markDeliveredHandler);

export default router;
