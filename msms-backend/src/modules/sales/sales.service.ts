import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';
import { notifyLowStock } from '../notifications/notifications.service';
import {
  postJournalEntry, buildCashAccountLines, validatePaymentSplit,
  getSystemAccountId, SYSTEM_ACCOUNT_CODES,
} from '../accounting/accounting.service';

interface GuarantorInput {
  name:  string;
  cnic:  string;
  phone: string;
}

interface CreateSaleInput {
  productId:     string;
  quantity:      number;
  salePrice:     number;
  discount?:     number;
  customerName?: string;
  customerPhone?: string;
  customerCnic?: string;
  imei?:         string;
  secondhandId?: string;
  userId:        string;
  paymentType:   string; // "CASH" | "INSTALLMENT"
  installmentDueDate?: Date;
  guarantors?:   GuarantorInput[];
  branchId?:     string; // optional — unset means "Main Branch" (see branches.service.ts)
  // Cash/Account ledger wiring — only meaningful (and required) for CASH
  // sales; INSTALLMENT sales post an Accounts Receivable accrual instead,
  // no payment picker at creation time.
  paymentMethod?: string; // "CASH" | "ACCOUNT" | "SPLIT"
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Splits totalAmount into 3 as-equal-as-possible parts that sum back exactly
// (the last part absorbs any rounding remainder).
function splitIntoThirds(total: number): [number, number, number] {
  const part = Math.round((total / 3) * 100) / 100;
  const last = Math.round((total - part * 2) * 100) / 100;
  return [part, part, last];
}

// Fixed 3-equal-installments schedule, anchored on installment #1's due date
// (already computed by the caller as sale date + 1 month, same value stored
// on Sale.installmentDueDate — anchoring here too, rather than recomputing
// "+1 month" independently, keeps the two in sync to the millisecond).
// Shared by createSale() and createHistoricalSale() so every INSTALLMENT
// sale (new or imported) is queryable the same way by notifications.service.ts
// and DueInstallmentsScreen.
function buildInstallmentSchedule(totalAmount: number, installment1DueDate: Date) {
  const [a1, a2, a3] = splitIntoThirds(totalAmount);
  return [
    { installmentNumber: 1, amount: a1, dueDate: installment1DueDate },
    { installmentNumber: 2, amount: a2, dueDate: addMonths(installment1DueDate, 1) },
    { installmentNumber: 3, amount: a3, dueDate: addMonths(installment1DueDate, 2) },
  ];
}

// Build invoice number: INV-20240118-0001 (unique per shop, not globally)
async function generateInvoiceNo(shopId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's sales for this shop to get the sequence number
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const count = await prisma.sale.count({
    where: { shopId, createdAt: { gte: startOfDay } },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}

export async function getSales(shopId: string, productId?: string, date?: string) {
  const where: any = { shopId };
  if (productId) where.productId = productId;
  if (date) {
    const d = new Date(date);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end   = new Date(d.setHours(23, 59, 59, 999));
    where.createdAt = { gte: start, lte: end };
  }

  return prisma.sale.findMany({
    where,
    include: {
      product:    { select: { name: true, brand: true } },
      recordedBy: { select: { username: true } },
      guarantors: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSaleById(shopId: string, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, shopId },
    include: {
      product:    true,
      recordedBy: { select: { username: true } },
      secondhand: true,
      guarantors: true,
    },
  });
  if (!sale) throw new Error('Sale not found');
  return sale;
}

export async function createSale(shopId: string, data: CreateSaleInput, io: Server) {
  if (data.quantity <= 0) throw new Error('Quantity must be at least 1');
  if (data.salePrice <= 0) throw new Error('Sale price must be greater than 0');

  const discount = data.discount ?? 0;
  if (discount < 0) throw new Error('Discount cannot be negative');
  if (discount > data.salePrice * data.quantity) {
    throw new Error('Discount cannot exceed the sale total');
  }

  if (data.paymentType === 'INSTALLMENT') {
    if (!data.customerName?.trim()) throw new Error('Customer name is required for installment sales');
    if (!data.customerCnic) throw new Error('Customer CNIC is required for installment sales');
    if (!data.customerPhone) throw new Error('Customer phone is required for installment sales');
    if (!data.installmentDueDate) throw new Error('Installment due date is required');
    if (!data.guarantors || data.guarantors.length !== 3) {
      throw new Error('Exactly 3 guarantors are required for installment sales');
    }
    for (const [i, g] of data.guarantors.entries()) {
      if (!g.name?.trim()) throw new Error(`Guarantor ${i + 1} name is required`);
      if (!g.cnic)  throw new Error(`Guarantor ${i + 1} CNIC is required`);
      if (!g.phone) throw new Error(`Guarantor ${i + 1} phone is required`);
    }
  } else {
    // CASH sale — cash actually changes hands now, so Cash/Account/Split is
    // required. (INSTALLMENT sales post an Accounts Receivable accrual
    // instead; no cash moves until an installment is marked paid.)
    validatePaymentSplit(
      data.paymentMethod,
      data.salePrice * data.quantity - discount,
      data.cashAmount, data.accountId, data.accountAmount
    );
  }

  // --- ATOMIC TRANSACTION ---
  const result = await prisma.$transaction(async (tx) => {

    // 1. Lock and read the product inside the transaction
    //    This prevents two sales from reading the same stock simultaneously
    const product = await tx.product.findFirst({
      where: { id: data.productId, shopId, isDeleted: false },
    });
    if (!product) throw new Error('Product not found');

    // 2. STOCK CHECK — this is the safety gate
    if (product.stock < data.quantity) {
      throw new Error(
        `Not enough stock. Available: ${product.stock}, requested: ${data.quantity}`
      );
    }

    // 3. Calculate financials
    const totalAmount = data.salePrice * data.quantity - discount;
    const profit      = (data.salePrice - product.purchasePrice) * data.quantity - discount;
    const invoiceNo   = await generateInvoiceNo(shopId);

    // 4. Create the sale record
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        productId:     data.productId,
        userId:        data.userId,
        shopId,
        secondhandId:  data.secondhandId ?? null,
        quantity:      data.quantity,
        salePrice:     data.salePrice,
        discount,
        totalAmount,
        profit,
        customerName:  data.customerName  ?? null,
        customerPhone: data.customerPhone ?? null,
        customerCnic:  data.customerCnic  ?? null,
        imei:          data.imei          ?? null,
        branchId:      data.branchId      ?? null,
        paymentType:   data.paymentType,
        installmentDueDate: data.paymentType === 'INSTALLMENT' ? data.installmentDueDate : null,
        guarantors: data.paymentType === 'INSTALLMENT' && data.guarantors
          ? { create: data.guarantors.map((g) => ({
              name:  g.name,
              cnic:  g.cnic,
              phone: g.phone,
            })) }
          : undefined,
        paymentMethod: data.paymentType !== 'INSTALLMENT' ? data.paymentMethod : null,
        cashAmount:    data.paymentType !== 'INSTALLMENT' ? data.cashAmount    ?? null : null,
        accountId:     data.paymentType !== 'INSTALLMENT' ? data.accountId     ?? null : null,
        accountAmount: data.paymentType !== 'INSTALLMENT' ? data.accountAmount ?? null : null,
      },
    });

    // 4b. INSTALLMENT sales get their 1st/2nd/3rd payment schedule right away
    // — same transaction as the Sale/stock write so a schedule never exists
    // without its parent sale (or vice versa).
    if (data.paymentType === 'INSTALLMENT') {
      const schedule = buildInstallmentSchedule(totalAmount, data.installmentDueDate!);
      await tx.saleInstallment.createMany({
        data: schedule.map((s) => ({ saleId: sale.id, ...s })),
      });
    }

    // 5. Deduct stock
    const updated = await tx.product.update({
      where: { id: data.productId },
      data:  { stock: { decrement: data.quantity } },
    });

    // 6. If this was a secondhand phone, mark its record as sold
    if (data.secondhandId) {
      await tx.secondhandRecord.update({
        where: { id: data.secondhandId },
        data:  { isSold: true },
      });
    }

    return {
      sale,
      productName:   product.name,
      updatedStock:  updated.stock,
      reorderPoint:  product.reorderPoint,
    };
  });

  // Ledger posting happens after the stock-critical transaction commits —
  // postJournalEntry() can't participate in prisma.$transaction (it uses the
  // shared prisma client, same as expenses.service.ts/income.service.ts), and
  // a ledger-posting failure must never undo a sale that already succeeded
  // and already deducted stock. Best-effort, logged, never thrown.
  try {
    if (result.sale.paymentType === 'INSTALLMENT') {
      const arAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
      const salesIncomeAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.SALES_INCOME);
      const entry = await postJournalEntry(shopId, data.userId, {
        date: result.sale.createdAt,
        memo: `Installment sale ${result.sale.invoiceNo}`,
        sourceModule: 'SALE',
        sourceId: result.sale.id,
        lines: [
          { accountId: arAccountId, debit: result.sale.totalAmount, description: result.sale.invoiceNo },
          { accountId: salesIncomeAccountId, credit: result.sale.totalAmount, description: result.sale.invoiceNo },
        ],
      });
      await prisma.sale.update({ where: { id: result.sale.id }, data: { journalEntryId: entry.id } });
      result.sale.journalEntryId = entry.id; // keep the returned/emitted object in sync
    } else {
      const debitLines = await buildCashAccountLines(shopId, {
        paymentMethod: data.paymentMethod!,
        cashAmount: data.cashAmount,
        accountId: data.accountId,
        accountAmount: data.accountAmount,
        amount: result.sale.totalAmount,
        description: result.sale.invoiceNo,
        side: 'debit',
      });
      const salesIncomeAccountId = await getSystemAccountId(shopId, SYSTEM_ACCOUNT_CODES.SALES_INCOME);
      const entry = await postJournalEntry(shopId, data.userId, {
        date: result.sale.createdAt,
        memo: `Sale ${result.sale.invoiceNo}`,
        sourceModule: 'SALE',
        sourceId: result.sale.id,
        lines: [
          ...debitLines,
          { accountId: salesIncomeAccountId, credit: result.sale.totalAmount, description: result.sale.invoiceNo },
        ],
      });
      await prisma.sale.update({ where: { id: result.sale.id }, data: { journalEntryId: entry.id } });
      result.sale.journalEntryId = entry.id;
    }
  } catch (err: any) {
    console.error('[Sale] ledger posting failed for', result.sale.id, err?.message);
  }

  // Emit realtime events after commit — scoped to this shop only
  const room = `shop:${shopId}`;
  io.to(room).emit(EVENTS.SALE_CREATED, {
    saleId:      result.sale.id,
    invoiceNo:   result.sale.invoiceNo,
    productName: result.productName,
    totalAmount: result.sale.totalAmount,
    profit:      result.sale.profit,
  });
  io.to(room).emit(EVENTS.INVENTORY_UPDATED, {
    productId: data.productId,
    stock:     result.updatedStock,
  });
  io.to(room).emit(EVENTS.DASHBOARD_REFRESH, {});

  // Fire-and-forget — never let a notification failure surface as a sale
  // failure. Caller-agnostic: fires the same way whether this sale came
  // from the manual New Sale screen, a converted quotation, or a fulfilled
  // sales order.
  notifyLowStock(shopId, {
    productId:    data.productId,
    productName:  result.productName,
    stock:        result.updatedStock,
    reorderPoint: result.reorderPoint,
  }).catch(() => {});

  return result.sale;
}

interface HistoricalSaleInput {
  date?:          string;
  productName:    string;
  brand?:         string;
  quantity:       number;
  salePrice:      number;
  purchasePrice?: number;
  customerName?:  string;
  customerPhone?: string;
  customerCnic?:  string;
  paymentType:    string; // "CASH" | "INSTALLMENT"
  installmentDueDate?: string;
  installmentPaid?:    boolean;
}

// Historical imports often reference products that were sold before MSMS
// started tracking inventory (or were discontinued). Match by name first
// within the importing shop; if nothing matches, create a zero-stock
// placeholder so the sale still has somewhere to point — it must NOT
// affect real inventory counts.
async function findOrCreateHistoricalProduct(shopId: string, name: string, brand: string, purchasePrice: number, salePrice: number) {
  const existing = await prisma.product.findFirst({
    where: { shopId, name: { equals: name, mode: 'insensitive' }, isDeleted: false },
  });
  if (existing) return existing;

  return prisma.product.create({
    data: { shopId, name, brand: brand || 'Unknown', purchasePrice, salePrice, stock: 0 },
  });
}

let historySeq = 0;

// Creates a single backfilled sale from an imported CSV row. Unlike
// createSale(), this does NOT check or decrement product stock — the item
// was already sold in the shop's previous system before MSMS existed, so
// today's stock count must stay untouched.
export async function createHistoricalSale(shopId: string, data: HistoricalSaleInput, userId: string) {
  if (!data.productName) throw new Error('Product name is required');
  if (!data.quantity || data.quantity <= 0) throw new Error('Quantity must be at least 1');
  if (!data.salePrice || data.salePrice <= 0) throw new Error('Sale price must be greater than 0');
  if (data.paymentType === 'INSTALLMENT' && !data.installmentDueDate) {
    throw new Error('Due date is required for installment sales');
  }

  const purchasePrice = data.purchasePrice ?? data.salePrice;
  const product = await findOrCreateHistoricalProduct(
    shopId, data.productName, data.brand || '', purchasePrice, data.salePrice
  );

  const totalAmount = data.salePrice * data.quantity;
  const profit      = (data.salePrice - purchasePrice) * data.quantity;
  const invoiceNo   = `HIST-${Date.now()}-${historySeq++}`;

  const sale = await prisma.sale.create({
    data: {
      invoiceNo,
      productId:     product.id,
      userId,
      shopId,
      quantity:      data.quantity,
      salePrice:     data.salePrice,
      totalAmount,
      profit,
      customerName:  data.customerName  || null,
      customerPhone: data.customerPhone || null,
      customerCnic:  data.customerCnic  || null,
      paymentType:   data.paymentType === 'INSTALLMENT' ? 'INSTALLMENT' : 'CASH',
      installmentDueDate: data.paymentType === 'INSTALLMENT' ? new Date(data.installmentDueDate!) : null,
      installmentPaid:    !!data.installmentPaid,
      createdAt:     data.date ? new Date(data.date) : undefined,
    },
  });

  // Still-unpaid imported installment sales get the same 1st/2nd/3rd
  // schedule as any other installment sale, anchored so installment #1's due
  // date matches exactly what the CSV said — otherwise this sale would be
  // invisible to notifications.service.ts/DueInstallmentsScreen (both now
  // read SaleInstallment, not Sale directly).
  if (data.paymentType === 'INSTALLMENT' && !data.installmentPaid) {
    const schedule = buildInstallmentSchedule(totalAmount, new Date(data.installmentDueDate!));
    await prisma.saleInstallment.createMany({
      data: schedule.map((s) => ({ saleId: sale.id, ...s })),
    });
  }

  return sale;
}

export async function markInstallmentPaid(shopId: string, id: string, io: Server) {
  const sale = await prisma.sale.findFirst({ where: { id, shopId } });
  if (!sale) throw new Error('Sale not found');
  if (sale.paymentType !== 'INSTALLMENT') throw new Error('Sale is not an installment sale');

  const updated = await prisma.sale.update({
    where: { id },
    data:  { installmentPaid: true },
  });

  io.to(`shop:${shopId}`).emit(EVENTS.DASHBOARD_REFRESH, {});

  return updated;
}
