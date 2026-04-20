import { Router } from 'express';
import { getInvoice } from './invoices.controller';

const router = Router();

router.get('/:id', getInvoice);

export default router;