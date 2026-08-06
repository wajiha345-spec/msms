import { prisma } from '../../config/db';
import { postJournalEntry } from '../accounting/accounting.service';

const DEFAULT_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Transport', 'Miscellaneous'];

export async function ensureDefaultCategories(shopId: string) {
  const count = await prisma.expenseCategory.count({ where: { shopId } });
  if (count > 0) return;
  await prisma.expenseCategory.createMany({
    data: DEFAULT_CATEGORIES.map((name) => ({ shopId, name, isSystem: true })),
  });
}

export async function listCategories(shopId: string) {
  await ensureDefaultCategories(shopId);
  return prisma.expenseCategory.findMany({
    where:   { shopId },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(shopId: string, name: string) {
  if (!name?.trim()) throw new Error('Category name is required');
  const existing = await prisma.expenseCategory.findFirst({ where: { shopId, name: name.trim() } });
  if (existing) throw new Error('A category with this name already exists');
  return prisma.expenseCategory.create({ data: { shopId, name: name.trim() } });
}

const EXPENSE_INCLUDE = {
  category:        { select: { id: true, name: true } },
  expenseAccount:  { select: { id: true, code: true, name: true } },
  paidFromAccount: { select: { id: true, code: true, name: true } },
  recordedBy:      { select: { username: true } },
} as const;

export async function listExpenses(
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

  return prisma.expense.findMany({
    where,
    include: EXPENSE_INCLUDE,
    orderBy: { date: 'desc' },
  });
}

export async function getExpenseById(shopId: string, id: string) {
  const expense = await prisma.expense.findFirst({
    where:   { id, shopId },
    include: EXPENSE_INCLUDE,
  });
  if (!expense) throw new Error('Expense not found');
  return expense;
}

interface CreateExpenseInput {
  categoryId:        string;
  expenseAccountId:  string;
  paidFromAccountId: string;
  amount:            number;
  date?:             string | Date;
  description?:      string;
  billPhotoUrl?:     string;
  userId:            string;
}

export async function createExpense(shopId: string, data: CreateExpenseInput) {
  if (!data.categoryId) throw new Error('categoryId is required');
  if (!data.expenseAccountId) throw new Error('expenseAccountId is required');
  if (!data.paidFromAccountId) throw new Error('paidFromAccountId is required');
  if (!data.amount || data.amount <= 0) throw new Error('amount must be greater than 0');

  const [category, expenseAccount, paidFromAccount] = await Promise.all([
    prisma.expenseCategory.findFirst({ where: { id: data.categoryId, shopId } }),
    prisma.account.findFirst({ where: { id: data.expenseAccountId, shopId } }),
    prisma.account.findFirst({ where: { id: data.paidFromAccountId, shopId } }),
  ]);
  if (!category) throw new Error('Category not found');
  if (!expenseAccount || expenseAccount.type !== 'EXPENSE') {
    throw new Error('expenseAccountId must reference an EXPENSE account');
  }
  if (!paidFromAccount || paidFromAccount.type !== 'ASSET') {
    throw new Error('paidFromAccountId must reference an ASSET account (e.g. Cash or Bank)');
  }

  const date = data.date ? new Date(data.date) : new Date();

  // Create the Expense row first (no journalEntryId yet), then post the
  // matching journal entry referencing it, then link the two — same
  // two-step pattern as any record that needs a self-referencing id before
  // it exists to hand to postJournalEntry().
  const expense = await prisma.expense.create({
    data: {
      shopId,
      categoryId:        data.categoryId,
      expenseAccountId:  data.expenseAccountId,
      paidFromAccountId: data.paidFromAccountId,
      amount:            data.amount,
      date,
      description:       data.description,
      billPhotoUrl:       data.billPhotoUrl,
      userId:            data.userId,
    },
  });

  const entry = await postJournalEntry(shopId, data.userId, {
    date,
    memo:         `Expense: ${category.name}${data.description ? ' — ' + data.description : ''}`,
    sourceModule: 'EXPENSE',
    sourceId:     expense.id,
    lines: [
      { accountId: data.expenseAccountId,  debit:  data.amount, description: data.description },
      { accountId: data.paidFromAccountId, credit: data.amount },
    ],
  });

  return prisma.expense.update({
    where:   { id: expense.id },
    data:    { journalEntryId: entry.id },
    include: EXPENSE_INCLUDE,
  });
}

export async function getExpenseSummary(
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
    prisma.expenseCategory.findMany({ where: { shopId } }),
    prisma.expense.groupBy({ by: ['categoryId'], where, _sum: { amount: true } }),
  ]);

  const sumsByCategory = new Map(grouped.map((g) => [g.categoryId, g._sum.amount ?? 0]));
  const byCategory = categories
    .map((c) => ({ categoryId: c.id, categoryName: c.name, total: sumsByCategory.get(c.id) ?? 0 }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = byCategory.reduce((sum, row) => sum + row.total, 0);

  return { byCategory, grandTotal };
}
