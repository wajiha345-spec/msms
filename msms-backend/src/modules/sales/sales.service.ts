import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';

interface GuarantorInput {
  name?: string;
  cnic:  string;
  phone: string;
}

interface CreateSaleInput {
  productId:     string;
  quantity:      number;
  salePrice:     number;
  customerName?: string;
  customerPhone?: string;
  customerCnic?: string;
  imei?:         string;
  secondhandId?: string;
  userId:        string;
  paymentType:   string; // "CASH" | "INSTALLMENT"
  installmentDueDate?: Date;
  guarantors?:   GuarantorInput[];
}

// Build invoice number: INV-20240118-0001 (unique per shop, not globally)
async function generateInvoiceNo(shopId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's sales for this shop to get the sequence number
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const count = await prisma.sale.count({
    where: { shopId, createdAt: { gte: startOfDay } },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}

export async function getSales(shopId: string, productId?: string, date?: string) {
  const where: any = { shopId };
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
      guarantors: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSaleById(shopId: string, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, shopId },
    include: {
      product:    true,
      recordedBy: { select: { username: true } },
      secondhand: true,
      guarantors: true,
    },
  });
  if (!sale) throw new Error('Sale not found');
  return sale;
}

export async function createSale(shopId: string, data: CreateSaleInput, io: Server) {
  if (data.quantity <= 0) throw new Error('Quantity must be at least 1');
  if (data.salePrice <= 0) throw new Error('Sale price must be greater than 0');

  if (data.paymentType === 'INSTALLMENT') {
    if (!data.customerCnic) throw new Error('Customer CNIC is required for installment sales');
    if (!data.customerPhone) throw new Error('Customer phone is required for installment sales');
    if (!data.installmentDueDate) throw new Error('Installment due date is required');
    if (!data.guarantors || data.guarantors.length !== 3) {
      throw new Error('Exactly 3 guarantors are required for installment sales');
    }
    for (const [i, g] of data.guarantors.entries()) {
      if (!g.cnic)  throw new Error(`Guarantor ${i + 1} CNIC is required`);
      if (!g.phone) throw new Error(`Guarantor ${i + 1} phone is required`);
    }
  }

  // --- ATOMIC TRANSACTION ---
  const result = await prisma.$transaction(async (tx) => {

    // 1. Lock and read the product inside the transaction
    //    This prevents two sales from reading the same stock simultaneously
    const product = await tx.product.findFirst({
      where: { id: data.productId, shopId, isDeleted: false },
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
    const invoiceNo   = await generateInvoiceNo(shopId);

    // 4. Create the sale record
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        productId:     data.productId,
        userId:        data.userId,
        shopId,
        secondhandId:  data.secondhandId ?? null,
        quantity:      data.quantity,
        salePrice:     data.salePrice,
        totalAmount,
        profit,
        customerName:  data.customerName  ?? null,
        customerPhone: data.customerPhone ?? null,
        customerCnic:  data.customerCnic  ?? null,
        imei:          data.imei          ?? null,
        paymentType:   data.paymentType,
        installmentDueDate: data.paymentType === 'INSTALLMENT' ? data.installmentDueDate : null,
        guarantors: data.paymentType === 'INSTALLMENT' && data.guarantors
          ? { create: data.guarantors.map((g) => ({
              name:  g.name || null,
              cnic:  g.cnic,
              phone: g.phone,
            })) }
          : undefined,
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

  // Emit realtime events after commit — scoped to this shop only
  const room = `shop:${shopId}`;
  io.to(room).emit(EVENTS.SALE_CREATED, {
    saleId:      result.sale.id,
    invoiceNo:   result.sale.invoiceNo,
    productName: result.productName,
    totalAmount: result.sale.totalAmount,
    profit:      result.sale.profit,
  });
  io.to(room).emit(EVENTS.INVENTORY_UPDATED, {
    productId: data.productId,
    stock:     result.updatedStock,
  });
  io.to(room).emit(EVENTS.DASHBOARD_REFRESH, {});

  return result.sale;
}

interface HistoricalSaleInput {
  date?:          string;
  productName:    string;
  brand?:         string;
  quantity:       number;
  salePrice:      number;
  purchasePrice?: number;
  customerName?:  string;
  customerPhone?: string;
  customerCnic?:  string;
  paymentType:    string; // "CASH" | "INSTALLMENT"
  installmentDueDate?: string;
  installmentPaid?:    boolean;
}

// Historical imports often reference products that were sold before MSMS
// started tracking inventory (or were discontinued). Match by name first
// within the importing shop; if nothing matches, create a zero-stock
// placeholder so the sale still has somewhere to point — it must NOT
// affect real inventory counts.
async function findOrCreateHistoricalProduct(shopId: string, name: string, brand: string, purchasePrice: number, salePrice: number) {
  const existing = await prisma.product.findFirst({
    where: { shopId, name: { equals: name, mode: 'insensitive' }, isDeleted: false },
  });
  if (existing) return existing;

  return prisma.product.create({
    data: { shopId, name, brand: brand || 'Unknown', purchasePrice, salePrice, stock: 0 },
  });
}

let historySeq = 0;

// Creates a single backfilled sale from an imported CSV row. Unlike
// createSale(), this does NOT check or decrement product stock — the item
// was already sold in the shop's previous system before MSMS existed, so
// today's stock count must stay untouched.
export async function createHistoricalSale(shopId: string, data: HistoricalSaleInput, userId: string) {
  if (!data.productName) throw new Error('Product name is required');
  if (!data.quantity || data.quantity <= 0) throw new Error('Quantity must be at least 1');
  if (!data.salePrice || data.salePrice <= 0) throw new Error('Sale price must be greater than 0');
  if (data.paymentType === 'INSTALLMENT' && !data.installmentDueDate) {
    throw new Error('Due date is required for installment sales');
  }

  const purchasePrice = data.purchasePrice ?? data.salePrice;
  const product = await findOrCreateHistoricalProduct(
    shopId, data.productName, data.brand || '', purchasePrice, data.salePrice
  );

  const totalAmount = data.salePrice * data.quantity;
  const profit      = (data.salePrice - purchasePrice) * data.quantity;
  const invoiceNo   = `HIST-${Date.now()}-${historySeq++}`;

  return prisma.sale.create({
    data: {
      invoiceNo,
      productId:     product.id,
      userId,
      shopId,
      quantity:      data.quantity,
      salePrice:     data.salePrice,
      totalAmount,
      profit,
      customerName:  data.customerName  || null,
      customerPhone: data.customerPhone || null,
      customerCnic:  data.customerCnic  || null,
      paymentType:   data.paymentType === 'INSTALLMENT' ? 'INSTALLMENT' : 'CASH',
      installmentDueDate: data.paymentType === 'INSTALLMENT' ? new Date(data.installmentDueDate!) : null,
      installmentPaid:    !!data.installmentPaid,
      createdAt:     data.date ? new Date(data.date) : undefined,
    },
  });
}

export async function markInstallmentPaid(shopId: string, id: string, io: Server) {
  const sale = await prisma.sale.findFirst({ where: { id, shopId } });
  if (!sale) throw new Error('Sale not found');
  if (sale.paymentType !== 'INSTALLMENT') throw new Error('Sale is not an installment sale');

  const updated = await prisma.sale.update({
    where: { id },
    data:  { installmentPaid: true },
  });

  io.to(`shop:${shopId}`).emit(EVENTS.DASHBOARD_REFRESH, {});

  return updated;
}
