import { Request, Response } from 'express';
import { ok, fail } from '../../utils/response';
import { getOrders, getOrderById } from '../orders/orders.service';
import { prisma } from '../../config/db';
import { sendLicenseEmail } from '../../utils/email';
import crypto from 'crypto';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function adminPageHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>MSMS Admin</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background:#f8fafc; color:#1e293b; margin:0; padding:40px 16px; }
    .card { background:#fff; border-radius:14px; border:1px solid #e2e8f0;
            box-shadow:0 4px 12px rgba(0,0,0,.06); max-width:520px;
            margin:0 auto; padding:36px 32px; }
    h2 { font-size:22px; margin:0 0 6px; }
    p  { color:#64748b; font-size:14px; line-height:1.6; margin:4px 0; }
    table { width:100%; border-collapse:collapse; margin:20px 0; font-size:14px; }
    td { padding:9px 6px; border-bottom:1px solid #f1f5f9; }
    td:first-child { color:#94a3b8; width:38%; }
    td:last-child  { font-weight:600; font-family:monospace; }
    .btn { display:inline-block; padding:11px 22px; border-radius:8px; font-weight:600;
           font-size:14px; text-decoration:none; margin-top:6px; }
    .btn-green  { background:#16a34a; color:#fff; }
    .btn-blue   { background:#2563eb; color:#fff; }
    .btn-yellow { background:#d97706; color:#fff; }
    .warn { background:#fffbeb; border:1px solid #fde68a; border-radius:10px;
            padding:14px 16px; margin:16px 0; font-size:13px; color:#92400e; }
    .ok   { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px;
            padding:14px 16px; margin:16px 0; font-size:13px; color:#166534; }
    .icon { font-size:48px; margin-bottom:12px; display:block; }
  </style>
</head>
<body><div class="card">${body}</div></body>
</html>`;
}

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

// GET|POST /api/admin/orders/:id/approve?secret=...
// Works as GET so the admin can click the link directly from email.
// The DB transaction is committed first. If the email send fails, the order
// is still marked PAID and a resend link is shown — the customer is never stuck.
export async function approveOrder(req: Request, res: Response) {
  try {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const secret  = String(req.query.secret ?? '');
    const order   = await getOrderById(orderId);

    const resendUrl = `${process.env.BACKEND_URL}/api/admin/orders/${orderId}/resend-license?secret=${encodeURIComponent(secret)}`;

    if (order.status === 'PAID') {
      const licKey = (order as any).licenseKey?.key ?? 'key not found';
      return res.send(adminPageHtml(`
        <span class="icon">ℹ️</span>
        <h2>Already Approved</h2>
        <p>This order is already marked <strong>PAID</strong> and a license key exists.</p>
        <table>
          <tr><td>Customer</td><td>${escapeHtml(order.customerName)}</td></tr>
          <tr><td>Email</td><td>${escapeHtml(order.customerEmail)}</td></tr>
          <tr><td>Plan</td><td>${escapeHtml(order.plan)}</td></tr>
          <tr><td>License Key</td><td>${escapeHtml(licKey)}</td></tr>
        </table>
        <div class="warn">If the customer says they did not receive the email, use the resend button below.</div>
        <a href="${resendUrl}" class="btn btn-blue">Resend License Email</a>
      `));
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).send(adminPageHtml(`
        <span class="icon">❌</span>
        <h2>Order Cancelled</h2>
        <p>This order has been cancelled and cannot be approved.</p>
      `));
    }

    // Generate a unique license key (UUID)
    const key = crypto.randomUUID();

    // Commit to DB first — so the license is never lost even if the email fails
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data:  { status: 'PAID', updatedAt: new Date() },
      }),
      prisma.licenseKey.create({
        data: { key, orderId: order.id, plan: order.plan },
      }),
    ]);

    // Try to email — failure must NOT prevent the approval from being recorded
    let emailSent = false;
    try {
      await sendLicenseEmail({
        name:       order.customerName,
        email:      order.customerEmail,
        plan:       order.plan,
        licenseKey: key,
      });
      emailSent = true;
    } catch (emailErr: any) {
      console.error('[Admin] License email failed for order', orderId, emailErr?.message);
    }

    const emailNote = emailSent
      ? `<div class="ok">License email sent to <strong>${escapeHtml(order.customerEmail)}</strong>.</div>`
      : `<div class="warn">
           <strong>Email delivery failed.</strong> The license key has been created and the order is marked as paid,
           but the email was not sent. Use the button below to resend it now.
           <br/><br/>
           <a href="${resendUrl}" class="btn btn-yellow">Resend License Email</a>
         </div>`;

    return res.send(adminPageHtml(`
      <span class="icon">✅</span>
      <h2>Order Approved</h2>
      ${emailNote}
      <table>
        <tr><td>Customer</td><td>${escapeHtml(order.customerName)}</td></tr>
        <tr><td>Email</td><td>${escapeHtml(order.customerEmail)}</td></tr>
        <tr><td>Plan</td><td>${escapeHtml(order.plan)}</td></tr>
        <tr><td>License Key</td><td>${escapeHtml(key)}</td></tr>
      </table>
      <a href="${resendUrl}" class="btn btn-blue" style="margin-right:8px">Resend License Email</a>
    `));
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// GET /api/admin/orders/:id/resend-license?secret=...
// Safe to call multiple times — just resends the email to the customer.
export async function resendLicense(req: Request, res: Response) {
  try {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const secret  = String(req.query.secret ?? '');
    const order   = await getOrderById(orderId);

    if (order.status !== 'PAID') {
      return res.status(400).send(adminPageHtml(`
        <span class="icon">❌</span>
        <h2>Cannot Resend</h2>
        <p>The order must be approved (PAID) before a license can be sent. Current status: <strong>${escapeHtml(order.status)}</strong>.</p>
      `));
    }

    const licenseKey = (order as any).licenseKey;
    if (!licenseKey) {
      return res.status(400).send(adminPageHtml(`
        <span class="icon">❌</span>
        <h2>No License Key Found</h2>
        <p>This order does not have a license key. This should not happen — please contact technical support.</p>
      `));
    }

    await sendLicenseEmail({
      name:       order.customerName,
      email:      order.customerEmail,
      plan:       order.plan,
      licenseKey: licenseKey.key,
    });

    const resendUrl = `${process.env.BACKEND_URL}/api/admin/orders/${orderId}/resend-license?secret=${encodeURIComponent(secret)}`;

    return res.send(adminPageHtml(`
      <span class="icon">✅</span>
      <h2>License Email Resent</h2>
      <div class="ok">License email successfully resent to <strong>${escapeHtml(order.customerEmail)}</strong>.</div>
      <table>
        <tr><td>Customer</td><td>${escapeHtml(order.customerName)}</td></tr>
        <tr><td>Plan</td><td>${escapeHtml(order.plan)}</td></tr>
        <tr><td>License Key</td><td>${escapeHtml(licenseKey.key)}</td></tr>
      </table>
      <a href="${resendUrl}" class="btn btn-blue">Resend Again</a>
    `));
  } catch (e: any) {
    if ((e as any)?.message?.includes('not found')) {
      return res.status(404).send(adminPageHtml(`
        <span class="icon">❌</span>
        <h2>Order Not Found</h2>
        <p>No order with this ID exists.</p>
      `));
    }
    return res.status(500).send(adminPageHtml(`
      <span class="icon">❌</span>
      <h2>Email Failed</h2>
      <p>The email could not be sent: <code>${escapeHtml(e?.message ?? 'unknown error')}</code></p>
      <p>Check your email credentials in .env and try again.</p>
    `));
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
