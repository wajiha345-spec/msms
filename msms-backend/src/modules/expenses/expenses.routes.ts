import { Router } from 'express';
import { upload } from '../../middleware/upload';
import {
  listCategoriesHandler,
  createCategoryHandler,
  list,
  getOne,
  create,
  getSummary,
} from './expenses.controller';

const router = Router();

router.get('/categories',  listCategoriesHandler);
router.post('/categories', createCategoryHandler);

router.get('/reports/summary', getSummary);

router.get('/',    list);
router.post('/',   upload.single('bill'), create);
router.get('/:id', getOne);

export default router;
