import { Router } from 'express';
import { placeOrder } from './orders.controller';
import { upload } from '../../middleware/upload';
import { publicSubmitLimiter } from '../../middleware/rateLimit';

const router = Router();

router.post('/', publicSubmitLimiter, upload.single('screenshot'), placeOrder);

export default router;
