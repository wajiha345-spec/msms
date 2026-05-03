import { prisma } from '../../config/db';
import { sendAdminNewOrderEmail, sendOrderReceivedEmail } from '../../utils/email';

const PLAN_PRICES: Record<string, number> = { SIMPLE: 25000, PRO: 95000 };

export async function createOrder(data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  plan: string;
  transactionId: string;
  screenshotUrl: string;
  notes?: string;
}) {
  const plan = data.plan.toUpperCase();
  if (!PLAN_PRICES[plan]) throw new Error('Invalid plan. Choose SIMPLE or PRO.');

  const order = await prisma.order.create({
    data: {
      customerName:  data.customerName.trim(),
      customerEmail: data.customerEmail.trim().toLowerCase(),
      customerPhone: data.customerPhone.trim(),
      plan,
      amount:        PLAN_PRICES[plan],
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
