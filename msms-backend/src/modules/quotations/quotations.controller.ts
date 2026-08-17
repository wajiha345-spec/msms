import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { generateQuotationPdf } from '../../utils/pdf';
import { getSettingsOrDefault } from '../settings/settings.service';
import {
  listQuotations,
  getQuotationById,
  getQuotationForView,
  createQuotation,
  cancelQuotation,
  convertQuotationToSales,
} from './quotations.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function listQuotationsHandler(req: AuthRequest, res: Response) {
  try {
    const quotations = await listQuotations(req.user!.shopId);
    return ok(res, quotations);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getQuotationHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const quotation = await getQuotationById(req.user!.shopId, id);
    return ok(res, quotation);
  } catch (e: any) {
    return fail(res, e.message, 404);
  }
}

export async function createQuotationHandler(req: AuthRequest, res: Response) {
  try {
    const { customerName, customerPhone, validUntil, notes, items } = req.body;
    if (!items) return fail(res, 'items is required');

    const quotation = await createQuotation(req.user!.shopId, {
      customerName, customerPhone, validUntil, notes, items, userId: req.user!.userId,
    });
    return ok(res, quotation);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function cancelQuotationHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const quotation = await cancelQuotation(req.user!.shopId, id);
    return ok(res, quotation);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function convertQuotationHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const io = req.app.get('io');
    const { paymentMethod, cashAmount, accountId, accountAmount } = req.body;
    const sales = await convertQuotationToSales(req.user!.shopId, req.user!.userId, id, io, {
      paymentMethod,
      cashAmount:    cashAmount    !== undefined ? Number(cashAmount)    : undefined,
      accountId,
      accountAmount: accountAmount !== undefined ? Number(accountAmount) : undefined,
    });
    return ok(res, sales);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── Public view/PDF — mirrors invoices.controller.ts:getInvoice exactly ────
// id is the access token, no auth required, no shopId scoping.
export async function getQuotationViewHandler(req: Request, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const quotation = await getQuotationForView(id);
    const settings  = await getSettingsOrDefault(quotation.shopId);

    const pdfBuffer = await generateQuotationPdf({
      quoteNo:       quotation.quoteNo,
      createdAt:     quotation.createdAt,
      validUntil:    quotation.validUntil ?? undefined,
      customerName:  quotation.customerName  ?? undefined,
      customerPhone: quotation.customerPhone ?? undefined,
      items: quotation.items.map((item) => ({
        description: item.description,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice,
        lineTotal:   item.lineTotal,
      })),
      totalAmount: quotation.items.reduce((sum, item) => sum + item.lineTotal, 0),
      createdBy:   quotation.createdBy.username,
      shopName:    quotation.shop.name,
      notes:       quotation.notes ?? undefined,
      shopAddress: settings.shopAddress    ?? undefined,
      shopPhone:   settings.shopPhone      ?? undefined,
      footerNote:  settings.invoiceFooterNote ?? undefined,
    });

    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${quotation.quoteNo}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    }

    const downloadUrl = `${process.env.BACKEND_URL}/api/quotations/${id}/view?download=1`;
    const date = new Date(quotation.createdAt).toLocaleDateString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const totalAmount = quotation.items.reduce((sum, item) => sum + item.lineTotal, 0);

    const row = (label: string, value: string, bold = false) =>
      `<tr><td class="lbl">${label}</td><td class="val${bold ? ' bold' : ''}">${value}</td></tr>`;

    const itemRows = quotation.items.map((item) => `
      <tr>
        <td class="lbl">${item.description} × ${item.quantity}</td>
        <td class="val">Rs ${item.lineTotal.toLocaleString()}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Quotation ${quotation.quoteNo}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         background:#f1f5f9;min-height:100vh;padding:0 0 40px}
    .toolbar{
      background:#1e293b;color:#fff;position:sticky;top:0;z-index:10;
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 18px;gap:12px;box-shadow:0 2px 10px rgba(0,0,0,.35);
    }
    .toolbar-title{font-size:15px;font-weight:700}
    .toolbar-btns{display:flex;gap:8px}
    .btn{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;
         border:none;cursor:pointer;text-decoration:none;display:inline-block;color:#fff}
    .btn-print{background:#2563eb}
    .btn-download{background:#16a34a}
    .card{background:#fff;border-radius:16px;margin:20px 16px;
          box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden}
    .inv-header{background:#6C63FF;color:#fff;padding:24px 20px;text-align:center}
    .inv-title{font-size:22px;font-weight:800;letter-spacing:1px}
    .inv-no{font-size:13px;opacity:.85;margin-top:4px;font-family:monospace}
    .inv-date{font-size:12px;opacity:.7;margin-top:2px}
    table{width:100%;border-collapse:collapse}
    td{padding:11px 16px;border-bottom:1px solid #f1f5f9;font-size:14px}
    .lbl{color:#64748b;width:58%}
    .val{font-weight:500;color:#1e293b;text-align:right}
    .bold{font-weight:700;font-size:15px;color:#6C63FF}
    .section-title{background:#f8fafc;padding:10px 16px;
                   font-size:11px;font-weight:700;color:#94a3b8;
                   letter-spacing:.5px;text-transform:uppercase}
    @media print{
      .toolbar{display:none}
      body{background:#fff;padding:0}
      .card{margin:0;box-shadow:none;border-radius:0}
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">Quotation ${quotation.quoteNo}</div>
    <div class="toolbar-btns">
      <button class="btn btn-print" onclick="window.print()">🖨 Print</button>
      <a class="btn btn-download" href="${downloadUrl}">⬇ Download PDF</a>
    </div>
  </div>

  <div class="card">
    <div class="inv-header">
      <div class="inv-title">QUOTATION</div>
      <div class="inv-no"># ${quotation.quoteNo}</div>
      <div class="inv-date">${date}${quotation.validUntil ? ` · Valid until ${new Date(quotation.validUntil).toLocaleDateString('en-PK')}` : ''}</div>
      ${(settings.shopAddress || settings.shopPhone) ? `<div class="inv-date">${[settings.shopAddress, settings.shopPhone].filter(Boolean).join(' · ')}</div>` : ''}
    </div>

    ${quotation.customerName || quotation.customerPhone ? `
    <div class="section-title">Customer</div>
    <table>
      ${quotation.customerName  ? row('Name',  quotation.customerName)  : ''}
      ${quotation.customerPhone ? row('Phone', quotation.customerPhone) : ''}
    </table>` : ''}

    <div class="section-title">Items</div>
    <table>
      ${itemRows}
      ${row('Total', `Rs ${totalAmount.toLocaleString()}`, true)}
    </table>

    ${quotation.notes ? `
    <div class="section-title">Notes</div>
    <table>${row('', quotation.notes)}</table>` : ''}

    <div class="section-title">Prepared By</div>
    <table>
      ${row('Staff', quotation.createdBy.username)}
      ${row('Date', date)}
    </table>
    ${settings.invoiceFooterNote ? `<div style="padding:14px 16px;color:#94a3b8;font-size:12px;font-style:italic;text-align:center">${settings.invoiceFooterNote}</div>` : ''}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
