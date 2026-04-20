import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';

interface CreateSaleInput {
  productId:     string;
  quantity:      number;
  salePrice:     number;
  customerName?: string;
  customerPhone?: string;
  imei?:         string;
  secondhandId?: string;
  userId:        string;
}

// Build invoice number: INV-20240118-0001
async function generateInvoiceNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's sales to get the sequence number
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const count = await prisma.sale.count({
    where: { createdAt: { gte: startOfDay } },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}

export async function getSales(productId?: string, date?: string) {
  const where: any = {};
  if (productId) where.productId = productId;
  if (date) {
    const d = new Date(date);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end   = new Date(d.setHours(23, 59, 59, 999));
    where.createdAt = { gte: start, lte: end };
  }

  return prisma.sale.findMany({
    where,
    include: {
      product:    { select: { name: true, brand: true } },
      recordedBy: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      product:    true,
      recordedBy: { select: { username: true } },
      secondhand: true,
    },
  });
  if (!sale) throw new Error('Sale not found');
  return sale;
}

export async function createSale(data: CreateSaleInput, io: Server) {
  if (data.quantity <= 0) throw new Error('Quantity must be at least 1');
  if (data.salePrice <= 0) throw new Error('Sale price must be greater than 0');

  // --- ATOMIC TRANSACTION ---
  const result = await prisma.$transaction(async (tx) => {

    // 1. Lock and read the product inside the transaction
    //    This prevents two sales from reading the same stock simultaneously
    const product = await tx.product.findFirst({
      where: { id: data.productId, isDeleted: false },
    });
    if (!product) throw new Error('Product not found');

    // 2. STOCK CHECK — this is the safety gate
    if (product.stock < data.quantity) {
      throw new Error(
        `Not enough stock. Available: ${product.stock}, requested: ${data.quantity}`
      );
    }

    // 3. Calculate financials
    const totalAmount = data.salePrice * data.quantity;
    const profit      = (data.salePrice - product.purchasePrice) * data.quantity;
    const invoiceNo   = await generateInvoiceNo();

    // 4. Create the sale record
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        productId:     data.productId,
        userId:        data.userId,
        secondhandId:  data.secondhandId ?? null,
        quantity:      data.quantity,
        salePrice:     data.salePrice,
        totalAmount,
        profit,
        customerName:  data.customerName  ?? null,
        customerPhone: data.customerPhone ?? null,
        imei:          data.imei          ?? null,
      },
    });

    // 5. Deduct stock
    const updated = await tx.product.update({
      where: { id: data.productId },
      data:  { stock: { decrement: data.quantity } },
    });

    // 6. If this was a secondhand phone, mark its record as sold
    if (data.secondhandId) {
      await tx.secondhandRecord.update({
        where: { id: data.secondhandId },
        data:  { isSold: true },
      });
    }

    return {
      sale,
      productName:  product.name,
      updatedStock: updated.stock,
    };
  });

  // Emit realtime events after commit
  io.to('shop:main').emit(EVENTS.SALE_CREATED, {
    saleId:      result.sale.id,
    invoiceNo:   result.sale.invoiceNo,
    productName: result.productName,
    totalAmount: result.sale.totalAmount,
    profit:      result.sale.profit,
  });
  io.to('shop:main').emit(EVENTS.INVENTORY_UPDATED, {
    productId: data.productId,
    stock:     result.updatedStock,
  });
  io.to('shop:main').emit(EVENTS.DASHBOARD_REFRESH, {});

  return result.sale;
}