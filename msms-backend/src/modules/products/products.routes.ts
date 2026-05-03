import { Router } from 'express';
import { list, getOne, scanProduct, create, update, remove, importProducts } from './products.controller';
import { requirePlan } from '../../middleware/auth';

const router = Router();

router.get('/',           list);
router.post('/',          create);
router.get('/scan/:code', scanProduct);                    // before /:id to avoid conflict
router.post('/import',    requirePlan('PRO'), importProducts); // PRO only — bulk import before /:id
router.get('/:id',        getOne);
router.put('/:id',        update);
router.delete('/:id',     remove);

export default router;