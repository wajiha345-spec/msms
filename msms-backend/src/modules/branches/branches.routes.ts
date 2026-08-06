import { Router } from 'express';
import { requireRole } from '../../middleware/auth';
import {
  listBranchesHandler,
  createBranchHandler,
  renameBranchHandler,
  deactivateBranchHandler,
  getBranchReportHandler,
  listProductsForAssignmentHandler,
  assignProductToBranchHandler,
} from './branches.controller';

const router = Router();

// Readable by any PRO user (same tier as Sales/Purchases) — recording a
// branch-tagged sale/purchase needs to list branches to offer a picker,
// even for a non-admin team member. Everything else about Branch
// management (create/rename/deactivate/reports/reassignment) stays
// admin-only, applied below via router.use().
router.get('/', listBranchesHandler);

router.use(requireRole('admin'));

router.post('/',                 createBranchHandler);
router.patch('/:id/rename',      renameBranchHandler);
router.post('/:id/deactivate',   deactivateBranchHandler);
router.get('/:id/report',        getBranchReportHandler);

router.get('/products/all',      listProductsForAssignmentHandler);
router.post('/products/assign',  assignProductToBranchHandler);

export default router;
