import { Router } from 'express';
import { search } from './imei.controller';

const router = Router();

router.get('/search', search);

export default router;