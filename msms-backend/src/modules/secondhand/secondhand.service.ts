import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';
import {
  postJournalEntry, buildCashAccountLines, validatePaymentSplit,
  getSystemAccountId, SYSTEM_ACCOUNT_CODES,
} from '../accounting/accounting.service';

interface CreateSecondhandInput {
  mobileName:    string;
  brand:         string;
  category?:     string;
  imei?:         string;
  sellerName:    string;
  sellerCnic:    string;
  sellerPhone:   string;
  purchasePrice: number;
  notes?:        string;
  sellerPhotoUrl?: string;
  cnicPhotoUrl?:   string;
  storage?:      string;
  color?:        string;
  ram?:          string;
  // Cash/Account ledger wiring — always required, secondhand buys are always
  // immediate cash (no credit concept here).
  paymentMethod: string; // "CASH" | "ACCOUNT" | "SPLIT"
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}

export async function getSecondhandRecords(shopId: string, isSold?: boolean) {
  return prisma.secondhandRecord.findMany({
    where: { shopId, ...(isSold !== undefined ? { isSold } : {}) },
    include: {
      product: {
        select: { name: true, stock: true, salePrice: true, isDeleted: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSecondhandById(shopId: string, id: string) {
  const record = await prisma.secondhandRecord.findFirst({
    where: { id, shopId },
    include: {
      product: true,
      sales: {
        select: {
          invoiceNo: true, totalAmount: true,
          createdAt: true, customerName: true,
        },
      },
    },
  });
  if (!record) throw new Error('Secondhand record not found');
  return record;
}

export async function createSecondhandRecord(
  shopId: string,
  data: CreateSecondhandInput,
  io: Server
) {
  // Validate IMEI uniqueness within this shop if provided
  if (data.imei) {
    const existing = await prisma.secondhandRecord.findFirst({
      where: { shopId, imei: data.imei },
    });
    if (existing) throw new Error('A secondhand record with this IMEI already exists');
  }

  validatePaymentSplit(data.paymentMethod, data.purchasePrice, data.cashAmount, data.accountId, data.accountAmount);

  // Use a transaction: create a Product entry AND a SecondhandRecord together
  // This way the phone appears in inventory AND has full seller KYC attached
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create a Product for inventory tracking
    const product = await tx.product.create({
      data: {
        shopId,
        name:          data.mobileName,
        brand:         data.brand,
        category:      data.category?.trim() || 'phone',
        condition:     'used',
        imei:          data.imei ?? null,
        purchasePrice: data.purchasePrice,
        salePrice:     data.purchasePrice, // owner sets sale price later
        stock:         1,                  // one unit by definition
        isSecondhand:  true,
        storage:       data.storage ?? null,
        color:         data.color   ?? null,
        ram:           data.ram     ?? null,
      },
    });

    // 2. Create the SecondhandRecord with seller KYC
    const record = await tx.secondhandRecord.create({
      data: {
        shopId,
        productId:     product.id,
        mobileName:    data.mobileName,
        brand:         data.brand,
        imei:          data.imei ?? null,
        sellerName:    data.sellerName,
        sellerCnic:    data.sellerCnic,
        sellerPhone:   data.sellerPhone,
        purchasePrice: data.purchasePrice,
        notes:         data.notes ?? null,
        sellerPhotoUrl: data.sellerPhotoUrl ?? null,
        cnicPhotoUrl:   data.cnicPhotoUrl   ?? null,
        isSold:        false,
        paymentMethod: data.paymentMethod,
        cashAmount:    data.cashAmount    ?? null,
        accountId:     data.accountId     ?? null,
        accountAmount: data.accountAmount ?? null,
      },
    });

    return { product, record };
  });

  // Ledger posting after the transaction commits — same reasoning as
  // sales/purchases.service.ts (postJournalEntry can't participate in
  // prisma.$transaction; a posting failure must never undo a purchase that
  // already succeeded).
  try {
    const cogsAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.COGS);
    const creditLines = await buildCashAccountLines(shopId, {
      paymentMethod: data.paymentMethod,
      cashAmount: data.cashAmount,
      accountId: data.accountId,
      accountAmount: data.accountAmount,
      amount: data.purchasePrice,
      description: `Secondhand: ${data.mobileName}`,
      side: 'credit',
    });
    // userId isn't part of CreateSecondhandInput — resolve the recording
    // user the same way notification helpers elsewhere fall back when one
    // isn't threaded through: the shop's admin. Acceptable here since this
    // is a system-sourced entry, not a manually-authored one.
    const admin = await prisma.user.findFirst({ where: { shopId, role: 'admin' } });
    if (admin) {
      const entry = await postJournalEntry(shopId, admin.id, {
        memo: `Secondhand purchase: ${data.mobileName}`,
        sourceModule: 'SECONDHAND',
        sourceId: result.record.id,
        lines: [
          { accountId: cogsAccountId, debit: data.purchasePrice, description: data.mobileName },
          ...creditLines,
        ],
      });
      await prisma.secondhandRecord.update({ where: { id: result.record.id }, data: { journalEntryId: entry.id } });
      result.record.journalEntryId = entry.id; // keep the returned/emitted object in sync
    }
  } catch (err: any) {
    console.error('[Secondhand] ledger posting failed for', result.record.id, err?.message);
  }

  const room = `shop:${shopId}`;
  io.to(room).emit(EVENTS.SECONDHAND_CREATED, {
    id:         result.record.id,
    mobileName: data.mobileName,
    brand:      data.brand,
  });
  io.to(room).emit(EVENTS.INVENTORY_UPDATED, {
    productId: result.product.id,
    stock:     1,
  });
  io.to(room).emit(EVENTS.DASHBOARD_REFRESH, {});

  return result.record;
}

export async function updateSecondhandRecord(
  shopId: string,
  id: string,
  data: { notes?: string; salePrice?: number }
) {
  const record = await prisma.secondhandRecord.findFirst({ where: { id, shopId } });
  if (!record) throw new Error('Record not found');

  // Allow updating notes and the sale price on the linked product
  const updates: any = {};
  if (data.notes !== undefined) updates.notes = data.notes;

  const record_updated = await prisma.secondhandRecord.update({
    where: { id },
    data:  updates,
  });

  // If sale price is being updated, update the linked product too
  if (data.salePrice !== undefined) {
    await prisma.product.update({
      where: { id: record.productId },
      data:  { salePrice: data.salePrice },
    });
  }

  return record_updated;
}
