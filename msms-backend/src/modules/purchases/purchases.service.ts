import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';

interface CreatePurchaseInput {
  productId:     string;
  quantity:      number;
  purchasePrice: number;
  supplierName?: string;
  supplierPhone?: string;
  paymentType?:  string; // "CASH" | "CREDIT" — defaults to CASH, same as before
  paymentDueDate?: string | Date;
  branchId?:     string; // optional — unset means "Main Branch" (see branches.service.ts)
  userId:        string;
}

export async function getPurchases(shopId: string, productId?: string) {
  return prisma.purchase.findMany({
    where: { shopId, ...(productId ? { productId } : {}) },
    include: {
      product:    { select: { name: true, brand: true } },
      recordedBy: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Convenience lookup for New Purchase's supplier picker — no dedicated
// Supplier master table exists (same reasoning as supplierLedger.service.ts:
// suppliers are grouped by the supplierPhone Purchase already carries).
// Unlike supplierLedger's listSuppliers (CREDIT-only, for ledger balances),
// this includes every past supplier regardless of payment type, since it's
// just "who have I bought from before" for autofill purposes.
export async function listDistinctSuppliers(shopId: string, search?: string) {
  const where: any = { shopId, supplierPhone: { not: null } };
  if (search) {
    const q = search.trim();
    where.OR = [
      { supplierName:  { contains: q, mode: 'insensitive' } },
      { supplierPhone: { contains: q } },
    ];
  }
  const purchases = await prisma.purchase.findMany({
    where,
    select: { supplierName: true, supplierPhone: true },
    orderBy: { createdAt: 'desc' },
    distinct: ['supplierPhone'],
  });
  return purchases.map((p) => ({ supplierName: p.supplierName, supplierPhone: p.supplierPhone as string }));
}

export async function getPurchaseById(shopId: string, id: string) {
  const p = await prisma.purchase.findFirst({
    where: { id, shopId },
    include: {
      product:    { select: { name: true, brand: true } },
      recordedBy: { select: { username: true } },
    },
  });
  if (!p) throw new Error('Purchase not found');
  return p;
}

export async function createPurchase(shopId: string, data: CreatePurchaseInput, io: Server) {
  // Verify product exists and is not deleted
  const product = await prisma.product.findFirst({
    where: { id: data.productId, shopId, isDeleted: false },
  });
  if (!product) throw new Error('Product not found');
  if (data.quantity <= 0) throw new Error('Quantity must be at least 1');
  if (data.purchasePrice <= 0) throw new Error('Purchase price must be greater than 0');
  if (!data.supplierName?.trim())  throw new Error('Supplier name is required');
  if (!data.supplierPhone?.trim()) throw new Error('Supplier phone is required');

  // --- ATOMIC TRANSACTION ---
  // Both the Purchase record AND the stock increment happen together.
  // If either fails, neither is saved.
  const result = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        productId:     data.productId,
        userId:        data.userId,
        shopId,
        quantity:      data.quantity,
        purchasePrice: data.purchasePrice,
        supplierName:  data.supplierName,
        supplierPhone: data.supplierPhone,
        paymentType:    data.paymentType === 'CREDIT' ? 'CREDIT' : 'CASH',
        paymentDueDate: data.paymentType === 'CREDIT' && data.paymentDueDate
          ? new Date(data.paymentDueDate)
          : null,
        branchId: data.branchId ?? null,
      },
    });

    const updated = await tx.product.update({
      where: { id: data.productId },
      data:  { stock: { increment: data.quantity } },
    });

    return { purchase, updatedStock: updated.stock };
  });

  // Emit realtime events AFTER the transaction succeeds — scoped to this shop only
  const room = `shop:${shopId}`;
  io.to(room).emit(EVENTS.PURCHASE_CREATED, {
    productId:    data.productId,
    productName:  product.name,
    quantity:     data.quantity,
    updatedStock: result.updatedStock,
  });
  io.to(room).emit(EVENTS.INVENTORY_UPDATED, {
    productId: data.productId,
    stock:     result.updatedStock,
  });
  io.to(room).emit(EVENTS.DASHBOARD_REFRESH, {});

  return result.purchase;
}
