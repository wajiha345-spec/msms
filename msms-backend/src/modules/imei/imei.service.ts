import { prisma } from '../../config/db';

export async function searchByImei(query: string) {
  if (!query || query.trim().length < 4) {
    throw new Error('Search query must be at least 4 characters');
  }

  const q = query.trim();

  // Search across all three tables in parallel for speed
  const [products, sales, secondhandRecords] = await Promise.all([

    // Products with matching full IMEI or last-4 digits
    prisma.product.findMany({
      where: {
        isDeleted: false,
        OR: [
          { imei: { equals: q } },
          { imei: { endsWith: q } },
        ],
      },
      select: {
        id: true, name: true, brand: true, condition: true,
        imei: true, stock: true, purchasePrice: true, salePrice: true,
        isSecondhand: true, createdAt: true,
      },
    }),

    // Sales with matching IMEI
    prisma.sale.findMany({
      where: {
        OR: [
          { imei: { equals: q } },
          { imei: { endsWith: q } },
        ],
      },
      include: {
        product:    { select: { name: true, brand: true } },
        recordedBy: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Secondhand records with matching IMEI
    prisma.secondhandRecord.findMany({
      where: {
        OR: [
          { imei: { equals: q } },
          { imei: { endsWith: q } },
        ],
      },
      include: {
        product: { select: { stock: true, salePrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

  ]);

  return {
    query:    q,
    products,
    sales,
    secondhandRecords,
    found:    products.length > 0 || sales.length > 0 || secondhandRecords.length > 0,
  };
}