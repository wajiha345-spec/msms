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

    // Default → HTML viewer: PDF embedded as base64 so it renders inside the
    // in-app browser (Chrome Custom Tabs) without triggering a download.
    const base64Pdf = pdfBuffer.toString('base64');
    const downloadUrl = `${process.env.BACKEND_URL}/api/invoices/${id}?download=1`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Invoice ${sale.invoiceNo}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         background:#f1f5f9;height:100vh;display:flex;flex-direction:column}
    .toolbar{
      background:#1e293b;color:#fff;
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 18px;gap:12px;flex-shrink:0;
      box-shadow:0 2px 10px rgba(0,0,0,.35);
    }
    .toolbar-title{font-size:15px;font-weight:700;white-space:nowrap;
                   overflow:hidden;text-overflow:ellipsis}
    .toolbar-btns{display:flex;gap:8px;flex-shrink:0}
    .btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;
         border:none;cursor:pointer;text-decoration:none;display:inline-block}
    .btn-print{background:#2563eb;color:#fff}
    .btn-download{background:#16a34a;color:#fff}
    .pdf-wrap{flex:1;overflow:hidden}
    embed{width:100%;height:100%;display:block;border:none}
    @media print{.toolbar{display:none}.pdf-wrap{height:100vh}}
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">Invoice ${sale.invoiceNo}</div>
    <div class="toolbar-btns">
      <button class="btn btn-print" onclick="window.print()">Print</button>
      <a class="btn btn-download" href="${downloadUrl}">Download</a>
    </div>
  </div>
  <div class="pdf-wrap">
    <embed src="data:application/pdf;base64,${base64Pdf}" type="application/pdf"/>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
