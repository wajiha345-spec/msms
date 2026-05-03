import { Router } from 'express';
import { placeOrder } from './orders.controller';
import { upload } from '../../middleware/upload';

const router = Router();

router.post('/', upload.single('screenshot'), placeOrder);

export default router;
