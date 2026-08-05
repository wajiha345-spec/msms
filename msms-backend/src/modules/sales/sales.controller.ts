import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { getSales, getSaleById, createSale, markInstallmentPaid, createHistoricalSale } from './sales.service';
import { EVENTS } from '../../socket/events';

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const productId = getQueryValue(req.query.productId);
    const date = getQueryValue(req.query.date);

    const sales = await getSales(req.user!.shopId, productId, date);
    return ok(res, sales);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const sale = await getSaleById(req.user!.shopId, id);
    return ok(res, sale);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const {
      productId,
      quantity,
      salePrice,
      discount,
      customerName,
      customerPhone,
      customerCnic,
      imei,
      secondhandId,
      paymentType,
      installmentDueDate,
      guarantors,
    } = req.body;

    if (!productId) return fail(res, 'productId is required');
    if (!quantity) return fail(res, 'quantity is required');
    if (!salePrice) return fail(res, 'salePrice is required');

    const io = req.app.get('io');

    const sale = await createSale(
      req.user!.shopId,
      {
        productId,
        quantity: Number(quantity),
        salePrice: Number(salePrice),
        discount: discount ? Number(discount) : 0,
        customerName,
        customerPhone,
        customerCnic,
        imei,
        secondhandId,
        userId: req.user!.userId,
        paymentType: paymentType === 'INSTALLMENT' ? 'INSTALLMENT' : 'CASH',
        installmentDueDate: installmentDueDate ? new Date(installmentDueDate) : undefined,
        guarantors: Array.isArray(guarantors) ? guarantors : undefined,
      },
      io
    );

    return ok(res, sale);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── POST /api/sales/import — bulk-create backfilled sales from CSV rows ──
// For clients migrating off a previous app: does not touch product stock,
// since these sales already happened before MSMS started tracking inventory.
export async function importHistory(req: AuthRequest, res: Response) {
  try {
    const rows: any[] = req.body.sales;
    if (!Array.isArray(rows) || rows.length === 0) {
      return fail(res, 'sales array is required', 400);
    }

    const created: string[] = [];
    const errors:  { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const sale = await createHistoricalSale(
          req.user!.shopId,
          {
            date:          r.date,
            productName:   String(r.productName || '').trim(),
            brand:         r.brand ? String(r.brand).trim() : undefined,
            quantity:      Number(r.quantity),
            salePrice:     Number(r.salePrice),
            purchasePrice: r.purchasePrice != null && r.purchasePrice !== '' ? Number(r.purchasePrice) : undefined,
            customerName:  r.customerName  || undefined,
            customerPhone: r.customerPhone || undefined,
            customerCnic:  r.customerCnic  || undefined,
            paymentType:   r.paymentType === 'INSTALLMENT' ? 'INSTALLMENT' : 'CASH',
            installmentDueDate: r.installmentDueDate || undefined,
            installmentPaid:    !!r.installmentPaid,
          },
          req.user!.userId
        );
        created.push(sale.id);
      } catch (e: any) {
        errors.push({ row: i + 2, name: r.productName ?? '—', error: e.message });
      }
    }

    if (created.length > 0) {
      const io = req.app.get('io');
      io.to(`shop:${req.user!.shopId}`).emit(EVENTS.DASHBOARD_REFRESH, {});
    }

    return ok(res, { created: created.length, errors });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function markPaid(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const io = req.app.get('io');
    const sale = await markInstallmentPaid(req.user!.shopId, id, io);
    return ok(res, sale);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
