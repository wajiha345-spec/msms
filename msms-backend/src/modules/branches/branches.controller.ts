import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listBranches,
  createBranch,
  renameBranch,
  deactivateBranch,
  getBranchReport,
  listProductsForAssignment,
  assignProductToBranch,
} from './branches.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function listBranchesHandler(req: AuthRequest, res: Response) {
  try {
    const branches = await listBranches(req.user!.shopId);
    return ok(res, branches);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createBranchHandler(req: AuthRequest, res: Response) {
  try {
    const { name, address } = req.body;
    if (!name) return fail(res, 'name is required');
    const branch = await createBranch(req.user!.shopId, { name, address });
    return ok(res, branch);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function renameBranchHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { name } = req.body;
    if (!name) return fail(res, 'name is required');
    const branch = await renameBranch(req.user!.shopId, id, name);
    return ok(res, branch);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function deactivateBranchHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const branch = await deactivateBranch(req.user!.shopId, id);
    return ok(res, branch);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getBranchReportHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const report = await getBranchReport(req.user!.shopId, id);
    return ok(res, report);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function listProductsForAssignmentHandler(req: AuthRequest, res: Response) {
  try {
    const products = await listProductsForAssignment(req.user!.shopId);
    return ok(res, products);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function assignProductToBranchHandler(req: AuthRequest, res: Response) {
  try {
    const { productId, branchId } = req.body;
    if (!productId) return fail(res, 'productId is required');
    if (!branchId)  return fail(res, 'branchId is required');
    const product = await assignProductToBranch(req.user!.shopId, productId, branchId);
    return ok(res, product);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
