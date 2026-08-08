import { Router } from 'express';
import { list, getOne, create, listSuppliersHandler } from './purchases.controller';

const router = Router();

router.get('/',           list);
router.post('/',          create);
router.get('/suppliers',  listSuppliersHandler); // before /:id so it isn't captured as a param
router.get('/:id',        getOne);

export default router;