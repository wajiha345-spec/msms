import { Router } from 'express';
import { startTrial } from './trial.controller';

const router = Router();

router.post('/start', startTrial);

export default router;
