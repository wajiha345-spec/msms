import { prisma } from '../../config/db';
import { postJournalEntry } from '../accounting/accounting.service';

const DEFAULT_CATEGORIES = ['Service Income', 'Rental Income', 'Other Income'];

export async function ensureDefaultCategories(shopId: string) {
  const count = await prisma.incomeCategory.count({ where: { shopId } });
  if (count > 0) return;
  await prisma.incomeCategory.createMany({
    data: DEFAULT_CATEGORIES.map((name) => ({ shopId, name, isSystem: true })),
  });
}

export async function listCategories(shopId: string) {
  await ensureDefaultCategories(shopId);
  return prisma.incomeCategory.findMany({
    where:   { shopId },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(shopId: string, name: string) {
  if (!name?.trim()) throw new Error('Category name is required');
  const existing = await prisma.incomeCategory.findFirst({ where: { shopId, name: name.trim() } });
  if (existing) throw new Error('A category with this name already exists');
  return prisma.incomeCategory.create({ data: { shopId, name: name.trim() } });
}

const INCOME_INCLUDE = {
  category:            { select: { id: true, name: true } },
  incomeAccount:        { select: { id: true, code: true, name: true } },
  receivedIntoAccount:  { select: { id: true, code: true, name: true } },
  recordedBy:           { select: { username: true } },
} as const;

export async function listIncomes(
  shopId: string,
  filters: { dateFrom?: string; dateTo?: string; categoryId?: string } = {}
) {
  const where: any = { shopId };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo)   where.date.lte = new Date(filters.dateTo);
  }

  return prisma.income.findMany({
    where,
    include: INCOME_INCLUDE,
    orderBy: { date: 'desc' },
  });
}

export async function getIncomeById(shopId: string, id: string) {
  const income = await prisma.income.findFirst({
    where:   { id, shopId },
    include: INCOME_INCLUDE,
  });
  if (!income) throw new Error('Income not found');
  return income;
}

interface CreateIncomeInput {
  categoryId:            string;
  incomeAccountId:       string;
  receivedIntoAccountId: string;
  amount:                number;
  date?:                 string | Date;
  description?:          string;
  userId:                string;
}

export async function createIncome(shopId: string, data: CreateIncomeInput) {
  if (!data.categoryId) throw new Error('categoryId is required');
  if (!data.incomeAccountId) throw new Error('incomeAccountId is required');
  if (!data.receivedIntoAccountId) throw new Error('receivedIntoAccountId is required');
  if (!data.amount || data.amount <= 0) throw new Error('amount must be greater than 0');

  const [category, incomeAccount, receivedIntoAccount] = await Promise.all([
    prisma.incomeCategory.findFirst({ where: { id: data.categoryId, shopId } }),
    prisma.account.findFirst({ where: { id: data.incomeAccountId, shopId } }),
    prisma.account.findFirst({ where: { id: data.receivedIntoAccountId, shopId } }),
  ]);
  if (!category) throw new Error('Category not found');
  if (!incomeAccount || incomeAccount.type !== 'INCOME') {
    throw new Error('incomeAccountId must reference an INCOME account');
  }
  if (!receivedIntoAccount || receivedIntoAccount.type !== 'ASSET') {
    throw new Error('receivedIntoAccountId must reference an ASSET account (e.g. Cash or Bank)');
  }

  const date = data.date ? new Date(data.date) : new Date();

  const income = await prisma.income.create({
    data: {
      shopId,
      categoryId:            data.categoryId,
      incomeAccountId:       data.incomeAccountId,
      receivedIntoAccountId: data.receivedIntoAccountId,
      amount:                data.amount,
      date,
      description:           data.description,
      userId:                data.userId,
    },
  });

  const entry = await postJournalEntry(shopId, data.userId, {
    date,
    memo:         `Income: ${category.name}${data.description ? ' — ' + data.description : ''}`,
    sourceModule: 'INCOME',
    sourceId:     income.id,
    lines: [
      { accountId: data.receivedIntoAccountId, debit:  data.amount },
      { accountId: data.incomeAccountId,       credit: data.amount, description: data.description },
    ],
  });

  return prisma.income.update({
    where:   { id: income.id },
    data:    { journalEntryId: entry.id },
    include: INCOME_INCLUDE,
  });
}

export async function getIncomeSummary(
  shopId: string,
  filters: { dateFrom?: string; dateTo?: string } = {}
) {
  const where: any = { shopId };
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo)   where.date.lte = new Date(filters.dateTo);
  }

  const [categories, grouped] = await Promise.all([
    prisma.incomeCategory.findMany({ where: { shopId } }),
    prisma.income.groupBy({ by: ['categoryId'], where, _sum: { amount: true } }),
  ]);

  const sumsByCategory = new Map(grouped.map((g) => [g.categoryId, g._sum.amount ?? 0]));
  const byCategory = categories
    .map((c) => ({ categoryId: c.id, categoryName: c.name, total: sumsByCategory.get(c.id) ?? 0 }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = byCategory.reduce((sum, row) => sum + row.total, 0);

  return { byCategory, grandTotal };
}
