import { Router } from 'express';
import { list, getOne, create, markPaid } from './sales.controller';

const router = Router();

router.get('/',              list);
router.post('/',             create);
router.get('/:id',           getOne);
router.patch('/:id/mark-paid', markPaid);

export default router;