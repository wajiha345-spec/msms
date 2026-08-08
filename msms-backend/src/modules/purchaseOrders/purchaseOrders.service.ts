import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { createPurchase } from '../purchases/purchases.service';
import { notifyPurchaseOrderReceived } from '../notifications/notifications.service';
import { validatePaymentSplit, apportionSplit } from '../accounting/accounting.service';

// Build PO number like PO-20260806-0001 — same per-shop-per-day counter
// pattern as sales.service.ts:generateInvoiceNo.
async function generatePoNo(shopId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.purchaseOrder.count({
    where: { shopId, createdAt: { gte: startOfDay } },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `PO-${dateStr}-${seq}`;
}

interface PoItemInput {
  productId:       string;
  description:     string;
  quantityOrdered: number;
  unitPrice:       number;
}

interface CreatePoInput {
  supplierName:  string;
  supplierPhone: string;
  expectedDate?: string | Date;
  notes?:        string;
  items:         PoItemInput[];
  userId:        string;
  // Payment choice, decided once at creation — receiveGoods() reuses these
  // for every receipt against this order instead of asking again.
  paymentType?:   string; // "CASH" | "CREDIT" — defaults to CASH
  paymentMethod?: string; // "CASH" | "ACCOUNT" | "SPLIT" — required unless CREDIT
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}

const PO_INCLUDE = {
  items:     { include: { product: { select: { id: true, name: true, brand: true } } } },
  createdBy: { select: { username: true } },
} as const;

export async function listPurchaseOrders(shopId: string) {
  return prisma.purchaseOrder.findMany({
    where:   { shopId },
    include: PO_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPurchaseOrderById(shopId: string, id: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, shopId }, include: PO_INCLUDE });
  if (!po) throw new Error('Purchase order not found');
  return po;
}

export async function createPurchaseOrder(shopId: string, data: CreatePoInput) {
  if (!data.supplierName?.trim())  throw new Error('Supplier name is required');
  if (!data.supplierPhone?.trim()) throw new Error('Supplier phone is required');
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('At least one line item is required');
  }

  for (const [i, item] of data.items.entries()) {
    if (!item.productId) throw new Error(`Line ${i + 1}: a product is required`);
    if (!item.quantityOrdered || item.quantityOrdered <= 0) throw new Error(`Line ${i + 1}: quantity must be greater than 0`);
    if (!item.unitPrice || item.unitPrice <= 0) throw new Error(`Line ${i + 1}: unit price must be greater than 0`);
    const product = await prisma.product.findFirst({ where: { id: item.productId, shopId, isDeleted: false } });
    if (!product) throw new Error(`Line ${i + 1}: product not found`);
  }

  // Payment is decided once, here, for the whole order — CREDIT orders skip
  // this (no cash moves until settled via supplierLedger, same as a credit
  // Purchase); CASH orders require Cash/Account/Split now so receiveGoods()
  // never has to ask again.
  const isCredit = data.paymentType === 'CREDIT';
  if (!isCredit) {
    const orderedTotal = data.items.reduce((s, i) => s + i.quantityOrdered * i.unitPrice, 0);
    validatePaymentSplit(data.paymentMethod, orderedTotal, data.cashAmount, data.accountId, data.accountAmount);
  }

  const poNo = await generatePoNo(shopId);

  return prisma.purchaseOrder.create({
    data: {
      shopId,
      poNo,
      supplierName:  data.supplierName,
      supplierPhone: data.supplierPhone,
      expectedDate:  data.expectedDate ? new Date(data.expectedDate) : null,
      notes:         data.notes,
      userId:        data.userId,
      paymentType:    isCredit ? 'CREDIT' : 'CASH',
      paymentMethod:  isCredit ? null : data.paymentMethod,
      cashAmount:     isCredit ? null : data.cashAmount    ?? null,
      accountId:      isCredit ? null : data.accountId     ?? null,
      accountAmount:  isCredit ? null : data.accountAmount ?? null,
      items: {
        create: data.items.map((item) => ({
          productId:       item.productId,
          description:     item.description.trim(),
          quantityOrdered: item.quantityOrdered,
          unitPrice:       item.unitPrice,
        })),
      },
    },
    include: PO_INCLUDE,
  });
}

export async function cancelPurchaseOrder(shopId: string, id: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, shopId }, include: { items: true } });
  if (!po) throw new Error('Purchase order not found');
  if (po.status === 'CANCELLED') throw new Error('Purchase order is already cancelled');
  if (po.items.some((item) => item.quantityReceived > 0)) {
    throw new Error('Cannot cancel a purchase order that already has received goods');
  }
  return prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
}

interface Receipt {
  itemId:   string;
  quantity: number;
}

interface ReceiveGoodsInput {
  receipts:     Receipt[];
  paymentType?: string;
  userId:       string;
  paymentMethod?: string; // "CASH" | "ACCOUNT" | "SPLIT" — required unless paymentType is CREDIT
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}

export async function receiveGoods(shopId: string, poId: string, data: ReceiveGoodsInput, io: Server) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, shopId }, include: { items: true } });
  if (!po) throw new Error('Purchase order not found');
  if (po.status === 'RECEIVED') throw new Error('Purchase order has already been fully received');
  if (po.status === 'CANCELLED') throw new Error('Cannot receive against a cancelled purchase order');
  if (!Array.isArray(data.receipts) || data.receipts.length === 0) {
    throw new Error('At least one receipt line is required');
  }

  for (const receipt of data.receipts) {
    const item = po.items.find((i) => i.id === receipt.itemId);
    if (!item) throw new Error('Line item not found on this purchase order');
    if (!receipt.quantity || receipt.quantity <= 0) throw new Error('Received quantity must be greater than 0');
    const remaining = item.quantityOrdered - item.quantityReceived;
    if (receipt.quantity > remaining) {
      throw new Error(`Cannot receive ${receipt.quantity} of "${item.description}" — only ${remaining} remaining`);
    }
  }

  // Payment was decided once at PO creation time (createPurchaseOrder).
  // Orders created before that field existed (paymentType is null) fall
  // back to accepting payment fields on this request instead, exactly how
  // this endpoint used to work.
  const isLegacyOrder      = po.paymentType == null;
  const paymentType        = isLegacyOrder ? data.paymentType    : po.paymentType ?? undefined;
  const paymentMethod      = isLegacyOrder ? data.paymentMethod  : po.paymentMethod ?? undefined;
  const cashAmountTotal    = isLegacyOrder ? data.cashAmount     : po.cashAmount ?? undefined;
  const accountId          = isLegacyOrder ? data.accountId      : po.accountId ?? undefined;
  const accountAmountTotal = isLegacyOrder ? data.accountAmount  : po.accountAmount ?? undefined;

  const isCredit = paymentType === 'CREDIT';
  const receiptTotals = data.receipts.map((r) => r.quantity * po.items.find((i) => i.id === r.itemId)!.unitPrice);
  const grandTotal = receiptTotals.reduce((s, a) => s + a, 0);

  let perLineSplit: { cashAmount: number; accountAmount: number }[] | null = null;
  if (!isCredit) {
    if (isLegacyOrder) {
      // Old behavior — validate against this receipt batch's own total.
      validatePaymentSplit(paymentMethod, grandTotal, cashAmountTotal, accountId, accountAmountTotal);
      perLineSplit = paymentMethod === 'SPLIT'
        ? apportionSplit(receiptTotals, cashAmountTotal ?? 0, accountAmountTotal ?? 0)
        : null;
    } else {
      // New behavior — cashAmount/accountAmount were already validated
      // against the PO's full ordered total at creation. A single PO can be
      // received across several partial batches over time, so apportion
      // this batch's share of that stored split, proportional to how much
      // of the order it covers, so repeated partial receipts still sum to
      // the original split once the order is fully received.
      const orderedTotal  = po.items.reduce((s, i) => s + i.quantityOrdered * i.unitPrice, 0);
      const batchFraction = orderedTotal > 0 ? grandTotal / orderedTotal : 0;
      const batchCash      = (cashAmountTotal ?? 0) * batchFraction;
      const batchAccount   = (accountAmountTotal ?? 0) * batchFraction;
      perLineSplit = paymentMethod === 'SPLIT'
        ? apportionSplit(receiptTotals, batchCash, batchAccount)
        : null;
    }
  }

  // Reuses purchases.service.ts's createPurchase() unchanged — one call per
  // receipt line, so stock increments and the Purchase record are created
  // exactly as they already are for a manually-recorded purchase. The one
  // payment choice made for the whole order is proportionally apportioned
  // across lines when Split.
  for (const [i, receipt] of data.receipts.entries()) {
    const item = po.items.find((i) => i.id === receipt.itemId)!;
    await createPurchase(
      shopId,
      {
        productId:      item.productId,
        quantity:       receipt.quantity,
        purchasePrice:  item.unitPrice,
        supplierName:   po.supplierName  ?? undefined,
        supplierPhone:  po.supplierPhone ?? undefined,
        paymentType,
        userId:         data.userId,
        paymentMethod,
        accountId,
        cashAmount:     perLineSplit ? perLineSplit[i].cashAmount    : undefined,
        accountAmount:  perLineSplit ? perLineSplit[i].accountAmount : undefined,
      },
      io
    );
    await prisma.purchaseOrderItem.update({
      where: { id: item.id },
      data:  { quantityReceived: { increment: receipt.quantity } },
    });
  }

  const updatedItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });
  const allReceived = updatedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
  const anyReceived = updatedItems.some((i) => i.quantityReceived > 0);
  const newStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status;

  const updated = await prisma.purchaseOrder.update({
    where:   { id: poId },
    data:    { status: newStatus },
    include: PO_INCLUDE,
  });

  // Fire-and-forget — only on the transition INTO fully received, not on
  // every partial receipt.
  if (newStatus === 'RECEIVED' && po.status !== 'RECEIVED') {
    notifyPurchaseOrderReceived(shopId, {
      poId, poNo: po.poNo, actorUserId: data.userId,
    }).catch(() => {});
  }

  return updated;
}
