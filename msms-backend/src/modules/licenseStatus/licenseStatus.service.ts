import { Prisma } from '@prisma/client';

// ── Explicit license state, derived live (never persisted) ───────────────────
// One shared function used by checkTrialExpiry (lock/unlock decision), the
// admin dashboard (per-shop status column/filters), and any future
// customer-facing "license status" screen — so all three always agree,
// instead of each re-deriving its own inline logic from raw Shop/installment
// fields. Computing on read avoids a stored column ever drifting from the
// real underlying state (Shop.plan/trialEndsAt/suspended +
// LicenseInstallmentPlan/LicenseInstallment), which is the same principle
// checkTrialExpiry already relied on before this refactor.
export type LicenseStatus =
  | 'TRIAL'
  | 'PENDING_FIRST_PAYMENT'
  | 'ACTIVE_INSTALLMENT'
  | 'LOCKED'
  | 'LIFETIME_ACTIVE'
  | 'SUSPENDED';

export interface ShopLicenseFields {
  plan: string; // "TRIAL" | "SIMPLE" | "PRO"
  trialEndsAt: Date | string | null;
  suspended: boolean;
}

export interface InstallmentGateResult {
  installment1Paid: boolean;
  planStatus: 'ACTIVE' | 'COMPLETED' | null; // null = no installment plan ever started for this shop
  overdue: { installmentNumber: number; amount: number; dueDate: Date | null } | null;
}

function isActiveTrial(shop: ShopLicenseFields) {
  return shop.plan === 'TRIAL' && !!shop.trialEndsAt && new Date(shop.trialEndsAt) > new Date();
}

export function computeLicenseStatus(
  shop: ShopLicenseFields,
  gate: InstallmentGateResult | null
): LicenseStatus {
  if (shop.suspended) return 'SUSPENDED';

  const hasInstallmentPlan = gate !== null && gate.planStatus !== null;
  if (hasInstallmentPlan) {
    // Installment #1 submitted but not yet admin-approved must NOT unlock —
    // a plan row existing is not proof of payment, only proof of a claim.
    // Falls through to the same TRIAL/PENDING_FIRST_PAYMENT logic below as
    // if no plan existed at all.
    if (gate!.installment1Paid) {
      if (gate!.planStatus === 'COMPLETED') return 'LIFETIME_ACTIVE';
      // planStatus === 'ACTIVE'. Due date passed with no grace period today —
      // PAYMENT_DUE stays reserved vocabulary for a future grace-period
      // feature; the current business rule enforces LOCKED immediately.
      return gate!.overdue ? 'LOCKED' : 'ACTIVE_INSTALLMENT';
    }
  }

  if (shop.plan === 'TRIAL') {
    return isActiveTrial(shop) ? 'TRIAL' : 'PENDING_FIRST_PAYMENT';
  }

  // plan is "SIMPLE" or "PRO" with no installment plan ever started — fully
  // paid via the one-time Order/LicenseKey flow.
  return 'LIFETIME_ACTIVE';
}

// The one place that unlocks an EXISTING shop by writing Shop.plan/trialEndsAt.
// Replaces the duplicated inline tx.shop.update(...) previously in
// setup.controller.ts:upgradeShop and licenseInstallments.service.ts:approveInstallment
// (installment #1 case) — both now call this instead. Not used by
// setup.controller.ts:setupShop, which creates a brand-new Shop row rather
// than transitioning an existing one.
export async function activateLicense(tx: Prisma.TransactionClient, shopId: string, plan: string) {
  await tx.shop.update({ where: { id: shopId }, data: { plan, trialEndsAt: null } });
}
