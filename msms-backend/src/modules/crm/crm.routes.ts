import { Router } from 'express';
import { requirePermission } from '../../middleware/auth';
import {
  listCustomersHandler,
  createCustomerHandler,
  getCustomerProfileHandler,
  updateCustomerHandler,
  deleteCustomerHandler,
  addInteractionHandler,
  updateInteractionHandler,
  deleteInteractionHandler,
  listFollowUpsHandler,
} from './crm.controller';

const router = Router();

// Readable by any PRO user (same pattern as branches.routes.ts) — New
// Sale's customer picker needs to list customers even for a team member
// who wasn't granted the manage_crm permission. Everything else about CRM
// (creating/editing customers, interactions, follow-ups) stays gated by
// manage_crm, applied below via router.use().
router.get('/customers',             listCustomersHandler);

router.use(requirePermission('manage_crm'));

router.get('/follow-ups',            listFollowUpsHandler);

router.post('/customers',            createCustomerHandler);
router.get('/customers/:id',         getCustomerProfileHandler);
router.patch('/customers/:id',       updateCustomerHandler);
router.delete('/customers/:id',      deleteCustomerHandler);
router.post('/customers/:id/interactions', addInteractionHandler);

router.patch('/interactions/:id',    updateInteractionHandler);
router.delete('/interactions/:id',   deleteInteractionHandler);

export default router;
