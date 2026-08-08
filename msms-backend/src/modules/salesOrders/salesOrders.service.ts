import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { createSale } from '../sales/sales.service';
import { validatePaymentSplit, apportionSplit } from '../accounting/accounting.service';

interface PaymentInput {
  paymentMethod?: string; // "CASH" | "ACCOUNT" | "SPLIT"
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}

const ADVANCEABLE_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED'];

// Build SO number like SO-20260806-0001 — same per-shop-per-day counter
// pattern as sales.service.ts:generateInvoiceNo.
async function generateSoNo(shopId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.salesOrder.count({
    where: { shopId, createdAt: { gte: startOfDay } },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `SO-${dateStr}-${seq}`;
}

interface SoItemInput {
  productId:   string;
  description: string;
  quantity:    number;
  unitPrice:   number;
}

interface CreateSoInput {
  customerName:  string;
  customerPhone: string;
  deliveryDate?: string | Date;
  notes?:        string;
  items:         SoItemInput[];
  userId:        string;
}

const SO_INCLUDE = {
  items:     { include: { product: { select: { id: true, name: true, brand: true } } } },
  createdBy: { select: { username: true } },
} as const;

export async function listSalesOrders(shopId: string) {
  return prisma.salesOrder.findMany({
    where:   { shopId },
    include: SO_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSalesOrderById(shopId: string, id: string) {
  const so = await prisma.salesOrder.findFirst({ where: { id, shopId }, include: SO_INCLUDE });
  if (!so) throw new Error('Sales order not found');
  return so;
}

export async function createSalesOrder(shopId: string, data: CreateSoInput) {
  if (!data.customerName?.trim())  throw new Error('Customer name is required');
  if (!data.customerPhone?.trim()) throw new Error('Customer phone is required');
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('At least one line item is required');
  }

  for (const [i, item] of data.items.entries()) {
    if (!item.productId) throw new Error(`Line ${i + 1}: a product is required`);
    if (!item.quantity || item.quantity <= 0) throw new Error(`Line ${i + 1}: quantity must be greater than 0`);
    if (!item.unitPrice || item.unitPrice <= 0) throw new Error(`Line ${i + 1}: unit price must be greater than 0`);
    const product = await prisma.product.findFirst({ where: { id: item.productId, shopId, isDeleted: false } });
    if (!product) throw new Error(`Line ${i + 1}: product not found`);
  }

  const soNo = await generateSoNo(shopId);

  return prisma.salesOrder.create({
    data: {
      shopId,
      soNo,
      customerName:  data.customerName,
      customerPhone: data.customerPhone,
      deliveryDate:  data.deliveryDate ? new Date(data.deliveryDate) : null,
      notes:         data.notes,
      userId:        data.userId,
      items: {
        create: data.items.map((item) => ({
          productId:   item.productId,
          description: item.description.trim(),
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
        })),
      },
    },
    include: SO_INCLUDE,
  });
}

export async function updateStatus(shopId: string, id: string, status: string) {
  if (!ADVANCEABLE_STATUSES.includes(status)) {
    throw new Error('Status must be one of PENDING, PROCESSING, SHIPPED — use the dedicated actions for Delivered/Cancelled');
  }
  const so = await prisma.salesOrder.findFirst({ where: { id, shopId } });
  if (!so) throw new Error('Sales order not found');
  if (!ADVANCEABLE_STATUSES.includes(so.status)) {
    throw new Error(`Cannot change status of an order that is already ${so.status}`);
  }
  return prisma.salesOrder.update({ where: { id }, data: { status } });
}

export async function cancelSalesOrder(shopId: string, id: string) {
  const so = await prisma.salesOrder.findFirst({ where: { id, shopId } });
  if (!so) throw new Error('Sales order not found');
  if (so.status === 'DELIVERED') throw new Error('Cannot cancel an order that has already been delivered');
  if (so.status === 'CANCELLED') throw new Error('Order is already cancelled');
  return prisma.salesOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
}

export async function markDelivered(shopId: string, userId: string, id: string, io: Server, payment: PaymentInput) {
  const so = await prisma.salesOrder.findFirst({ where: { id, shopId }, include: { items: true } });
  if (!so) throw new Error('Sales order not found');
  if (so.status === 'DELIVERED') throw new Error('Order has already been delivered');
  if (so.status === 'CANCELLED') throw new Error('Cannot deliver a cancelled order');

  const itemTotals = so.items.map((item) => item.quantity * item.unitPrice);
  const grandTotal  = itemTotals.reduce((s, a) => s + a, 0);
  validatePaymentSplit(payment.paymentMethod, grandTotal, payment.cashAmount, payment.accountId, payment.accountAmount);
  const perItemSplit = payment.paymentMethod === 'SPLIT'
    ? apportionSplit(itemTotals, payment.cashAmount ?? 0, payment.accountAmount ?? 0)
    : null;

  // Reuses sales.service.ts's createSale() unchanged — one call per line
  // item, same shape Quotations' convert step already uses, including its
  // existing real-time stock check. The one payment choice made for the
  // whole delivery is proportionally apportioned across items when Split.
  const createdSales = [];
  for (const [i, item] of so.items.entries()) {
    const sale = await createSale(
      shopId,
      {
        productId:     item.productId,
        quantity:      item.quantity,
        salePrice:     item.unitPrice,
        paymentType:   'CASH',
        customerName:  so.customerName  ?? undefined,
        customerPhone: so.customerPhone ?? undefined,
        userId,
        paymentMethod: payment.paymentMethod,
        accountId:     payment.accountId,
        cashAmount:    perItemSplit ? perItemSplit[i].cashAmount    : undefined,
        accountAmount: perItemSplit ? perItemSplit[i].accountAmount : undefined,
      },
      io
    );
    await prisma.salesOrderItem.update({ where: { id: item.id }, data: { createdSaleId: sale.id } });
    createdSales.push(sale);
  }

  await prisma.salesOrder.update({ where: { id }, data: { status: 'DELIVERED' } });

  return createdSales;
}
