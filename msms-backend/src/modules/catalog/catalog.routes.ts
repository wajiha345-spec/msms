import { Router } from 'express';
import { list, lookup, contribute, remove } from './catalog.controller';

const router = Router();

router.get('/',         list);        // GET    /api/catalog  (management list)
router.get('/:barcode', lookup);      // GET    /api/catalog/:barcode
router.post('/',        contribute);  // POST   /api/catalog
router.delete('/:id',   remove);      // DELETE /api/catalog/:id

export default router;
