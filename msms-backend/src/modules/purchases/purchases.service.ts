import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';
import {
  postJournalEntry, buildCashAccountLines, validatePaymentSplit,
  getSystemAccountId, SYSTEM_ACCOUNT_CODES,
} from '../accounting/accounting.service';

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
  // Cash/Account ledger wiring — only meaningful (and required) for CASH
  // purchases; CREDIT purchases post an Accounts Payable accrual instead.
  paymentMethod?: string; // "CASH" | "ACCOUNT" | "SPLIT"
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
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

  const isCredit = data.paymentType === 'CREDIT';
  const total = data.quantity * data.purchasePrice;
  if (!isCredit) {
    // CASH purchase — money actually leaves now, so Cash/Account/Split is
    // required. CREDIT purchases post an Accounts Payable accrual instead;
    // no cash moves until the balance is settled via supplierLedger.
    validatePaymentSplit(data.paymentMethod, total, data.cashAmount, data.accountId, data.accountAmount);
  }

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
        paymentType:    isCredit ? 'CREDIT' : 'CASH',
        paymentDueDate: isCredit && data.paymentDueDate
          ? new Date(data.paymentDueDate)
          : null,
        branchId: data.branchId ?? null,
        paymentMethod: !isCredit ? data.paymentMethod : null,
        cashAmount:    !isCredit ? data.cashAmount    ?? null : null,
        accountId:     !isCredit ? data.accountId     ?? null : null,
        accountAmount: !isCredit ? data.accountAmount ?? null : null,
      },
    });

    const updated = await tx.product.update({
      where: { id: data.productId },
      data:  { stock: { increment: data.quantity } },
    });

    return { purchase, updatedStock: updated.stock };
  });

  // Ledger posting after the stock-critical transaction commits — same
  // reasoning as sales.service.ts:createSale (postJournalEntry can't
  // participate in prisma.$transaction; a posting failure must never undo a
  // purchase that already succeeded and already incremented stock).
  try {
    const cogsAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.COGS);
    let creditLines;
    if (isCredit) {
      const apAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.ACCOUNTS_PAYABLE);
      creditLines = [{ accountId: apAccountId, credit: total, description: `Purchase ${result.purchase.id}` }];
    } else {
      creditLines = await buildCashAccountLines(shopId, {
        paymentMethod: data.paymentMethod!,
        cashAmount: data.cashAmount,
        accountId: data.accountId,
        accountAmount: data.accountAmount,
        amount: total,
        description: `Purchase ${result.purchase.id}`,
        side: 'credit',
      });
    }
    const entry = await postJournalEntry(shopId, data.userId, {
      memo: isCredit ? `Credit purchase (${product.name})` : `Purchase (${product.name})`,
      sourceModule: 'PURCHASE',
      sourceId: result.purchase.id,
      lines: [
        { accountId: cogsAccountId, debit: total, description: product.name },
        ...creditLines,
      ],
    });
    await prisma.purchase.update({ where: { id: result.purchase.id }, data: { journalEntryId: entry.id } });
    result.purchase.journalEntryId = entry.id; // keep the returned/emitted object in sync
  } catch (err: any) {
    console.error('[Purchase] ledger posting failed for', result.purchase.id, err?.message);
  }

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
