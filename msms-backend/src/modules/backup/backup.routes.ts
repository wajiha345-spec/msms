import { Router } from 'express';
import { exportHandler } from './backup.controller';

const router = Router();

router.get('/export', exportHandler);

export default router;
