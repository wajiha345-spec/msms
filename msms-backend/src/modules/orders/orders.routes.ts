import { Router } from 'express';
import { placeOrder } from './orders.controller';

const router = Router();

router.post('/', placeOrder);

export default router;
