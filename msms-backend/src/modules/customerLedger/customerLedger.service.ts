import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { markInstallmentPaid } from '../sales/sales.service';
import {
  postJournalEntry, buildCashAccountLines, validatePaymentSplit,
  getSystemAccountId, SYSTEM_ACCOUNT_CODES,
} from '../accounting/accounting.service';

const TOLERANCE = 0.01;

// ── Customer Ledger ──────────────────────────────────────────────────────────
// A subsidiary ledger over the EXISTING Sale/SalePayment data — a sale is
// "on credit" exactly when paymentType === 'INSTALLMENT' (a field that
// already existed before Business Management). No new Customer master
// table: customers are grouped by the customerPhone Sale already carries.

export async function listCustomers(shopId: string) {
  const sales = await prisma.sale.findMany({
    where: { shopId, paymentType: 'INSTALLMENT', customerPhone: { not: null } },
    select: {
      id: true, customerName: true, customerPhone: true,
      totalAmount: true, installmentDueDate: true, installmentPaid: true,
    },
  });
  const saleIds = sales.map((s) => s.id);

  const payments = await prisma.salePayment.findMany({
    where: { saleId: { in: saleIds } },
    select: { saleId: true, amount: true },
  });
  const paidBySale = new Map<string, number>();
  for (const p of payments) {
    paidBySale.set(p.saleId, (paidBySale.get(p.saleId) ?? 0) + p.amount);
  }

  const byPhone = new Map<string, {
    customerPhone: string; customerName: string | null;
    salesCount: number; totalAmount: number; totalPaid: number;
  }>();

  for (const sale of sales) {
    const phone = sale.customerPhone!;
    const paid = paidBySale.get(sale.id) ?? 0;
    const existing = byPhone.get(phone);
    if (existing) {
      existing.salesCount  += 1;
      existing.totalAmount += sale.totalAmount;
      existing.totalPaid   += paid;
      if (sale.customerName) existing.customerName = sale.customerName;
    } else {
      byPhone.set(phone, {
        customerPhone: phone,
        customerName:  sale.customerName,
        salesCount:    1,
        totalAmount:   sale.totalAmount,
        totalPaid:     paid,
      });
    }
  }

  return [...byPhone.values()]
    .map((c) => ({ ...c, outstanding: c.totalAmount - c.totalPaid }))
    .filter((c) => c.outstanding > TOLERANCE)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export async function getCustomerStatement(shopId: string, phone: string) {
  const sales = await prisma.sale.findMany({
    where: { shopId, customerPhone: phone },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, invoiceNo: true, totalAmount: true, paymentType: true,
      installmentDueDate: true, installmentPaid: true, createdAt: true,
    },
  });
  const saleIds = sales.map((s) => s.id);

  const payments = await prisma.salePayment.findMany({
    where: { saleId: { in: saleIds } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, saleId: true, amount: true, method: true, note: true, createdAt: true,
    },
  });

  const totalInvoiced = sales
    .filter((s) => s.paymentType === 'INSTALLMENT')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  type Txn = { type: 'SALE' | 'PAYMENT'; date: Date; amount: number; ref: string; saleId: string };
  const transactions: Txn[] = [
    ...sales
      .filter((s) => s.paymentType === 'INSTALLMENT')
      .map((s) => ({ type: 'SALE' as const, date: s.createdAt, amount: s.totalAmount, ref: s.invoiceNo, saleId: s.id })),
    ...payments.map((p) => ({
      type: 'PAYMENT' as const, date: p.createdAt, amount: -p.amount,
      ref: p.method, saleId: p.saleId,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  const ledger = transactions.map((t) => {
    balance += t.amount;
    return { ...t, balance };
  });

  return {
    customerPhone: phone,
    sales,
    payments,
    ledger,
    totalInvoiced,
    totalPaid,
    outstanding: totalInvoiced - totalPaid,
  };
}

export async function getAgingReport(shopId: string) {
  const sales = await prisma.sale.findMany({
    where: { shopId, paymentType: 'INSTALLMENT' },
    select: {
      id: true, invoiceNo: true, customerName: true, customerPhone: true,
      totalAmount: true, installmentDueDate: true,
    },
  });
  const saleIds = sales.map((s) => s.id);

  const payments = await prisma.salePayment.findMany({
    where: { saleId: { in: saleIds } },
    select: { saleId: true, amount: true },
  });
  const paidBySale = new Map<string, number>();
  for (const p of payments) {
    paidBySale.set(p.saleId, (paidBySale.get(p.saleId) ?? 0) + p.amount);
  }

  const now = new Date();
  const buckets = [
    { label: 'Current',   min: -Infinity, max: 0,        total: 0, count: 0 },
    { label: '1-30 days', min: 1,         max: 30,       total: 0, count: 0 },
    { label: '31-60 days',min: 31,        max: 60,       total: 0, count: 0 },
    { label: '61-90 days',min: 61,        max: 90,       total: 0, count: 0 },
    { label: '90+ days',  min: 91,        max: Infinity, total: 0, count: 0 },
  ];

  const entries: any[] = [];

  for (const sale of sales) {
    const paid = paidBySale.get(sale.id) ?? 0;
    const outstanding = sale.totalAmount - paid;
    if (outstanding <= TOLERANCE) continue;

    const daysOverdue = sale.installmentDueDate
      ? Math.floor((now.getTime() - sale.installmentDueDate.getTime()) / 86400000)
      : 0;

    const bucket = buckets.find((b) => daysOverdue >= b.min && daysOverdue <= b.max)!;
    bucket.total += outstanding;
    bucket.count += 1;

    entries.push({
      saleId: sale.id, invoiceNo: sale.invoiceNo,
      customerName: sale.customerName, customerPhone: sale.customerPhone,
      outstanding, daysOverdue, installmentDueDate: sale.installmentDueDate,
    });
  }

  return {
    buckets: buckets.map(({ label, total, count }) => ({ label, total, count })),
    entries: entries.sort((a, b) => b.daysOverdue - a.daysOverdue),
  };
}

interface RecordPaymentInput {
  saleId:  string;
  amount:  number;
  method?: string; // "CASH" | "ACCOUNT" | "SPLIT" — Cash/Account ledger wiring
  note?:   string;
  userId:  string;
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}

export async function recordPayment(shopId: string, data: RecordPaymentInput, io: Server) {
  const sale = await prisma.sale.findFirst({ where: { id: data.saleId, shopId } });
  if (!sale) throw new Error('Sale not found');
  if (sale.paymentType !== 'INSTALLMENT') throw new Error('This sale is not an installment sale');
  if (!data.amount || data.amount <= 0) throw new Error('amount must be greater than 0');

  const existingPaid = await prisma.salePayment.aggregate({
    where: { saleId: data.saleId },
    _sum: { amount: true },
  });
  const alreadyPaid = existingPaid._sum.amount ?? 0;
  const outstanding = sale.totalAmount - alreadyPaid;

  if (data.amount > outstanding + TOLERANCE) {
    throw new Error(`Payment of ${data.amount.toFixed(2)} exceeds outstanding balance of ${outstanding.toFixed(2)}`);
  }

  // method is optional here (unlike Sale/Purchase creation) — this endpoint
  // predates the Cash/Account ledger wiring and is still reachable without
  // it; only validate/post to the ledger when the caller opts in.
  if (data.method) {
    validatePaymentSplit(data.method, data.amount, data.cashAmount, data.accountId, data.accountAmount);
  }

  const payment = await prisma.salePayment.create({
    data: {
      saleId:  data.saleId,
      shopId,
      amount:  data.amount,
      method:  data.method ?? 'CASH',
      note:    data.note,
      userId:  data.userId,
    },
  });

  // This free-form payment settles part of the Accounts Receivable accrued
  // when the installment sale was recorded (see sales.service.ts:createSale)
  // — same Debit Cash/Account / Credit AR treatment as
  // saleInstallments.service.ts:markInstallmentPaid uses for the structured
  // 1st/2nd/3rd flow, since a shop owner can use either path to pay down the
  // same sale. Best-effort/logged; skipped entirely if no method was given.
  if (data.method) {
    try {
      const arAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
      const debitLines = await buildCashAccountLines(shopId, {
        paymentMethod: data.method,
        cashAmount: data.cashAmount,
        accountId: data.accountId,
        accountAmount: data.accountAmount,
        amount: data.amount,
        description: `Payment for sale ${data.saleId}`,
        side: 'debit',
      });
      await postJournalEntry(shopId, data.userId, {
        memo: `Customer payment (${sale.customerName ?? sale.invoiceNo})`,
        sourceModule: 'SALE_PAYMENT',
        sourceId: payment.id,
        lines: [
          ...debitLines,
          { accountId: arAccountId, credit: data.amount, description: `Payment for sale ${data.saleId}` },
        ],
      });
    } catch (err: any) {
      console.error('[SalePayment] ledger posting failed for', payment.id, err?.message);
    }
  }

  const newOutstanding = outstanding - data.amount;
  if (newOutstanding <= TOLERANCE && !sale.installmentPaid) {
    // Reuse the existing sales module function — same one the app already
    // uses to mark a sale settled, so Dashboard's installment alerts and
    // any other existing consumer of installmentPaid stay correct.
    await markInstallmentPaid(shopId, data.saleId, io);
  }

  return { payment, outstanding: Math.max(newOutstanding, 0) };
}
