import { prisma } from '../../config/db';
import { sendAdminNewLicenseInstallmentEmail, sendInstallmentDueReminderEmail } from '../../utils/email';
import { activateLicense } from '../licenseStatus/licenseStatus.service';

// ── License installment payments ────────────────────────────────────────────
// A shop paying for its own PRO license in installments — unrelated to the
// existing "installment sales" feature (Sale.paymentType/Guarantor), which is
// a shop's own customers buying phones on installment. See schema.prisma.
//
// No payment gateway exists anywhere in MSMS — every payment (including these
// installments) is verified manually by an admin via a transaction ID +
// screenshot, same as the existing one-time-payment order flow in
// orders.service.ts / admin.controller.ts.

const PLAN = 'PRO';
// 3 × 15,000 = Rs 45,000, matching orders.service.ts's SMARTSHOP_PRICE flat
// price exactly (previously 45,000 per installment — 135,000 total — a real
// pricing bug, not an intentional 3x markup over the one-time price).
const INSTALLMENT_AMOUNT = 15000;
const TOTAL_INSTALLMENTS = 3;
const INSTALLMENT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function startPlan(shopId: string, data: { transactionId: string; screenshotUrl: string }) {
  const existing = await prisma.licenseInstallmentPlan.findUnique({ where: { shopId } });
  if (existing) throw new Error('An installment plan already exists for this shop');

  const result = await prisma.$transaction(async (tx) => {
    const plan = await tx.licenseInstallmentPlan.create({
      data: {
        shopId,
        plan: PLAN,
        installmentAmount: INSTALLMENT_AMOUNT,
        totalInstallments: TOTAL_INSTALLMENTS,
      },
    });
    const installment = await tx.licenseInstallment.create({
      data: {
        planId: plan.id,
        installmentNumber: 1,
        amount: INSTALLMENT_AMOUNT,
        status: 'SUBMITTED',
        transactionId: data.transactionId.trim(),
        screenshotUrl: data.screenshotUrl,
        submittedAt: new Date(),
      },
    });
    return { plan, installment };
  });

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } });
  sendAdminNewLicenseInstallmentEmail({
    installmentId: result.installment.id,
    shopName: shop?.name ?? 'Unknown shop',
    installmentNumber: 1,
    amount: INSTALLMENT_AMOUNT,
    transactionId: result.installment.transactionId!,
    screenshotUrl: result.installment.screenshotUrl!,
  }).catch(() => {});

  return result;
}

export async function getStatus(shopId: string) {
  const plan = await prisma.licenseInstallmentPlan.findUnique({
    where: { shopId },
    include: { installments: { orderBy: { installmentNumber: 'asc' } } },
  });
  if (!plan) return null;

  const now = new Date();
  const overdueInstallment = plan.installments.find(
    (i) => i.status !== 'PAID' && i.dueDate && i.dueDate < now
  ) ?? null;
  const upcomingInstallment = plan.installments.find(
    (i) => i.status === 'PENDING' && i.dueDate && i.dueDate >= now && i.dueDate <= new Date(now.getTime() + REMINDER_WINDOW_MS)
  ) ?? null;

  return { ...plan, overdueInstallment, upcomingInstallment };
}

export async function submitInstallment(
  shopId: string,
  installmentNumber: number,
  data: { transactionId: string; screenshotUrl: string }
) {
  const plan = await prisma.licenseInstallmentPlan.findUnique({
    where: { shopId },
    include: { installments: true, shop: { select: { name: true } } },
  });
  if (!plan) throw new Error('No installment plan found for this shop');
  if (plan.status !== 'ACTIVE') throw new Error('This installment plan has already been completed');

  const installment = plan.installments.find((i) => i.installmentNumber === installmentNumber);
  if (!installment) throw new Error('Installment not found. It may not be due yet.');
  if (installment.status !== 'PENDING') throw new Error('This installment has already been submitted or paid');

  const updated = await prisma.licenseInstallment.update({
    where: { id: installment.id },
    data: {
      status: 'SUBMITTED',
      transactionId: data.transactionId.trim(),
      screenshotUrl: data.screenshotUrl,
      submittedAt: new Date(),
    },
  });

  // Previously only startPlan (installment #1) notified the admin — #2/#3
  // submissions went silent and relied on the admin polling the admin
  // dashboard. Every submission now emails the same way.
  sendAdminNewLicenseInstallmentEmail({
    installmentId: updated.id,
    shopName: plan.shop.name,
    installmentNumber: updated.installmentNumber,
    amount: updated.amount,
    transactionId: updated.transactionId!,
    screenshotUrl: updated.screenshotUrl!,
  }).catch(() => {});

  return updated;
}

interface PublicSubmitInput {
  username:      string;
  contact:       string; // email or phone — loosely cross-checked against what's on file
  transactionId: string;
  screenshotUrl: string;
}

// The website has no login — a shop identifies itself by the same username
// its owner already uses to log into the app, plus its email/phone as a
// speed-bump cross-check (same trust model the existing full-payment order
// form already uses: nobody is strongly authenticated, the admin verifies
// the actual transaction manually before ever clicking Approve). Reuses
// startPlan/submitInstallment unchanged — no separate state machine.
export async function submitPublicInstallment(data: PublicSubmitInput) {
  const NOT_FOUND = "We couldn't verify that account. Please double-check your username and the email or phone on file, then try again — or contact support.";

  const foundUser = await prisma.user.findFirst({ where: { username: data.username.trim() } });
  if (!foundUser) throw new Error(NOT_FOUND);

  const shopId = foundUser.shopId;
  const [adminUser, settings] = await Promise.all([
    prisma.user.findFirst({ where: { shopId, role: 'admin' }, select: { email: true } }),
    prisma.shopSettings.findUnique({ where: { shopId }, select: { shopPhone: true } }),
  ]);

  const digitsOnly = (s: string) => s.replace(/\D/g, '');
  const contact = data.contact.trim().toLowerCase();
  const contactDigits = digitsOnly(contact);
  const onFile = [adminUser?.email, foundUser.email, settings?.shopPhone]
    .filter((v): v is string => !!v)
    .map((v) => v.trim().toLowerCase());
  const isMatch = onFile.some((v) => v === contact || (contactDigits.length >= 7 && digitsOnly(v) === contactDigits));
  if (!isMatch) throw new Error(NOT_FOUND);

  const plan = await prisma.licenseInstallmentPlan.findUnique({
    where: { shopId },
    include: { installments: true },
  });

  if (!plan) {
    return startPlan(shopId, { transactionId: data.transactionId, screenshotUrl: data.screenshotUrl });
  }
  if (plan.status !== 'ACTIVE') {
    throw new Error("This shop's license is already fully paid off — nothing left to submit.");
  }

  const nextPending = plan.installments
    .filter((i) => i.status === 'PENDING')
    .sort((a, b) => a.installmentNumber - b.installmentNumber)[0];
  if (!nextPending) {
    throw new Error('Your latest payment has already been submitted and is awaiting approval.');
  }

  return submitInstallment(shopId, nextPending.installmentNumber, {
    transactionId: data.transactionId,
    screenshotUrl: data.screenshotUrl,
  });
}

interface InstallmentGate {
  installment1Paid: boolean;
  planStatus: 'ACTIVE' | 'COMPLETED' | null;
  overdue: { installmentNumber: number; amount: number; dueDate: Date | null } | null;
}

// Used by middleware/auth.ts:checkTrialExpiry on every authenticated request,
// and by licenseStatus.service.ts:computeLicenseStatus (via that same call)
// to distinguish LIFETIME_ACTIVE (plan COMPLETED) from ACTIVE_INSTALLMENT
// (plan still ACTIVE). Returns null immediately (one indexed lookup on the
// unique shopId, zero rows matched) for the vast majority of shops that
// never started a license installment plan.
export async function getInstallmentGate(shopId: string): Promise<InstallmentGate | null> {
  const plan = await prisma.licenseInstallmentPlan.findUnique({
    where: { shopId },
    include: { installments: { orderBy: { installmentNumber: 'asc' } } },
  });
  if (!plan) return null;

  const now = new Date();
  const installment1 = plan.installments.find((i) => i.installmentNumber === 1);
  const installment1Paid = installment1?.status === 'PAID';

  // Uses `status !== 'PAID'` (not just 'PENDING') so a SUBMITTED-but-overdue
  // installment still counts as overdue — admin approval is what actually
  // clears the lock, same as installment #1's own lock above. Treating
  // "submitted" as an automatic reprieve would let a shop submit unverifiable
  // proof and stay unlocked forever even if it's never approved.
  const overdue = plan.status === 'ACTIVE'
    ? plan.installments.find((i) => i.status !== 'PAID' && i.dueDate && i.dueDate < now) ?? null
    : null;

  // Fire-and-forget one-time "due in 7 days" reminder, piggybacked on this
  // same row fetch — no cron/scheduler infra exists anywhere in this codebase.
  if (plan.status === 'ACTIVE') {
    const weekOut = new Date(now.getTime() + REMINDER_WINDOW_MS);
    const upcoming = plan.installments.find(
      (i) => i.status === 'PENDING' && i.dueDate && i.dueDate > now && i.dueDate <= weekOut && !i.reminderSentAt
    );
    if (upcoming) sendReminderOnce(plan.shopId, upcoming.id, upcoming.installmentNumber, upcoming.amount, upcoming.dueDate!).catch(() => {});
  }

  return {
    installment1Paid,
    planStatus: plan.status as 'ACTIVE' | 'COMPLETED',
    overdue: overdue
      ? { installmentNumber: overdue.installmentNumber, amount: overdue.amount, dueDate: overdue.dueDate }
      : null,
  };
}

async function sendReminderOnce(shopId: string, installmentId: string, installmentNumber: number, amount: number, dueDate: Date) {
  // Stamp first so a burst of concurrent requests can't send it twice.
  await prisma.licenseInstallment.update({ where: { id: installmentId }, data: { reminderSentAt: new Date() } });
  const admin = await prisma.user.findFirst({ where: { shopId, role: 'admin' }, select: { email: true, username: true } });
  if (!admin?.email) return;
  await sendInstallmentDueReminderEmail({
    email: admin.email,
    name: admin.username,
    installmentNumber,
    amount,
    dueDate,
  });
}

// ── Admin (manual verification, same pattern as orders.service.ts) ─────────

export async function listSubmittedInstallments(status?: string) {
  return prisma.licenseInstallment.findMany({
    where: status ? { status } : { status: 'SUBMITTED' },
    include: { plan: { include: { shop: { select: { name: true } } } } },
    orderBy: { submittedAt: 'asc' },
  });
}

export async function getInstallmentById(id: string) {
  const installment = await prisma.licenseInstallment.findUnique({
    where: { id },
    include: { plan: { include: { shop: { select: { id: true, name: true } } } } },
  });
  if (!installment) throw new Error('Installment not found');
  return installment;
}

// Compare-and-swap: only transitions an installment that is still SUBMITTED,
// closing the race window where two simultaneous admin approve-clicks could
// otherwise both "succeed" against a stale in-memory read. Returns null if
// the installment wasn't in a SUBMITTED state (already approved/rejected by
// someone else, or never submitted) — caller distinguishes that from success.
export async function approveInstallment(id: string) {
  const installment = await getInstallmentById(id);
  if (installment.status === 'PAID') return { installment, alreadyApproved: true };
  if (installment.status !== 'SUBMITTED') return null;

  const { plan } = installment;
  const now = new Date();

  const claimed = await prisma.licenseInstallment.updateMany({
    where: { id: installment.id, status: 'SUBMITTED' },
    data: { status: 'PAID', paidAt: now },
  });
  if (claimed.count === 0) return null; // lost the race to a concurrent approval

  await prisma.$transaction(async (tx) => {
    if (installment.installmentNumber === 1) {
      // The unlock — matches setup.controller.ts:upgradeShop's own upgrade write.
      await activateLicense(tx, plan.shopId, plan.plan);
    }

    if (installment.installmentNumber < plan.totalInstallments) {
      await tx.licenseInstallment.create({
        data: {
          planId: plan.id,
          installmentNumber: installment.installmentNumber + 1,
          amount: plan.installmentAmount,
          status: 'PENDING',
          dueDate: new Date(now.getTime() + INSTALLMENT_INTERVAL_MS),
        },
      });
    } else {
      await tx.licenseInstallmentPlan.update({ where: { id: plan.id }, data: { status: 'COMPLETED' } });
    }
  });

  return { installment: await getInstallmentById(id), alreadyApproved: false };
}

// Same compare-and-swap shape as approveInstallment. A rejection never
// touches Shop.plan — the shop stays exactly as locked/unlocked as it
// already was; the customer resubmits or contacts support.
export async function rejectInstallment(id: string, reason: string) {
  const installment = await getInstallmentById(id);
  if (installment.status !== 'SUBMITTED') return null;

  const claimed = await prisma.licenseInstallment.updateMany({
    where: { id, status: 'SUBMITTED' },
    data: { status: 'REJECTED', rejectionReason: reason },
  });
  if (claimed.count === 0) return null;

  return getInstallmentById(id);
}
