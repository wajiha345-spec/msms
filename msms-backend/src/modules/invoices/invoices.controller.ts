import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { fail } from '../../utils/response';
import { prisma } from '../../config/db';
import { generateInvoicePdf } from '../../utils/pdf';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function getInvoice(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        product: true,
        recordedBy: { select: { username: true } },
      },
    });

    if (!sale) return fail(res, 'Sale not found', 404);
    if (!sale.product) return fail(res, 'Product not found for this sale', 404);

    const pdfBuffer = await generateInvoicePdf({
      invoiceNo:     sale.invoiceNo,
      createdAt:     sale.createdAt,
      customerName:  sale.customerName  ?? undefined,
      customerPhone: sale.customerPhone ?? undefined,
      productName:   sale.product.name,
      productBrand:  sale.product.brand,
      imei:          sale.imei          ?? undefined,
      quantity:      sale.quantity,
      salePrice:     sale.salePrice,
      totalAmount:   sale.totalAmount,
      profit:        sale.profit,
      soldBy:        sale.recordedBy.username,
    });

    // ?download=1 → send raw PDF as a file download
    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sale.invoiceNo}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    }

    // Default → render invoice as clean HTML (works on all mobile browsers)
    // The <embed> base64-PDF approach doesn't render on Android Chrome.
    const downloadUrl = `${process.env.BACKEND_URL}/api/invoices/${id}?download=1`;
    const date = new Date(sale.createdAt).toLocaleDateString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const row = (label: string, value: string, bold = false) =>
      `<tr><td class="lbl">${label}</td><td class="val${bold ? ' bold' : ''}">${value}</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Invoice ${sale.invoiceNo}</title>
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
    .inv-header{background:#0f766e;color:#fff;padding:24px 20px;text-align:center}
    .inv-title{font-size:22px;font-weight:800;letter-spacing:1px}
    .inv-no{font-size:13px;opacity:.85;margin-top:4px;font-family:monospace}
    .inv-date{font-size:12px;opacity:.7;margin-top:2px}
    table{width:100%;border-collapse:collapse}
    td{padding:11px 16px;border-bottom:1px solid #f1f5f9;font-size:14px}
    .lbl{color:#64748b;width:42%}
    .val{font-weight:500;color:#1e293b}
    .bold{font-weight:700;font-size:15px;color:#0f766e}
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
    <div class="toolbar-title">Invoice ${sale.invoiceNo}</div>
    <div class="toolbar-btns">
      <button class="btn btn-print" onclick="window.print()">🖨 Print</button>
      <a class="btn btn-download" href="${downloadUrl}">⬇ Download PDF</a>
    </div>
  </div>

  <div class="card">
    <div class="inv-header">
      <div class="inv-title">SALES INVOICE</div>
      <div class="inv-no"># ${sale.invoiceNo}</div>
      <div class="inv-date">${date}</div>
    </div>

    <div class="section-title">Product</div>
    <table>
      ${row('Product', `${sale.product.name}`)}
      ${row('Brand', sale.product.brand)}
      ${sale.imei ? row('IMEI', sale.imei) : ''}
      ${row('Quantity', `${sale.quantity} unit${sale.quantity > 1 ? 's' : ''}`)}
    </table>

    ${sale.customerName || sale.customerPhone ? `
    <div class="section-title">Customer</div>
    <table>
      ${sale.customerName  ? row('Name',  sale.customerName)  : ''}
      ${sale.customerPhone ? row('Phone', sale.customerPhone) : ''}
    </table>` : ''}

    <div class="section-title">Payment</div>
    <table>
      ${row('Unit Price', `Rs ${sale.salePrice.toLocaleString()}`)}
      ${row('Total Amount', `Rs ${sale.totalAmount.toLocaleString()}`, true)}
    </table>

    <div class="section-title">Recorded By</div>
    <table>
      ${row('Staff', sale.recordedBy.username)}
      ${row('Date', date)}
    </table>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
