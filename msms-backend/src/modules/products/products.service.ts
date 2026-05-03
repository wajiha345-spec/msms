import { prisma } from '../../config/db';

interface CreateProductInput {
  name: string;
  brand: string;
  category?: string;
  condition: 'new' | 'used';
  imei?: string;
  barcode?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  isSecondhand?: boolean;
  storage?: string;
  color?: string;
  ram?: string;
}

interface UpdateProductInput extends Partial<CreateProductInput> {}

// ── List all products (with optional search + condition filter) ──
export async function getProducts(search?: string, condition?: string) {
  return prisma.product.findMany({
    where: {
      isDeleted: false,
      ...(condition ? { condition } : {}),
      ...(search
        ? {
            OR: [
              { name:  { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { imei:  { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Get single product ──
export async function getProductById(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false },
  });
  if (!product) throw new Error('Product not found');
  return product;
}

// ── Lookup product by IMEI or barcode (for scanner) ──
export async function getProductByCode(code: string) {
  const trimmed = code.trim();
  const product = await prisma.product.findFirst({
    where: {
      isDeleted: false,
      OR: [
        { imei:    trimmed },
        { barcode: trimmed },
      ],
    },
  });
  return product; // null = not found
}

// ── Create product ──
export async function createProduct(data: CreateProductInput) {
  // If IMEI provided, make sure it isn't already used
  if (data.imei) {
    const exists = await prisma.product.findFirst({
      where: { imei: data.imei, isDeleted: false },
    });
    if (exists) throw new Error(`A product with IMEI ${data.imei} already exists in inventory`);
  }
  // If barcode provided, ensure it isn't duplicated
  if (data.barcode) {
    const exists = await prisma.product.findFirst({
      where: { barcode: data.barcode, isDeleted: false },
    });
    if (exists) throw new Error(`A product with this barcode already exists in inventory`);
  }

  return prisma.product.create({ data });
}

// ── Update product ──
export async function updateProduct(id: string, data: UpdateProductInput) {
  await getProductById(id); // throws if not found

  if (data.imei) {
    const conflict = await prisma.product.findFirst({
      where: { imei: data.imei, isDeleted: false, NOT: { id } },
    });
    if (conflict) throw new Error('Another product already uses this IMEI');
  }

  if (data.barcode) {
    const conflict = await prisma.product.findFirst({
      where: { barcode: data.barcode, isDeleted: false, NOT: { id } },
    });
    if (conflict) throw new Error('Another product already uses this barcode');
  }

  return prisma.product.update({ where: { id }, data });
}

// ── Soft-delete product ──
export async function deleteProduct(id: string) {
  await getProductById(id); // throws if not found

  // Soft-delete if there are linked sales (preserve history)
  const hasSales = await prisma.sale.findFirst({ where: { productId: id } });

  // Soft-delete if there is a linked SecondhandRecord — hard-deleting the
  // Product would violate the SecondhandRecord.productId foreign key, and
  // the KYC data on the record should be kept regardless.
  const hasSecondhandRecord = await prisma.secondhandRecord.findFirst({
    where: { productId: id },
  });

  if (hasSales || hasSecondhandRecord) {
    return prisma.product.update({ where: { id }, data: { isDeleted: true } });
  }

  // No sales, no secondhand record → hard delete is safe
  return prisma.product.delete({ where: { id } });
}