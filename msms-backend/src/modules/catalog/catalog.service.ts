import { prisma } from '../../config/db';

export async function lookupCatalog(barcode: string) {
  return prisma.productCatalog.findUnique({
    where: { barcode: barcode.trim() },
  });
}

export async function listCatalog(search?: string) {
  return prisma.productCatalog.findMany({
    where: search ? {
      OR: [
        { name:    { contains: search, mode: 'insensitive' } },
        { brand:   { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: { addedAt: 'desc' },
  });
}

export async function deleteCatalogEntry(id: string) {
  return prisma.productCatalog.delete({ where: { id } });
}

export async function contributeToCatalog(data: {
  barcode:  string;
  name:     string;
  brand:    string;
  category: string;
}) {
  const barcode = data.barcode.trim();
  if (!barcode || !data.name.trim()) return;

  // upsert — if same barcode was contributed before, update with latest info
  await prisma.productCatalog.upsert({
    where:  { barcode },
    update: { name: data.name.trim(), brand: data.brand.trim(), category: data.category },
    create: { barcode, name: data.name.trim(), brand: data.brand.trim(), category: data.category },
  });
}
