import { Router } from 'express';
import { list, getOne, create } from './sales.controller';

const router = Router();

router.get('/',    list);
router.post('/',   create);
router.get('/:id', getOne);

export default router;