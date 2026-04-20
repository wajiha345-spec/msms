import { Router } from 'express';
import { upload } from '../../middleware/upload';
import { list, getOne, create, update } from './secondhand.controller';

const router = Router();

router.get('/',     list);
router.get('/:id',  getOne);
router.put('/:id',  update);

// Accept two image fields: sellerPhoto and cnicPhoto
router.post(
  '/',
  upload.fields([
    { name: 'sellerPhoto', maxCount: 1 },
    { name: 'cnicPhoto',   maxCount: 1 },
  ]),
  create
);

export default router;