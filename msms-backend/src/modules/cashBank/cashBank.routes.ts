import { Router } from 'express';
import {
  listAccountsHandler,
  createDepositHandler,
  createWithdrawalHandler,
  createTransferHandler,
  listTransactionsHandler,
  createReconciliationHandler,
  listReconciliationsHandler,
} from './cashBank.controller';

const router = Router();

router.get('/accounts',        listAccountsHandler);
router.post('/deposits',       createDepositHandler);
router.post('/withdrawals',    createWithdrawalHandler);
router.post('/transfers',      createTransferHandler);
router.get('/transactions',    listTransactionsHandler);
router.post('/reconciliations', createReconciliationHandler);
router.get('/reconciliations',  listReconciliationsHandler);

export default router;
