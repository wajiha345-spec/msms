import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';

interface CreatePurchaseInput {
  productId:     string;
  quantity:      number;
  purchasePrice: number;
  supplierName?: string;
  supplierPhone?: string;
  userId:        string;
}

export async function getPurchases(productId?: string) {
  return prisma.purchase.findMany({
    where: productId ? { productId } : {},
    include: {
      product:    { select: { name: true, brand: true } },
      recordedBy: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPurchaseById(id: string) {
  const p = await prisma.purchase.findUnique({
    where: { id },
    include: {
      product:    { select: { name: true, brand: true } },
      recordedBy: { select: { username: true } },
    },
  });
  if (!p) throw new Error('Purchase not found');
  return p;
}

export async function createPurchase(data: CreatePurchaseInput, io: Server) {
  // Verify product exists and is not deleted
  const product = await prisma.product.findFirst({
    where: { id: data.productId, isDeleted: false },
  });
  if (!product) throw new Error('Product not found');
  if (data.quantity <= 0) throw new Error('Quantity must be at least 1');
  if (data.purchasePrice <= 0) throw new Error('Purchase price must be greater than 0');

  // --- ATOMIC TRANSACTION ---
  // Both the Purchase record AND the stock increment happen together.
  // If either fails, neither is saved.
  const result = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        productId:     data.productId,
        userId:        data.userId,
        quantity:      data.quantity,
        purchasePrice: data.purchasePrice,
        supplierName:  data.supplierName,
        supplierPhone: data.supplierPhone,
      },
    });

    const updated = await tx.product.update({
      where: { id: data.productId },
      data:  { stock: { increment: data.quantity } },
    });

    return { purchase, updatedStock: updated.stock };
  });

  // Emit realtime events AFTER the transaction succeeds
  io.to('shop:main').emit(EVENTS.PURCHASE_CREATED, {
    productId:    data.productId,
    productName:  product.name,
    quantity:     data.quantity,
    updatedStock: result.updatedStock,
  });
  io.to('shop:main').emit(EVENTS.INVENTORY_UPDATED, {
    productId: data.productId,
    stock:     result.updatedStock,
  });
  io.to('shop:main').emit(EVENTS.DASHBOARD_REFRESH, {});

  return result.purchase;
}