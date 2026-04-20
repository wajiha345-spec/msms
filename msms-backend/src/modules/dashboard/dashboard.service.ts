import { prisma } from '../../config/db';

export async function getDashboardSummary() {
  // Get start and end of today
  const now        = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Run all queries in parallel — much faster than sequential awaits
  const [
    todaySales,
    todayPurchases,
    totalProducts,
    newStockCount,
    secondhandStockCount,
    recentSales,
  ] = await Promise.all([

    // Today's sales
    prisma.sale.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: {
        totalAmount: true,
        profit:      true,
        salePrice:   true,
        quantity:    true,
      },
    }),

    // Today's purchases
    prisma.purchase.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: { purchasePrice: true, quantity: true },
    }),

    // Total active products
    prisma.product.count({
      where: { isDeleted: false },
    }),

    // New phones in stock
    prisma.product.count({
      where: { isDeleted: false, isSecondhand: false, stock: { gt: 0 } },
    }),

    // Secondhand phones still available
    prisma.product.count({
      where: { isDeleted: false, isSecondhand: true, stock: { gt: 0 } },
    }),

    // Last 10 sales with product info
    prisma.sale.findMany({
      take:    10,
      orderBy: { createdAt: 'desc' },
      include: {
        product:    { select: { name: true, brand: true } },
        recordedBy: { select: { username: true } },
      },
    }),
  ]);

  // Calculate today's totals
  const todayRevenue  = todaySales.reduce((s, x) => s + x.totalAmount, 0);
  const todayProfit   = todaySales.reduce((s, x) => s + x.profit, 0);
  const todayCost     = todayPurchases.reduce(
    (s, x) => s + x.purchasePrice * x.quantity, 0
  );

  return {
    today: {
      salesCount:     todaySales.length,
      revenue:        todayRevenue,
      profit:         todayProfit,
      purchasesCount: todayPurchases.length,
      cost:           todayCost,
    },
    stock: {
      totalProducts,
      newStock:        newStockCount,
      secondhandStock: secondhandStockCount,
    },
    recentSales,
  };
}