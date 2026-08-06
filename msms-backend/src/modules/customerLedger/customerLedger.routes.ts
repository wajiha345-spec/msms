import { Router } from 'express';
import {
  listCustomersHandler,
  getStatementHandler,
  getAgingHandler,
  recordPaymentHandler,
} from './customerLedger.controller';

const router = Router();

router.get('/customers',                 listCustomersHandler);
router.get('/customers/:phone/statement', getStatementHandler);
router.get('/aging',                     getAgingHandler);
router.post('/payments',                 recordPaymentHandler);

export default router;
