import { Response } from 'express';
import crypto from 'crypto';
import { AdminRequest } from '../../middleware/authenticateAdmin';
import { ok, fail } from '../../utils/response';
import { getOrders, getOrderById } from '../orders/orders.service';
import {
  listSubmittedInstallments,
  getInstallmentById,
  approveInstallment,
  rejectInstallment,
} from '../licenseInstallments/licenseInstallments.service';
import { prisma } from '../../config/db';
import { sendLicenseEmail, sendPaymentRejectedEmail } from '../../utils/email';
import { logAdminAction } from '../auditLog/auditLog.service';

// Human-readable license key for NEW keys — "SMARTSHOP-XXXX-XXXX-XXXX".
// Existing UUID-format keys keep working unchanged (LicenseKey.key is just a
// String @id, not a UUID-typed column).
function generateLicenseKey(): string {
  const group = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SMARTSHOP-${group()}-${group()}-${group()}`;
}

// req.params values are typed string | string[] by this Express version's
// types (repeated route params); every route here uses a single simple
// segment, so this just narrows to the expected case.
function param(req: AdminRequest, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

// ── Orders (one-time full payment) ──────────────────────────────────────────

export async function listOrders(req: AdminRequest, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const orders = await getOrders(status);
    return ok(res, orders);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// Compare-and-swap: only transitions an order that is still PENDING, closing
// the race window where two admins clicking Approve at once could otherwise
// both "succeed." The DB transaction commits before the email send, so the
// license is never lost even if the email fails — resendLicense covers that.
export async function approveOrder(req: AdminRequest, res: Response) {
  try {
    const orderId = param(req, 'id');
    const order = await getOrderById(orderId);

    if (order.status === 'PAID') {
      return ok(res, { message: 'This order is already approved.', order, alreadyApproved: true });
    }
    if (order.status !== 'PENDING') {
      return fail(res, `Only PENDING orders can be approved. Current status: ${order.status}`);
    }

    const key = generateLicenseKey();
    const before = { status: order.status };

    const claimed = await prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'PAID', updatedAt: new Date() },
    });
    if (claimed.count === 0) {
      return fail(res, 'This order was just approved or rejected by someone else. Refresh and try again.', 409);
    }
    await prisma.licenseKey.create({ data: { key, orderId: order.id, plan: order.plan } });

    await logAdminAction(req.admin!.adminId, 'ORDER_APPROVED', 'Order', order.id, before, { status: 'PAID', licenseKey: key }, req);

    let emailSent = false;
    try {
      await sendLicenseEmail({ name: order.customerName, email: order.customerEmail, plan: order.plan, licenseKey: key });
      emailSent = true;
    } catch (emailErr: any) {
      console.error('[Admin] License email failed for order', orderId, emailErr?.message);
    }

    return ok(res, { message: emailSent ? 'Order approved and license emailed.' : 'Order approved, but the license email failed to send — use Resend.', licenseKey: key, emailSent });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function rejectOrder(req: AdminRequest, res: Response) {
  try {
    const orderId = param(req, 'id');
    const reason = String(req.body?.reason ?? '').trim();
    if (!reason) return fail(res, 'A rejection reason is required');

    const order = await getOrderById(orderId);
    if (order.status !== 'PENDING') {
      return fail(res, `Only PENDING orders can be rejected. Current status: ${order.status}`);
    }

    const claimed = await prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'REJECTED', rejectionReason: reason, updatedAt: new Date() },
    });
    if (claimed.count === 0) {
      return fail(res, 'This order was just approved or rejected by someone else. Refresh and try again.', 409);
    }

    await logAdminAction(req.admin!.adminId, 'ORDER_REJECTED', 'Order', order.id, { status: order.status }, { status: 'REJECTED', reason }, req);

    sendPaymentRejectedEmail({
      email: order.customerEmail,
      name: order.customerName,
      context: 'your order',
      amount: order.amount,
      reason,
    }).catch(() => {});

    return ok(res, { message: 'Order rejected and customer notified.' });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function resendLicense(req: AdminRequest, res: Response) {
  try {
    const orderId = param(req, 'id');
    const order = await getOrderById(orderId);

    if (order.status !== 'PAID') return fail(res, `The order must be approved (PAID) before a license can be sent. Current status: ${order.status}`);
    const licenseKey = (order as any).licenseKey;
    if (!licenseKey) return fail(res, 'This order does not have a license key. This should not happen — please contact technical support.');

    await sendLicenseEmail({ name: order.customerName, email: order.customerEmail, plan: order.plan, licenseKey: licenseKey.key });
    return ok(res, { message: `License email resent to ${order.customerEmail}.` });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function cancelOrder(req: AdminRequest, res: Response) {
  try {
    const orderId = param(req, 'id');
    const order = await getOrderById(orderId);
    if (order.status !== 'PENDING') return fail(res, 'Only PENDING orders can be cancelled');

    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', updatedAt: new Date() } });
    await logAdminAction(req.admin!.adminId, 'ORDER_CANCELLED', 'Order', order.id, { status: 'PENDING' }, { status: 'CANCELLED' }, req);
    return ok(res, { message: 'Order cancelled' });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── License installments ────────────────────────────────────────────────────

export async function listLicenseInstallments(req: AdminRequest, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const installments = await listSubmittedInstallments(status);
    return ok(res, installments);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function approveLicenseInstallment(req: AdminRequest, res: Response) {
  try {
    const id = param(req, 'id');
    const before = await getInstallmentById(id);

    const result = await approveInstallment(id);
    if (result === null) {
      return fail(res, 'This installment is not awaiting approval (already handled by someone else, or not yet submitted). Refresh and try again.', 409);
    }
    if (result.alreadyApproved) {
      return ok(res, { message: 'This installment is already approved.', alreadyApproved: true });
    }

    await logAdminAction(
      req.admin!.adminId,
      'INSTALLMENT_APPROVED',
      'LicenseInstallment',
      id,
      { status: before.status },
      { status: 'PAID' },
      req
    );

    const unlockNote = before.installmentNumber === 1
      ? `Installment #1 approved — ${before.plan.shop.name} now has full access.`
      : `Installment #${before.installmentNumber} approved for ${before.plan.shop.name}.`;

    return ok(res, { message: unlockNote, installment: result.installment });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function rejectLicenseInstallment(req: AdminRequest, res: Response) {
  try {
    const id = param(req, 'id');
    const reason = String(req.body?.reason ?? '').trim();
    if (!reason) return fail(res, 'A rejection reason is required');

    const before = await getInstallmentById(id);
    const result = await rejectInstallment(id, reason);
    if (result === null) {
      return fail(res, 'This installment is not awaiting approval (already handled by someone else, or not yet submitted). Refresh and try again.', 409);
    }

    await logAdminAction(req.admin!.adminId, 'INSTALLMENT_REJECTED', 'LicenseInstallment', id, { status: before.status }, { status: 'REJECTED', reason }, req);

    const admin = await prisma.user.findFirst({ where: { shopId: before.plan.shopId, role: 'admin' }, select: { email: true, username: true } });
    if (admin?.email) {
      sendPaymentRejectedEmail({
        email: admin.email,
        name: admin.username,
        context: `installment #${before.installmentNumber}`,
        amount: before.amount,
        reason,
      }).catch(() => {});
    }

    return ok(res, { message: 'Installment rejected and shop notified.' });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── Shops (suspend / reactivate) ────────────────────────────────────────────

export async function suspendShop(req: AdminRequest, res: Response) {
  try {
    const shopId = param(req, 'id');
    const shop = await prisma.shop.update({ where: { id: shopId }, data: { suspended: true } });
    await logAdminAction(req.admin!.adminId, 'SHOP_SUSPENDED', 'Shop', shopId, { suspended: false }, { suspended: true }, req);
    return ok(res, { message: `${shop.name} suspended.` });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function reactivateShop(req: AdminRequest, res: Response) {
  try {
    const shopId = param(req, 'id');
    const shop = await prisma.shop.update({ where: { id: shopId }, data: { suspended: false } });
    await logAdminAction(req.admin!.adminId, 'SHOP_REACTIVATED', 'Shop', shopId, { suspended: true }, { suspended: false }, req);
    return ok(res, { message: `${shop.name} reactivated.` });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function listShops(_req: AdminRequest, res: Response) {
  try {
    const shops = await prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, plan: true, trialEndsAt: true, suspended: true, createdAt: true,
        licenseInstallmentPlan: { select: { status: true, installments: { select: { installmentNumber: true, status: true, dueDate: true } } } },
      },
    });
    return ok(res, shops);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── License key device binding ──────────────────────────────────────────────
// Recorded for visibility, never hard-enforced (see setup.controller.ts) —
// this is the manual override when a legitimate reinstall/new-phone flags a
// mismatch.

export async function resetDevice(req: AdminRequest, res: Response) {
  try {
    const key = param(req, 'key');
    const existing = await prisma.licenseKey.findUnique({ where: { key } });
    if (!existing) return fail(res, 'License key not found', 404);

    await prisma.licenseKey.update({ where: { key }, data: { deviceId: null } });
    await logAdminAction(req.admin!.adminId, 'DEVICE_RESET', 'LicenseKey', key, { deviceId: existing.deviceId }, { deviceId: null }, req);
    return ok(res, { message: 'Device binding cleared. The next login will bind a new device.' });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// ── Dashboard summary ───────────────────────────────────────────────────────

export async function getDashboardStats(_req: AdminRequest, res: Response) {
  try {
    const [
      totalShops, trialShops, suspendedShops,
      pendingOrders, paidOrders, rejectedOrders,
      pendingInstallments, activePlans, completedPlans,
      revenueOrders,
    ] = await Promise.all([
      prisma.shop.count(),
      prisma.shop.count({ where: { plan: 'TRIAL' } }),
      prisma.shop.count({ where: { suspended: true } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.order.count({ where: { status: 'REJECTED' } }),
      prisma.licenseInstallment.count({ where: { status: 'SUBMITTED' } }),
      prisma.licenseInstallmentPlan.count({ where: { status: 'ACTIVE' } }),
      prisma.licenseInstallmentPlan.count({ where: { status: 'COMPLETED' } }),
      prisma.order.findMany({ where: { status: 'PAID' }, select: { amount: true } }),
    ]);

    const paidInstallments = await prisma.licenseInstallment.findMany({ where: { status: 'PAID' }, select: { amount: true } });
    const lockedShops = await prisma.licenseInstallment.count({
      where: { status: { not: 'PAID' }, dueDate: { lt: new Date() }, plan: { status: 'ACTIVE' } },
    });

    const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.amount, 0) + paidInstallments.reduce((sum, i) => sum + i.amount, 0);
    const totalOutstanding = await prisma.licenseInstallment.findMany({
      where: { status: { in: ['PENDING', 'SUBMITTED'] } },
      select: { amount: true },
    }).then((rows) => rows.reduce((sum, i) => sum + i.amount, 0));

    return ok(res, {
      totalCustomers: totalShops,
      trialCustomers: trialShops,
      suspendedAccounts: suspendedShops,
      pendingPayments: pendingOrders + pendingInstallments,
      approvedPayments: paidOrders,
      rejectedPayments: rejectedOrders,
      installmentsDue: lockedShops,
      lockedAccounts: lockedShops,
      lifetimeLicenses: paidOrders + completedPlans,
      activeInstallmentPlans: activePlans,
      totalRevenue,
      outstandingAmount: totalOutstanding,
    });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
