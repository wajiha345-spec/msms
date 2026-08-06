import { Router } from 'express';
import {
  listCategoriesHandler,
  createCategoryHandler,
  list,
  getOne,
  create,
  getSummary,
} from './income.controller';

const router = Router();

router.get('/categories',  listCategoriesHandler);
router.post('/categories', createCategoryHandler);

router.get('/reports/summary', getSummary);

router.get('/',    list);
router.post('/',   create);
router.get('/:id', getOne);

export default router;
