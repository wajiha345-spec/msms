import { Router } from 'express';
import { validateKey } from './licenses.controller';

const router = Router();

router.get('/validate/:key', validateKey);

export default router;
