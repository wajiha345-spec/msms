import { Router } from 'express';
import { setupShop } from './setup.controller';

const router = Router();

router.post('/', setupShop);

export default router;
