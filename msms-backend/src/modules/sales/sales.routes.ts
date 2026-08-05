import { Router } from 'express';
import { list, getOne, create, markPaid, importHistory } from './sales.controller';
import { requirePlan } from '../../middleware/auth';

const router = Router();

router.get('/',              list);
router.post('/',             create);
router.post('/import',       requirePlan('PRO'), importHistory); // PRO only — before /:id
router.get('/:id',           getOne);
router.patch('/:id/mark-paid', markPaid);

export default router;