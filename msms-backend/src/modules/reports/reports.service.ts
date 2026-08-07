import { prisma } from '../../config/db';

// ── Reports: Sales & Profit Summary ─────────────────────────────────────────
// Read-only aggregation over the existing Sale/Purchase tables for an
// arbitrary date range — the one report that didn't already exist anywhere
// (Dashboard only ever shows "today"). Written fresh with direct Prisma
// queries, the same style as dashboard.service.ts and
// branches.service.ts:getBranchReport — no other module's code changes.
export async function getSalesProfitSummary(shopId: string, from?: Date, to?: Date) {
  const end   = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const rangeFilter = { createdAt: { gte: start, lte: end } };

  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId, ...rangeFilter },
      select: {
        totalAmount: true, profit: true, quantity: true, createdAt: true,
        productId: true, product: { select: { name: true, brand: true } },
      },
    }),
    prisma.purchase.findMany({
      where: { shopId, ...rangeFilter },
      select: { purchasePrice: true, quantity: true, createdAt: true },
    }),
  ]);

  const revenue  = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const profit   = sales.reduce((sum, s) => sum + s.profit, 0);
  const unitsSold = sales.reduce((sum, s) => sum + s.quantity, 0);
  const cost      = purchases.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0);
  const unitsPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);

  const byDayMap = new Map<string, { date: string; revenue: number; profit: number; cost: number }>();
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  for (const s of sales) {
    const key = dayKey(s.createdAt);
    const row = byDayMap.get(key) ?? { date: key, revenue: 0, profit: 0, cost: 0 };
    row.revenue += s.totalAmount;
    row.profit  += s.profit;
    byDayMap.set(key, row);
  }
  for (const p of purchases) {
    const key = dayKey(p.createdAt);
    const row = byDayMap.get(key) ?? { date: key, revenue: 0, profit: 0, cost: 0 };
    row.cost += p.purchasePrice * p.quantity;
    byDayMap.set(key, row);
  }

  const byDay = [...byDayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const byProductMap = new Map<string, { productId: string; name: string; brand: string; unitsSold: number; revenue: number; profit: number }>();
  for (const s of sales) {
    const row = byProductMap.get(s.productId) ?? {
      productId: s.productId, name: s.product.name, brand: s.product.brand,
      unitsSold: 0, revenue: 0, profit: 0,
    };
    row.unitsSold += s.quantity;
    row.revenue   += s.totalAmount;
    row.profit    += s.profit;
    byProductMap.set(s.productId, row);
  }

  const topProducts = [...byProductMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    from: start.toISOString(),
    to:   end.toISOString(),
    totals: {
      salesCount: sales.length, revenue, profit, unitsSold,
      purchasesCount: purchases.length, cost, unitsPurchased,
    },
    byDay,
    topProducts,
  };
}
