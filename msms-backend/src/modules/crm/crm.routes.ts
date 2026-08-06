import { Router } from 'express';
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

router.get('/follow-ups',            listFollowUpsHandler);

router.get('/customers',             listCustomersHandler);
router.post('/customers',            createCustomerHandler);
router.get('/customers/:id',         getCustomerProfileHandler);
router.patch('/customers/:id',       updateCustomerHandler);
router.delete('/customers/:id',      deleteCustomerHandler);
router.post('/customers/:id/interactions', addInteractionHandler);

router.patch('/interactions/:id',    updateInteractionHandler);
router.delete('/interactions/:id',   deleteInteractionHandler);

export default router;
