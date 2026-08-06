import { prisma } from '../../config/db';
import { updateProduct } from '../products/products.service';

// Lazily seeds a shop's Main Branch the first time any branch-aware
// endpoint is hit — same pattern as accounting.service.ts:ensureDefaultAccounts.
// No historical Product/Sale/Purchase row is ever touched; NULL branchId
// on those rows is treated as "the Main Branch" by getBranchReport below.
export async function ensureMainBranch(shopId: string) {
  const count = await prisma.branch.count({ where: { shopId } });
  if (count > 0) return;
  await prisma.branch.create({ data: { shopId, name: 'Main Branch', isMain: true } });
}

export async function listBranches(shopId: string) {
  await ensureMainBranch(shopId);
  return prisma.branch.findMany({
    where:   { shopId },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function createBranch(shopId: string, data: { name: string; address?: string }) {
  if (!data.name?.trim()) throw new Error('Branch name is required');
  await ensureMainBranch(shopId);
  return prisma.branch.create({
    data: { shopId, name: data.name.trim(), address: data.address?.trim() || null },
  });
}

export async function renameBranch(shopId: string, id: string, name: string) {
  if (!name?.trim()) throw new Error('Branch name is required');
  const branch = await prisma.branch.findFirst({ where: { id, shopId } });
  if (!branch) throw new Error('Branch not found');
  return prisma.branch.update({ where: { id }, data: { name: name.trim() } });
}

export async function deactivateBranch(shopId: string, id: string) {
  const branch = await prisma.branch.findFirst({ where: { id, shopId } });
  if (!branch) throw new Error('Branch not found');
  if (branch.isMain) throw new Error('The Main Branch cannot be deactivated');
  return prisma.branch.update({ where: { id }, data: { isActive: false } });
}

export async function getBranchReport(shopId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({ where: { id: branchId, shopId } });
  if (!branch) throw new Error('Branch not found');

  // NULL-means-Main-Branch: everything created before Multi-Branch existed
  // (or created without explicitly picking a branch) is implicitly the
  // Main Branch's data, without ever writing to those rows.
  const branchFilter: any = branch.isMain
    ? { OR: [{ branchId }, { branchId: null }] }
    : { branchId };

  const [sales, purchases, stockAgg] = await Promise.all([
    prisma.sale.findMany({
      where:  { shopId, ...branchFilter },
      select: { totalAmount: true, profit: true },
    }),
    prisma.purchase.findMany({
      where:  { shopId, ...branchFilter },
      select: { purchasePrice: true, quantity: true },
    }),
    prisma.product.aggregate({
      where: { shopId, isDeleted: false, ...branchFilter },
      _sum:   { stock: true },
      _count: true,
    }),
  ]);

  const totalRevenue      = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit       = sales.reduce((sum, s) => sum + s.profit, 0);
  const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0);

  return {
    branch: { id: branch.id, name: branch.name, isMain: branch.isMain },
    salesCount:      sales.length,
    totalRevenue,
    totalProfit,
    purchasesCount:  purchases.length,
    totalPurchaseCost,
    productCount:    stockAgg._count,
    totalStock:      stockAgg._sum.stock ?? 0,
  };
}

export async function listProductsForAssignment(shopId: string) {
  return prisma.product.findMany({
    where:   { shopId, isDeleted: false },
    select:  {
      id: true, name: true, brand: true, stock: true,
      branch: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
}

// Reuses the existing, unchanged products.service.ts:updateProduct — it
// already supports partial updates, so passing just { branchId } works
// with zero changes needed there. branchId always points at a real Branch
// row (including the Main Branch itself, which is a normal selectable
// branch) — there's no "unassign to null" case going forward.
export async function assignProductToBranch(shopId: string, productId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({ where: { id: branchId, shopId } });
  if (!branch) throw new Error('Branch not found');
  return updateProduct(shopId, productId, { branchId });
}
