import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

interface InvoiceData {
  invoiceNo:     string;
  createdAt:     Date;
  customerName?: string;
  customerPhone?: string;
  productName:   string;
  productBrand:  string;
  imei?:         string;
  quantity:      number;
  salePrice:     number;
  totalAmount:   number;
  profit:        number;
  soldBy:        string;
}

// Generates a PDF invoice and returns it as a Buffer
export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    // Collect chunks as PDF is built
    doc.on('data',  (chunk) => chunks.push(chunk));
    doc.on('end',   ()      => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW  = doc.page.width;
    const margin = 50;
    const col2   = 320; // right column x position

    // ── Header bar ──────────────────────────────────────────────
    doc.rect(0, 0, pageW, 90).fill('#6C63FF');

    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('MOBILE SHOP', margin, 28);

    doc
      .fillColor('#DDD6FE')
      .fontSize(10)
      .font('Helvetica')
      .text('Management System', margin, 54);

    doc
      .fillColor('#FFFFFF')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('SALES INVOICE', pageW - margin - 100, 28, { width: 100, align: 'right' });

    doc
      .fillColor('#DDD6FE')
      .fontSize(9)
      .font('Helvetica')
      .text(data.invoiceNo, pageW - margin - 100, 46, { width: 100, align: 'right' });

    // ── Invoice Meta ─────────────────────────────────────────────
    doc.moveDown(3);

    const metaY = 110;

    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Helvetica')
      .text('DATE', margin, metaY)
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#111827')
      .text(
        data.createdAt.toLocaleDateString('en-PK', {
          day: '2-digit', month: 'short', year: 'numeric',
        }),
        margin, metaY + 14
      );

    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Helvetica')
      .text('TIME', col2, metaY)
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#111827')
      .text(
        data.createdAt.toLocaleTimeString('en-PK', {
          hour: '2-digit', minute: '2-digit',
        }),
        col2, metaY + 14
      );

    // ── Divider ──────────────────────────────────────────────────
    doc
      .moveTo(margin, 150)
      .lineTo(pageW - margin, 150)
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .stroke();

    // ── Customer Info ─────────────────────────────────────────────
    const custY = 165;

    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Helvetica')
      .text('CUSTOMER', margin, custY);

    doc
      .fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(data.customerName || 'Walk-in Customer', margin, custY + 13);

    if (data.customerPhone) {
      doc
        .fillColor('#6B7280')
        .fontSize(10)
        .font('Helvetica')
        .text(`📞 ${data.customerPhone}`, margin, custY + 29);
    }

    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Helvetica')
      .text('SERVED BY', col2, custY)
      .fillColor('#111827')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(data.soldBy, col2, custY + 13);

    // ── Product Table ─────────────────────────────────────────────
    const tableTop = 240;

    // Table header background
    doc.rect(margin, tableTop, pageW - margin * 2, 28).fill('#F3F4F6');

    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Helvetica-Bold');

    doc.text('PRODUCT',  margin + 8,  tableTop + 10);
    doc.text('QTY',      margin + 280, tableTop + 10);
    doc.text('PRICE',    margin + 330, tableTop + 10);
    doc.text('TOTAL',    margin + 390, tableTop + 10);

    // Table row
    const rowY = tableTop + 40;

    doc
      .fillColor('#111827')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(data.productName, margin + 8, rowY, { width: 260 });

    doc
      .fillColor('#6B7280')
      .fontSize(9)
      .font('Helvetica')
      .text(data.productBrand, margin + 8, rowY + 16);

    if (data.imei) {
      doc
        .fillColor('#9CA3AF')
        .fontSize(8)
        .text(`IMEI: ${data.imei}`, margin + 8, rowY + 30);
    }

    doc
      .fillColor('#111827')
      .fontSize(11)
      .font('Helvetica')
      .text(String(data.quantity),            margin + 280, rowY)
      .text(`Rs ${data.salePrice.toLocaleString()}`,  margin + 330, rowY)
      .text(`Rs ${data.totalAmount.toLocaleString()}`, margin + 390, rowY);

    // Row bottom border
    const rowBottom = rowY + (data.imei ? 48 : 32);
    doc
      .moveTo(margin, rowBottom)
      .lineTo(pageW - margin, rowBottom)
      .strokeColor('#E5E7EB')
      .lineWidth(0.5)
      .stroke();

    // ── Totals ────────────────────────────────────────────────────
    const totalsY = rowBottom + 16;
    const labelX  = margin + 300;
    const valueX  = margin + 390;

    doc
      .fillColor('#6B7280')
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal', labelX, totalsY)
      .text(`Rs ${data.totalAmount.toLocaleString()}`, valueX, totalsY);

    doc
      .fillColor('#6B7280')
      .text('Tax', labelX, totalsY + 18)
      .text('Rs 0', valueX, totalsY + 18);

    // Total box
    doc.rect(labelX - 8, totalsY + 36, pageW - margin - labelX + 8, 32)
       .fill('#6C63FF');

    doc
      .fillColor('#FFFFFF')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TOTAL', labelX, totalsY + 47)
      .text(`Rs ${data.totalAmount.toLocaleString()}`, valueX, totalsY + 47);

    // ── Footer ────────────────────────────────────────────────────
    const footerY = doc.page.height - 80;

    doc
      .moveTo(margin, footerY)
      .lineTo(pageW - margin, footerY)
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#9CA3AF')
      .fontSize(9)
      .font('Helvetica')
      .text(
        'Thank you for your business!',
        margin, footerY + 12,
        { align: 'center', width: pageW - margin * 2 }
      )
      .text(
        'This is a computer-generated invoice and does not require a signature.',
        margin, footerY + 28,
        { align: 'center', width: pageW - margin * 2 }
      );

    doc.end();
  });
}