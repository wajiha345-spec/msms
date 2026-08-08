import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';
import { markInstallmentPaid as markSaleFullyPaid } from './sales.service';
import {
  postJournalEntry, buildCashAccountLines, validatePaymentSplit,
  getSystemAccountId, SYSTEM_ACCOUNT_CODES,
} from '../accounting/accounting.service';

// ── Sale Installment schedule (1st/2nd/3rd) ─────────────────────────────────
// See prisma/schema.prisma's SaleInstallment model comment for the full
// design rationale — this module is the "Due Installments" screen's backend:
// a flat, always-visible (PENDING and PAID) list of every installment, plus
// the structured mark-paid action.

export async function listDueInstallments(shopId: string) {
  return prisma.saleInstallment.findMany({
    where: { sale: { shopId } },
    include: {
      sale: { select: { invoiceNo: true, customerName: true, customerPhone: true } },
    },
    orderBy: { dueDate: 'asc' },
  });
}

interface MarkPaidInput {
  userId:        string;
  paymentMethod: string; // "CASH" | "ACCOUNT" | "SPLIT"
  cashAmount?:   number;
  accountId?:    string;
  accountAmount?: number;
}

export async function markInstallmentPaid(shopId: string, installmentId: string, data: MarkPaidInput, io: Server) {
  const installment = await prisma.saleInstallment.findFirst({
    where: { id: installmentId, sale: { shopId } },
    include: { sale: true },
  });
  if (!installment) throw new Error('Installment not found');
  if (installment.status === 'PAID') throw new Error('This installment is already marked paid');

  validatePaymentSplit(data.paymentMethod, installment.amount, data.cashAmount, data.accountId, data.accountAmount);

  // Mirrors customerLedger.service.ts:recordPayment's SalePayment write, so
  // the outstanding-balance math that screen (and the aging report) already
  // does keeps working for free — this is just a second, structured way to
  // pay down the same underlying sale.
  await prisma.salePayment.create({
    data: {
      saleId: installment.saleId,
      shopId,
      amount: installment.amount,
      method: data.paymentMethod,
      note:   `Installment #${installment.installmentNumber}`,
      userId: data.userId,
    },
  });

  const updated = await prisma.saleInstallment.update({
    where: { id: installmentId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentMethod: data.paymentMethod,
      cashAmount:    data.cashAmount    ?? null,
      accountId:     data.accountId     ?? null,
      accountAmount: data.accountAmount ?? null,
    },
  });

  // If every installment for this sale is now paid, flip the sale-level flag
  // — same function customerLedger.service.ts:recordPayment already reuses,
  // so Dashboard/CustomerStatement/anything else reading installmentPaid
  // stays correct regardless of which of the two payment paths was used.
  const remaining = await prisma.saleInstallment.count({
    where: { saleId: installment.saleId, status: 'PENDING' },
  });
  if (remaining === 0 && !installment.sale.installmentPaid) {
    await markSaleFullyPaid(shopId, installment.saleId, io);
  }

  // Ledger posting after the row is committed — best-effort/logged, same
  // reasoning as sales.service.ts:createSale (a posting failure must never
  // undo a payment that's already recorded).
  try {
    const arAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
    const debitLines = await buildCashAccountLines(shopId, {
      paymentMethod: data.paymentMethod,
      cashAmount: data.cashAmount,
      accountId: data.accountId,
      accountAmount: data.accountAmount,
      amount: installment.amount,
      description: `${installment.sale.invoiceNo} — installment #${installment.installmentNumber}`,
      side: 'debit',
    });
    const entry = await postJournalEntry(shopId, data.userId, {
      memo: `Installment #${installment.installmentNumber} paid (${installment.sale.customerName ?? installment.sale.invoiceNo})`,
      sourceModule: 'SALE_INSTALLMENT',
      sourceId: installment.id,
      lines: [
        ...debitLines,
        { accountId: arAccountId, credit: installment.amount, description: installment.sale.invoiceNo },
      ],
    });
    await prisma.saleInstallment.update({ where: { id: installmentId }, data: { journalEntryId: entry.id } });
    updated.journalEntryId = entry.id; // keep the returned/emitted object in sync
  } catch (err: any) {
    console.error('[SaleInstallment] ledger posting failed for', installmentId, err?.message);
  }

  io.to(`shop:${shopId}`).emit(EVENTS.DASHBOARD_REFRESH, {});

  return updated;
}
