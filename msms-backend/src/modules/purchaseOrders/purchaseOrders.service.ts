import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { createPurchase } from '../purchases/purchases.service';
import { notifyPurchaseOrderReceived } from '../notifications/notifications.service';

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
  supplierName?:  string;
  supplierPhone?: string;
  expectedDate?:  string | Date;
  notes?:         string;
  items:          PoItemInput[];
  userId:         string;
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

  // Reuses purchases.service.ts's createPurchase() unchanged — one call per
  // receipt line, so stock increments and the Purchase record are created
  // exactly as they already are for a manually-recorded purchase.
  for (const receipt of data.receipts) {
    const item = po.items.find((i) => i.id === receipt.itemId)!;
    await createPurchase(
      shopId,
      {
        productId:      item.productId,
        quantity:       receipt.quantity,
        purchasePrice:  item.unitPrice,
        supplierName:   po.supplierName  ?? undefined,
        supplierPhone:  po.supplierPhone ?? undefined,
        paymentType:    data.paymentType,
        userId:         data.userId,
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
