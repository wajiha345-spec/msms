import { prisma } from '../../config/db';

// ── Data Backup ──────────────────────────────────────────────────────────────
// Pure read-only export — every table is queried exactly as it already
// exists, scoped by shopId, with no joins into other shops' data and no
// writes anywhere. Nothing about any existing module's behavior changes.
export async function exportShopData(shopId: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error('Shop not found');

  const [
    products, sales, purchases, secondhandRecords,
    expenseCategories, expenses, incomeCategories, income,
    accounts, journalEntries,
    customers, customerInteractions,
    quotations, purchaseOrders, salesOrders,
    branches, users,
  ] = await Promise.all([
    prisma.product.findMany({ where: { shopId } }),
    prisma.sale.findMany({ where: { shopId }, include: { guarantors: true } }),
    prisma.purchase.findMany({ where: { shopId } }),
    prisma.secondhandRecord.findMany({ where: { shopId } }),
    prisma.expenseCategory.findMany({ where: { shopId } }),
    prisma.expense.findMany({ where: { shopId } }),
    prisma.incomeCategory.findMany({ where: { shopId } }),
    prisma.income.findMany({ where: { shopId } }),
    prisma.account.findMany({ where: { shopId } }),
    prisma.journalEntry.findMany({ where: { shopId }, include: { lines: true } }),
    prisma.customer.findMany({ where: { shopId } }),
    prisma.customerInteraction.findMany({ where: { shopId } }),
    prisma.quotation.findMany({ where: { shopId }, include: { items: true } }),
    prisma.purchaseOrder.findMany({ where: { shopId }, include: { items: true } }),
    prisma.salesOrder.findMany({ where: { shopId }, include: { items: true } }),
    prisma.branch.findMany({ where: { shopId } }),
    prisma.user.findMany({
      where: { shopId },
      select: { id: true, username: true, role: true, email: true, isActive: true, createdAt: true },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    shop: { id: shop.id, name: shop.name, plan: shop.plan },
    counts: {
      products: products.length, sales: sales.length, purchases: purchases.length,
      secondhandRecords: secondhandRecords.length, expenses: expenses.length, income: income.length,
      customers: customers.length, quotations: quotations.length,
      purchaseOrders: purchaseOrders.length, salesOrders: salesOrders.length,
      branches: branches.length, users: users.length,
    },
    data: {
      products, sales, purchases, secondhandRecords,
      expenseCategories, expenses, incomeCategories, income,
      accounts, journalEntries,
      customers, customerInteractions,
      quotations, purchaseOrders, salesOrders,
      branches, users,
    },
  };
}
