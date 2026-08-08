import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { createPurchase } from '../purchases/purchases.service';
import {
  postJournalEntry, buildCashAccountLines, validatePaymentSplit,
  getSystemAccountId, SYSTEM_ACCOUNT_CODES,
} from '../accounting/accounting.service';

const TOLERANCE = 0.01;

// ── Supplier Ledger ──────────────────────────────────────────────────────────
// A subsidiary ledger over the EXISTING Purchase/SupplierPayment data — a
// purchase is "on credit" exactly when paymentType === 'CREDIT' (the field
// added alongside this module, defaulted to 'CASH' for every existing row).
// No new Supplier master table: suppliers are grouped by the supplierPhone
// Purchase already carries.

function purchaseTotal(p: { quantity: number; purchasePrice: number }) {
  return p.quantity * p.purchasePrice;
}

export async function listSuppliers(shopId: string) {
  const purchases = await prisma.purchase.findMany({
    where: { shopId, paymentType: 'CREDIT', supplierPhone: { not: null } },
    select: {
      id: true, supplierName: true, supplierPhone: true,
      quantity: true, purchasePrice: true, paymentDueDate: true,
    },
  });
  const purchaseIds = purchases.map((p) => p.id);

  const payments = await prisma.supplierPayment.findMany({
    where: { purchaseId: { in: purchaseIds } },
    select: { purchaseId: true, amount: true },
  });
  const paidByPurchase = new Map<string, number>();
  for (const p of payments) {
    paidByPurchase.set(p.purchaseId, (paidByPurchase.get(p.purchaseId) ?? 0) + p.amount);
  }

  const byPhone = new Map<string, {
    supplierPhone: string; supplierName: string | null;
    purchasesCount: number; totalAmount: number; totalPaid: number;
  }>();

  for (const purchase of purchases) {
    const phone = purchase.supplierPhone!;
    const total = purchaseTotal(purchase);
    const paid  = paidByPurchase.get(purchase.id) ?? 0;
    const existing = byPhone.get(phone);
    if (existing) {
      existing.purchasesCount += 1;
      existing.totalAmount    += total;
      existing.totalPaid      += paid;
      if (purchase.supplierName) existing.supplierName = purchase.supplierName;
    } else {
      byPhone.set(phone, {
        supplierPhone:  phone,
        supplierName:   purchase.supplierName,
        purchasesCount: 1,
        totalAmount:    total,
        totalPaid:      paid,
      });
    }
  }

  return [...byPhone.values()]
    .map((s) => ({ ...s, outstanding: s.totalAmount - s.totalPaid }))
    .filter((s) => s.outstanding > TOLERANCE)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export async function getSupplierStatement(shopId: string, phone: string) {
  const purchases = await prisma.purchase.findMany({
    where: { shopId, supplierPhone: phone },
    orderBy: { createdAt: 'asc' },
    include: { product: { select: { name: true, brand: true } } },
  });
  const purchaseIds = purchases.map((p) => p.id);

  const payments = await prisma.supplierPayment.findMany({
    where: { purchaseId: { in: purchaseIds } },
    orderBy: { createdAt: 'asc' },
  });

  const creditPurchases = purchases.filter((p) => p.paymentType === 'CREDIT');
  const totalInvoiced = creditPurchases.reduce((sum, p) => sum + purchaseTotal(p), 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  type Txn = { type: 'PURCHASE' | 'PAYMENT'; date: Date; amount: number; ref: string; purchaseId: string };
  const transactions: Txn[] = [
    ...creditPurchases.map((p) => ({
      type: 'PURCHASE' as const, date: p.createdAt, amount: purchaseTotal(p),
      ref: p.product.name, purchaseId: p.id,
    })),
    ...payments.map((p) => ({
      type: 'PAYMENT' as const, date: p.createdAt, amount: -p.amount,
      ref: p.method, purchaseId: p.purchaseId,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  const ledger = transactions.map((t) => {
    balance += t.amount;
    return { ...t, balance };
  });

  return {
    supplierPhone: phone,
    purchases,
    payments,
    ledger,
    totalInvoiced,
    totalPaid,
    outstanding: totalInvoiced - totalPaid,
  };
}

export async function getAgingReport(shopId: string) {
  const purchases = await prisma.purchase.findMany({
    where: { shopId, paymentType: 'CREDIT' },
    include: { product: { select: { name: true } } },
  });
  const purchaseIds = purchases.map((p) => p.id);

  const payments = await prisma.supplierPayment.findMany({
    where: { purchaseId: { in: purchaseIds } },
    select: { purchaseId: true, amount: true },
  });
  const paidByPurchase = new Map<string, number>();
  for (const p of payments) {
    paidByPurchase.set(p.purchaseId, (paidByPurchase.get(p.purchaseId) ?? 0) + p.amount);
  }

  const now = new Date();
  const buckets = [
    { label: 'Current',    min: -Infinity, max: 0,        total: 0, count: 0 },
    { label: '1-30 days',  min: 1,         max: 30,       total: 0, count: 0 },
    { label: '31-60 days', min: 31,        max: 60,       total: 0, count: 0 },
    { label: '61-90 days', min: 61,        max: 90,       total: 0, count: 0 },
    { label: '90+ days',   min: 91,        max: Infinity, total: 0, count: 0 },
  ];

  const entries: any[] = [];

  for (const purchase of purchases) {
    const paid = paidByPurchase.get(purchase.id) ?? 0;
    const outstanding = purchaseTotal(purchase) - paid;
    if (outstanding <= TOLERANCE) continue;

    const daysOverdue = purchase.paymentDueDate
      ? Math.floor((now.getTime() - purchase.paymentDueDate.getTime()) / 86400000)
      : 0;

    const bucket = buckets.find((b) => daysOverdue >= b.min && daysOverdue <= b.max)!;
    bucket.total += outstanding;
    bucket.count += 1;

    entries.push({
      purchaseId: purchase.id, productName: purchase.product.name,
      supplierName: purchase.supplierName, supplierPhone: purchase.supplierPhone,
      outstanding, daysOverdue, paymentDueDate: purchase.paymentDueDate,
    });
  }

  return {
    buckets: buckets.map(({ label, total, count }) => ({ label, total, count })),
    entries: entries.sort((a, b) => b.daysOverdue - a.daysOverdue),
  };
}

interface RecordPaymentInput {
  purchaseId: string;
  amount:     number;
  method?:    string; // "CASH" | "ACCOUNT" | "SPLIT" — Cash/Account ledger wiring
  note?:      string;
  userId:     string;
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}

export async function recordPayment(shopId: string, data: RecordPaymentInput) {
  const purchase = await prisma.purchase.findFirst({ where: { id: data.purchaseId, shopId } });
  if (!purchase) throw new Error('Purchase not found');
  if (purchase.paymentType !== 'CREDIT') throw new Error('This purchase is not on credit');
  if (!data.amount || data.amount <= 0) throw new Error('amount must be greater than 0');

  const existingPaid = await prisma.supplierPayment.aggregate({
    where: { purchaseId: data.purchaseId },
    _sum: { amount: true },
  });
  const alreadyPaid = existingPaid._sum.amount ?? 0;
  const outstanding = purchaseTotal(purchase) - alreadyPaid;

  if (data.amount > outstanding + TOLERANCE) {
    throw new Error(`Payment of ${data.amount.toFixed(2)} exceeds outstanding balance of ${outstanding.toFixed(2)}`);
  }

  // method is optional here (unlike Sale/Purchase creation) — this endpoint
  // predates the Cash/Account ledger wiring and is still reachable without
  // it; only validate/post to the ledger when the caller opts in.
  if (data.method) {
    validatePaymentSplit(data.method, data.amount, data.cashAmount, data.accountId, data.accountAmount);
  }

  const payment = await prisma.supplierPayment.create({
    data: {
      purchaseId: data.purchaseId,
      shopId,
      amount:     data.amount,
      method:     data.method ?? 'CASH',
      note:       data.note,
      userId:     data.userId,
      cashAmount:    data.cashAmount    ?? null,
      accountId:     data.accountId     ?? null,
      accountAmount: data.accountAmount ?? null,
    },
  });

  // Settling a credit purchase clears part of the Accounts Payable liability
  // that was accrued when the purchase itself was recorded (see
  // purchases.service.ts:createPurchase). Best-effort/logged; skipped
  // entirely if no method was given.
  if (data.method) {
    try {
      const apAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.ACCOUNTS_PAYABLE);
      const creditLines = await buildCashAccountLines(shopId, {
        paymentMethod: data.method,
        cashAmount: data.cashAmount,
        accountId: data.accountId,
        accountAmount: data.accountAmount,
        amount: data.amount,
        description: `Payment for purchase ${data.purchaseId}`,
        side: 'credit',
      });
      const entry = await postJournalEntry(shopId, data.userId, {
        memo: `Supplier payment (${purchase.supplierName ?? 'supplier'})`,
        sourceModule: 'SUPPLIER_PAYMENT',
        sourceId: payment.id,
        lines: [
          { accountId: apAccountId, debit: data.amount, description: `Payment for purchase ${data.purchaseId}` },
          ...creditLines,
        ],
      });
      await prisma.supplierPayment.update({ where: { id: payment.id }, data: { journalEntryId: entry.id } });
      payment.journalEntryId = entry.id; // keep the returned object in sync
    } catch (err: any) {
      console.error('[SupplierPayment] ledger posting failed for', payment.id, err?.message);
    }
  }

  return { payment, outstanding: Math.max(outstanding - data.amount, 0) };
}

interface CreateCreditPurchaseInput {
  productId:       string;
  quantity:        number;
  purchasePrice:   number;
  supplierName?:   string;
  supplierPhone?:  string;
  paymentDueDate?: string | Date;
  userId:          string;
}

// Thin wrapper around the existing purchases.service.createPurchase — no
// duplicated stock-increment transaction logic, just forces paymentType.
export async function createCreditPurchase(shopId: string, data: CreateCreditPurchaseInput, io: Server) {
  return createPurchase(
    shopId,
    {
      productId:      data.productId,
      quantity:       data.quantity,
      purchasePrice:  data.purchasePrice,
      supplierName:   data.supplierName,
      supplierPhone:  data.supplierPhone,
      paymentType:    'CREDIT',
      paymentDueDate: data.paymentDueDate,
      userId:         data.userId,
    },
    io
  );
}
