import { Router } from 'express';
import { setupShop, upgradeShop } from './setup.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/', setupShop);
router.post('/upgrade', authenticate, upgradeShop);

export default router;
