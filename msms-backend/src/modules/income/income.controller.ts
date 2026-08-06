import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listCategories,
  createCategory,
  listIncomes,
  getIncomeById,
  createIncome,
  getIncomeSummary,
} from './income.service';

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function listCategoriesHandler(req: AuthRequest, res: Response) {
  try {
    const categories = await listCategories(req.user!.shopId);
    return ok(res, categories);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createCategoryHandler(req: AuthRequest, res: Response) {
  try {
    const { name } = req.body;
    const category = await createCategory(req.user!.shopId, name);
    return ok(res, category);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const dateFrom   = getQueryValue(req.query.dateFrom);
    const dateTo     = getQueryValue(req.query.dateTo);
    const categoryId = getQueryValue(req.query.categoryId);
    const incomes = await listIncomes(req.user!.shopId, { dateFrom, dateTo, categoryId });
    return ok(res, incomes);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const income = await getIncomeById(req.user!.shopId, id);
    return ok(res, income);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const { categoryId, incomeAccountId, receivedIntoAccountId, amount, date, description } = req.body;

    if (!categoryId)             return fail(res, 'categoryId is required');
    if (!incomeAccountId)        return fail(res, 'incomeAccountId is required');
    if (!receivedIntoAccountId)  return fail(res, 'receivedIntoAccountId is required');
    if (!amount)                  return fail(res, 'amount is required');

    const income = await createIncome(req.user!.shopId, {
      categoryId,
      incomeAccountId,
      receivedIntoAccountId,
      amount: Number(amount),
      date,
      description,
      userId: req.user!.userId,
    });

    return ok(res, income);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getSummary(req: AuthRequest, res: Response) {
  try {
    const dateFrom = getQueryValue(req.query.dateFrom);
    const dateTo   = getQueryValue(req.query.dateTo);
    const summary = await getIncomeSummary(req.user!.shopId, { dateFrom, dateTo });
    return ok(res, summary);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
