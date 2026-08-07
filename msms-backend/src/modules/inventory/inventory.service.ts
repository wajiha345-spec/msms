import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';
import { updateProduct } from '../products/products.service';
import { ensureMainBranch } from '../branches/branches.service';
import { getSettingsOrDefault } from '../settings/settings.service';

// ── Inventory Enhancements ──────────────────────────────────────────────────
// Two additive features layered on top of the existing Product/Branch
// models: a per-product reorder point that overrides the shop-wide
// low-stock threshold, and stock transfer between branches. Neither
// touches getProducts/createProduct/createSale/createPurchase — reads go
// straight to Prisma (same style as branches.service.ts:getBranchReport),
// and the only write path (transferStock) reuses the existing, unchanged
// products.service.ts:updateProduct for both legs of the move.

export async function getLowStockProducts(shopId: string) {
  const [settings, products] = await Promise.all([
    getSettingsOrDefault(shopId),
    prisma.product.findMany({
      where: { shopId, isDeleted: false },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { stock: 'asc' },
    }),
  ]);

  return products
    .map((p) => ({
      id: p.id, name: p.name, brand: p.brand, stock: p.stock,
      reorderPoint: p.reorderPoint,
      effectiveThreshold: p.reorderPoint ?? settings.lowStockThreshold,
      branch: p.branch,
    }))
    .filter((p) => p.stock <= p.effectiveThreshold);
}

export async function setReorderPoint(shopId: string, productId: string, reorderPoint: number | null) {
  if (reorderPoint != null && reorderPoint < 0) throw new Error('Reorder point cannot be negative');
  return updateProduct(shopId, productId, { reorderPoint });
}

interface TransferStockInput {
  productId:   string;
  toBranchId:  string;
  quantity:    number;
  userId:      string;
}

export async function transferStock(shopId: string, data: TransferStockInput, io: Server) {
  if (!data.quantity || data.quantity <= 0) throw new Error('Quantity must be at least 1');

  await ensureMainBranch(shopId);

  const [source, destBranch] = await Promise.all([
    prisma.product.findFirst({ where: { id: data.productId, shopId, isDeleted: false } }),
    prisma.branch.findFirst({ where: { id: data.toBranchId, shopId, isActive: true } }),
  ]);
  if (!source) throw new Error('Product not found');
  if (!destBranch) throw new Error('Destination branch not found');
  if (source.stock < data.quantity) {
    throw new Error(`Not enough stock. Available: ${source.stock}, requested: ${data.quantity}`);
  }

  const sourceBranchId = source.branchId ?? (await prisma.branch.findFirst({ where: { shopId, isMain: true } }))!.id;
  if (sourceBranchId === destBranch.id) {
    throw new Error(`This product is already at ${destBranch.name}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const decremented = await tx.product.update({
      where: { id: source.id },
      data:  { stock: { decrement: data.quantity } },
    });

    const existingAtDest = await tx.product.findFirst({
      where: {
        shopId, isDeleted: false, branchId: destBranch.id,
        name: source.name, brand: source.brand, category: source.category, condition: source.condition,
      },
    });

    const destination = existingAtDest
      ? await tx.product.update({
          where: { id: existingAtDest.id },
          data:  { stock: { increment: data.quantity } },
        })
      : await tx.product.create({
          data: {
            shopId,
            name: source.name, brand: source.brand, category: source.category, condition: source.condition,
            purchasePrice: source.purchasePrice, salePrice: source.salePrice,
            storage: source.storage, color: source.color, ram: source.ram,
            stock: data.quantity,
            branchId: destBranch.id,
          },
        });

    return { source: decremented, destination };
  });

  const room = `shop:${shopId}`;
  io.to(room).emit(EVENTS.INVENTORY_UPDATED, { productId: result.source.id, stock: result.source.stock });
  io.to(room).emit(EVENTS.INVENTORY_UPDATED, { productId: result.destination.id, stock: result.destination.stock });
  io.to(room).emit(EVENTS.DASHBOARD_REFRESH, {});

  return result;
}
