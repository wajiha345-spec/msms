import { Router } from 'express';
import { verify } from './imei-verify.controller';

const router = Router();

router.get('/:imei', verify);   // GET /api/imei-verify/:imei

export default router;
