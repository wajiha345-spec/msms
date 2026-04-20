import { Router } from 'express';
import { summary } from './dashboard.controller';

const router = Router();

router.get('/summary', summary);

export default router;