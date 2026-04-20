import { Request, Response } from 'express';
import { ok, fail } from '../../utils/response';
import { getOrders, getOrderById } from '../orders/orders.service';
import { prisma } from '../../config/db';
import { sendLicenseEmail } from '../../utils/email';
import crypto from 'crypto';

// Guard: all admin routes require ?secret=ADMIN_SECRET in the query string
export function requireAdminSecret(req: Request, res: Response, next: Function) {
  const secret = Array.isArray(req.query.secret) ? req.query.secret[0] : req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// GET /api/admin/orders?secret=...&status=PENDING
export async function listOrders(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const orders = await getOrders(status);
    return ok(res, orders);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// POST /api/admin/orders/:id/approve?secret=...
// Also works as GET so you can click it directly from the email link
export async function approveOrder(req: Request, res: Response) {
  try {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const order = await getOrderById(orderId);

    if (order.status === 'PAID') {
      return res.send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
          <h2>Already approved</h2>
          <p>This order was already approved and the license key was sent.</p>
        </body></html>
      `);
    }

    if (order.status === 'CANCELLED') {
      return fail(res, 'Order is cancelled and cannot be approved');
    }

    // Generate a unique license key (UUID)
    const key = crypto.randomUUID();

    // Mark order PAID and create LicenseKey in one transaction
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data:  { status: 'PAID', updatedAt: new Date() },
      }),
      prisma.licenseKey.create({
        data: { key, orderId: order.id, plan: order.plan },
      }),
    ]);

    // Email the customer their license key
    await sendLicenseEmail({
      name:       order.customerName,
      email:      order.customerEmail,
      plan:       order.plan,
      licenseKey: key,
    });

    // Respond with a human-readable confirmation page (admin sees this in browser)
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;max-width:500px;margin:0 auto">
        <div style="font-size:48px">✅</div>
        <h2>Order Approved</h2>
        <p>License key generated and emailed to <strong>${order.customerEmail}</strong>.</p>
        <table style="text-align:left;width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:8px;color:#6b7280">Customer</td><td style="padding:8px;font-weight:600">${order.customerName}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Plan</td><td style="padding:8px">${order.plan}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">License Key</td><td style="padding:8px;font-family:monospace;font-size:13px">${key}</td></tr>
        </table>
      </body></html>
    `);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// POST /api/admin/orders/:id/cancel?secret=...
export async function cancelOrder(req: Request, res: Response) {
  try {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const order = await getOrderById(orderId);
    if (order.status !== 'PENDING') return fail(res, 'Only PENDING orders can be cancelled');

    await prisma.order.update({
      where: { id: order.id },
      data:  { status: 'CANCELLED', updatedAt: new Date() },
    });
    return ok(res, { message: 'Order cancelled' });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
