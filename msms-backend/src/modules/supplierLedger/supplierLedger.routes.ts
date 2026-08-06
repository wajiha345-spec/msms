import { Router } from 'express';
import {
  listSuppliersHandler,
  getStatementHandler,
  getAgingHandler,
  recordPaymentHandler,
  createCreditPurchaseHandler,
} from './supplierLedger.controller';

const router = Router();

router.get('/suppliers',                  listSuppliersHandler);
router.get('/suppliers/:phone/statement', getStatementHandler);
router.get('/aging',                      getAgingHandler);
router.post('/payments',                  recordPaymentHandler);
router.post('/credit-purchases',          createCreditPurchaseHandler);

export default router;
