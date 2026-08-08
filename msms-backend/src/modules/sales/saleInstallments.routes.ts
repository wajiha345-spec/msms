import { Router } from 'express';
import { list, markPaid } from './saleInstallments.controller';

const router = Router();

router.get('/',              list);
router.post('/:id/mark-paid', markPaid);

export default router;
