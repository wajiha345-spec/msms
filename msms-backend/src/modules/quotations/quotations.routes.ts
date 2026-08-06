import { Router } from 'express';
import { authenticate, checkTrialExpiry, requirePlan, requirePermission } from '../../middleware/auth';
import {
  listQuotationsHandler,
  getQuotationHandler,
  createQuotationHandler,
  cancelQuotationHandler,
  convertQuotationHandler,
  getQuotationViewHandler,
} from './quotations.controller';

const router = Router();

// PUBLIC — id is the access token, same convention as /api/invoices/:id.
// Must be registered before the router.use(authenticate, ...) below so it
// isn't gated by it.
router.get('/:id/view', getQuotationViewHandler);

router.use(authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_quotations'));

router.get('/',             listQuotationsHandler);
router.post('/',            createQuotationHandler);
router.get('/:id',          getQuotationHandler);
router.post('/:id/cancel',  cancelQuotationHandler);
router.post('/:id/convert', convertQuotationHandler);

export default router;
