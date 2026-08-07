import { prisma } from '../../config/db';
import { getSettingsOrDefault } from '../settings/settings.service';

// ── Notification System ─────────────────────────────────────────────────────
// Each row is one specific user's inbox entry. Triggers live as small,
// fire-and-forget calls inside the flows that already exist (sales,
// purchases, purchase orders) — see the call sites in sales.service.ts,
// sales.controller.ts, purchases.controller.ts and
// purchaseOrders.service.ts. Every trigger helper here is wrapped by its
// caller in a .catch(() => {}) so a notification failure can never surface
// as a failure of the sale/purchase/etc. that triggered it.

interface CreateNotificationInput {
  type:        string;
  title:       string;
  message:     string;
  entityType?: string;
  entityId?:   string;
}

async function notifyUser(shopId: string, userId: string, data: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      shopId,
      userId,
      type:       data.type,
      title:      data.title,
      message:    data.message,
      entityType: data.entityType ?? null,
      entityId:   data.entityId ?? null,
    },
  });
}

// Notifies the shop's admin(s) — in practice always exactly one (the owner).
// excludeUserId skips the admin notifying themselves about their own action.
async function notifyAdmin(shopId: string, data: CreateNotificationInput, excludeUserId?: string) {
  const admins = await prisma.user.findMany({
    where: { shopId, role: 'admin', ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  await Promise.all(admins.map((a) => notifyUser(shopId, a.id, data)));
}

// ── Triggers ─────────────────────────────────────────────────────────────────

export async function notifyLowStock(shopId: string, data: { productId: string; productName: string; stock: number; reorderPoint?: number | null }) {
  const { lowStockThreshold } = await getSettingsOrDefault(shopId);
  const threshold = data.reorderPoint ?? lowStockThreshold;
  if (data.stock > threshold) return;
  await notifyAdmin(shopId, {
    type:       'LOW_STOCK',
    title:      'Low stock alert',
    message:    `${data.productName} is down to ${data.stock} unit(s) left.`,
    entityType: 'product',
    entityId:   data.productId,
  });
}

export async function notifySaleRecorded(shopId: string, data: {
  saleId: string; invoiceNo: string; totalAmount: number; actorUserId: string; actorRole: string;
}) {
  if (data.actorRole === 'admin') return; // owner doesn't need to be told about their own sale
  const actor = await prisma.user.findUnique({ where: { id: data.actorUserId }, select: { username: true } });
  await notifyAdmin(shopId, {
    type:       'SALE_RECORDED',
    title:      'New sale recorded',
    message:    `${actor?.username ?? 'A team member'} recorded sale ${data.invoiceNo} for Rs ${data.totalAmount.toLocaleString()}.`,
    entityType: 'sale',
    entityId:   data.saleId,
  }, data.actorUserId);
}

export async function notifyPurchaseRecorded(shopId: string, data: {
  purchaseId: string; productId: string; quantity: number; actorUserId: string; actorRole: string;
}) {
  if (data.actorRole === 'admin') return;
  const [actor, product] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.actorUserId }, select: { username: true } }),
    prisma.product.findUnique({ where: { id: data.productId }, select: { name: true } }),
  ]);
  await notifyAdmin(shopId, {
    type:       'PURCHASE_RECORDED',
    title:      'New purchase recorded',
    message:    `${actor?.username ?? 'A team member'} recorded a purchase of ${data.quantity} × ${product?.name ?? 'a product'}.`,
    entityType: 'purchase',
    entityId:   data.purchaseId,
  }, data.actorUserId);
}

export async function notifyPurchaseOrderReceived(shopId: string, data: { poId: string; poNo: string; actorUserId: string }) {
  await notifyAdmin(shopId, {
    type:       'PURCHASE_ORDER_RECEIVED',
    title:      'Purchase order fully received',
    message:    `Purchase order ${data.poNo} has been fully received.`,
    entityType: 'purchaseOrder',
    entityId:   data.poId,
  }, data.actorUserId);
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listNotifications(shopId: string, userId: string, unreadOnly?: boolean) {
  return prisma.notification.findMany({
    where: { shopId, userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getUnreadCount(shopId: string, userId: string) {
  return prisma.notification.count({ where: { shopId, userId, isRead: false } });
}

export async function markAsRead(shopId: string, userId: string, id: string) {
  const notification = await prisma.notification.findFirst({ where: { id, shopId, userId } });
  if (!notification) throw new Error('Notification not found');
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllAsRead(shopId: string, userId: string) {
  await prisma.notification.updateMany({ where: { shopId, userId, isRead: false }, data: { isRead: true } });
}

// Computed, not persisted — the same on-the-fly approach
// dashboard.service.ts already uses for installmentAlerts, reused here for
// overdue installments, overdue CRM follow-ups, plus (below) an upcoming
// license installment payment — NOT the same thing as overdueInstallments
// above, which is the shop's own customers buying on installment; this one
// is the shop paying its own MSMS license in installments (see
// licenseInstallments.service.ts).
export async function getAttentionItems(shopId: string) {
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [overdueInstallments, overdueFollowUps, licensePlan] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId, paymentType: 'INSTALLMENT', installmentPaid: false, installmentDueDate: { lt: now } },
      orderBy: { installmentDueDate: 'asc' },
      select: {
        id: true, invoiceNo: true, customerName: true, customerPhone: true,
        totalAmount: true, installmentDueDate: true,
      },
    }),
    prisma.customerInteraction.findMany({
      where: { shopId, type: 'FOLLOW_UP', completed: false, followUpDate: { lt: now } },
      orderBy: { followUpDate: 'asc' },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.licenseInstallmentPlan.findUnique({
      where: { shopId },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    }),
  ]);

  const upcomingLicenseInstallment = licensePlan?.status === 'ACTIVE'
    ? licensePlan.installments.find((i) => i.status === 'PENDING' && i.dueDate && i.dueDate >= now && i.dueDate <= weekOut) ?? null
    : null;

  return {
    overdueInstallments: overdueInstallments.map((s) => ({
      saleId: s.id, invoiceNo: s.invoiceNo, customerName: s.customerName, customerPhone: s.customerPhone,
      pendingAmount: s.totalAmount, dueDate: s.installmentDueDate,
    })),
    overdueFollowUps: overdueFollowUps.map((f) => ({
      interactionId: f.id, text: f.text, followUpDate: f.followUpDate, customer: f.customer,
    })),
    upcomingLicenseInstallment: upcomingLicenseInstallment && {
      installmentNumber: upcomingLicenseInstallment.installmentNumber,
      amount: upcomingLicenseInstallment.amount,
      dueDate: upcomingLicenseInstallment.dueDate,
    },
  };
}
