import { Router } from 'express';
import {
  listAccountsHandler,
  createAccountHandler,
  updateAccountHandler,
  deleteAccountHandler,
  setOpeningBalanceHandler,
  listJournalEntriesHandler,
  getJournalEntryHandler,
  createJournalEntryHandler,
  getGeneralLedgerHandler,
  getTrialBalanceHandler,
  getBalanceSheetHandler,
  getProfitAndLossHandler,
  getCashFlowHandler,
  createClosingEntryHandler,
  listClosingEntriesHandler,
} from './accounting.controller';

const router = Router();

router.get('/accounts',                    listAccountsHandler);
router.post('/accounts',                   createAccountHandler);
router.patch('/accounts/:id',              updateAccountHandler);
router.delete('/accounts/:id',             deleteAccountHandler);
router.post('/accounts/:id/opening-balance', setOpeningBalanceHandler);

router.get('/journal-entries',       listJournalEntriesHandler);
router.post('/journal-entries',      createJournalEntryHandler);
router.get('/journal-entries/:id',   getJournalEntryHandler);

router.get('/ledger/:accountId',     getGeneralLedgerHandler);
router.get('/trial-balance',         getTrialBalanceHandler);

router.get('/balance-sheet',         getBalanceSheetHandler);
router.get('/profit-loss',           getProfitAndLossHandler);
router.get('/cash-flow',             getCashFlowHandler);
router.post('/closing-entries',      createClosingEntryHandler);
router.get('/closing-entries',       listClosingEntriesHandler);

export default router;
