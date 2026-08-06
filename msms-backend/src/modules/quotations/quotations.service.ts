import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { createSale } from '../sales/sales.service';

// Build quote number like QUO-20260806-0001 — same per-shop-per-day counter
// pattern as sales.service.ts:generateInvoiceNo.
async function generateQuoteNo(shopId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.quotation.count({
    where: { shopId, createdAt: { gte: startOfDay } },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `QUO-${dateStr}-${seq}`;
}

interface QuotationItemInput {
  productId?:   string;
  description:  string;
  quantity:     number;
  unitPrice:    number;
}

interface CreateQuotationInput {
  customerName?:  string;
  customerPhone?: string;
  validUntil?:    string | Date;
  notes?:         string;
  items:          QuotationItemInput[];
  userId:         string;
}

const QUOTATION_INCLUDE = {
  items:     { include: { product: { select: { id: true, name: true, brand: true } } } },
  createdBy: { select: { username: true } },
} as const;

export async function listQuotations(shopId: string) {
  return prisma.quotation.findMany({
    where:   { shopId },
    include: QUOTATION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getQuotationById(shopId: string, id: string) {
  const q = await prisma.quotation.findFirst({ where: { id, shopId }, include: QUOTATION_INCLUDE });
  if (!q) throw new Error('Quotation not found');
  return q;
}

// Used by the public view/PDF route — id is the access token, same convention
// as invoices.controller.ts:getInvoice (no shopId scoping; unguessability of
// the cuid is the access control).
export async function getQuotationForView(id: string) {
  const q = await prisma.quotation.findUnique({ where: { id }, include: QUOTATION_INCLUDE });
  if (!q) throw new Error('Quotation not found');
  return q;
}

export async function createQuotation(shopId: string, data: CreateQuotationInput) {
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('At least one line item is required');
  }

  for (const [i, item] of data.items.entries()) {
    if (!item.description?.trim()) throw new Error(`Line ${i + 1}: description is required`);
    if (!item.quantity || item.quantity <= 0) throw new Error(`Line ${i + 1}: quantity must be greater than 0`);
    if (!item.unitPrice || item.unitPrice <= 0) throw new Error(`Line ${i + 1}: unit price must be greater than 0`);
    if (item.productId) {
      const product = await prisma.product.findFirst({ where: { id: item.productId, shopId, isDeleted: false } });
      if (!product) throw new Error(`Line ${i + 1}: product not found`);
    }
  }

  const quoteNo = await generateQuoteNo(shopId);

  return prisma.quotation.create({
    data: {
      shopId,
      quoteNo,
      customerName:  data.customerName,
      customerPhone: data.customerPhone,
      validUntil:    data.validUntil ? new Date(data.validUntil) : null,
      notes:         data.notes,
      userId:        data.userId,
      items: {
        create: data.items.map((item) => ({
          productId:   item.productId ?? null,
          description: item.description.trim(),
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          lineTotal:   item.quantity * item.unitPrice,
        })),
      },
    },
    include: QUOTATION_INCLUDE,
  });
}

export async function cancelQuotation(shopId: string, id: string) {
  const q = await prisma.quotation.findFirst({ where: { id, shopId } });
  if (!q) throw new Error('Quotation not found');
  if (q.status === 'CONVERTED') throw new Error('Cannot cancel a quotation that has already been converted');
  if (q.status === 'CANCELLED') throw new Error('Quotation is already cancelled');
  return prisma.quotation.update({ where: { id }, data: { status: 'CANCELLED' } });
}

export async function convertQuotationToSales(shopId: string, userId: string, id: string, io: Server) {
  const quotation = await prisma.quotation.findFirst({
    where:   { id, shopId },
    include: { items: true },
  });
  if (!quotation) throw new Error('Quotation not found');
  if (quotation.status === 'CONVERTED') throw new Error('Quotation has already been converted');
  if (quotation.status === 'CANCELLED') throw new Error('Cannot convert a cancelled quotation');

  const unlinked = quotation.items.find((item) => !item.productId);
  if (unlinked) {
    throw new Error(
      `Line "${unlinked.description}" is not linked to a product — link it to inventory before converting`
    );
  }

  // Reuses sales.service.ts's createSale() unchanged — one call per line
  // item, so stock is re-checked for real at conversion time and no
  // stock-decrement/transaction logic is duplicated here.
  const createdSales = [];
  for (const item of quotation.items) {
    const sale = await createSale(
      shopId,
      {
        productId:     item.productId!,
        quantity:      item.quantity,
        salePrice:     item.unitPrice,
        paymentType:   'CASH',
        customerName:  quotation.customerName  ?? undefined,
        customerPhone: quotation.customerPhone ?? undefined,
        userId,
      },
      io
    );
    await prisma.quotationItem.update({ where: { id: item.id }, data: { createdSaleId: sale.id } });
    createdSales.push(sale);
  }

  await prisma.quotation.update({ where: { id }, data: { status: 'CONVERTED' } });

  return createdSales;
}
