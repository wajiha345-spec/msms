import { Router } from 'express';
import { getSalesSummaryHandler } from './reports.controller';

const router = Router();

router.get('/sales-summary', getSalesSummaryHandler);

export default router;
