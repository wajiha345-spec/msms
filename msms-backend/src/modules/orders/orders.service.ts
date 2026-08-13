import { prisma } from '../../config/db';
import { sendAdminNewOrderEmail, sendOrderReceivedEmail } from '../../utils/email';

// SmartShop is a single flat-priced product — Rs 45,000 one-time, matching
// the 3×15,000 installment total in licenseInstallments.service.ts. The
// two-tier SIMPLE/PRO pricing this replaced was inconsistent across the
// website, this file, and the installment plan (three different numbers) —
// existing SIMPLE/PRO shops from before this change keep working unchanged
// (Shop.plan/LicenseKey.plan/requirePlan('PRO') gating is untouched), this
// only affects what NEW orders charge and which plan they activate.
export const SMARTSHOP_PRICE = 45000;

export async function createOrder(data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  transactionId: string;
  screenshotUrl: string;
  notes?: string;
  platform: 'android' | 'desktop';
}) {
  const order = await prisma.order.create({
    data: {
      customerName:  data.customerName.trim(),
      customerEmail: data.customerEmail.trim().toLowerCase(),
      customerPhone: data.customerPhone.trim(),
      plan:          'PRO', // internal label meaning "fully paid" — keeps every existing requirePlan('PRO') gate working unchanged
      platform:      data.platform,
      amount:        SMARTSHOP_PRICE,
      transactionId: data.transactionId.trim(),
      screenshotUrl: data.screenshotUrl,
      notes:         data.notes?.trim() || null,
      status:        'PENDING',
    },
  });

  // Notify admin
  await sendAdminNewOrderEmail({
    id:            order.id,
    customerName:  order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    plan:          order.plan,
    amount:        order.amount,
    transactionId: order.transactionId,
    screenshotUrl: order.screenshotUrl,
  }).catch(() => {}); // don't fail the request if email fails

  // Confirm to customer
  await sendOrderReceivedEmail({
    name:    order.customerName,
    email:   order.customerEmail,
    plan:    order.plan,
    amount:  order.amount,
    orderId: order.id,
  }).catch(() => {});

  return order;
}

export async function getOrders(status?: string) {
  return prisma.order.findMany({
    where:   status ? { status } : {},
    include: { licenseKey: { select: { key: true, isActivated: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where:   { id },
    include: { licenseKey: true },
  });
  if (!order) throw new Error('Order not found');
  return order;
}
