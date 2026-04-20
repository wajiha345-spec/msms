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
      invoiceNo: sale.invoiceNo,
      createdAt: sale.createdAt,
      customerName: sale.customerName ?? undefined,
      customerPhone: sale.customerPhone ?? undefined,
      productName: sale.product.name,
      productBrand: sale.product.brand,
      imei: sale.imei ?? undefined,
      quantity: sale.quantity,
      salePrice: sale.salePrice,
      totalAmount: sale.totalAmount,
      profit: sale.profit,
      soldBy: sale.recordedBy.username,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${sale.invoiceNo}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
