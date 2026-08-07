import { prisma } from '../../config/db';

// Lazy-seeded, one row per shop — same pattern as
// accounting.service.ts:ensureDefaultAccounts.
export async function ensureSettings(shopId: string) {
  const existing = await prisma.shopSettings.findUnique({ where: { shopId } });
  if (existing) return existing;
  return prisma.shopSettings.create({ data: { shopId } });
}

export async function getSettings(shopId: string) {
  return ensureSettings(shopId);
}

interface UpdateSettingsInput {
  lowStockThreshold?: number;
  shopAddress?:       string | null;
  shopPhone?:          string | null;
  invoiceFooterNote?: string | null;
}

export async function updateSettings(shopId: string, data: UpdateSettingsInput) {
  if (data.lowStockThreshold != null && data.lowStockThreshold < 0) {
    throw new Error('Low stock threshold cannot be negative');
  }
  await ensureSettings(shopId);
  return prisma.shopSettings.update({
    where: { shopId },
    data: {
      ...(data.lowStockThreshold != null ? { lowStockThreshold: data.lowStockThreshold } : {}),
      ...(data.shopAddress       !== undefined ? { shopAddress: data.shopAddress || null } : {}),
      ...(data.shopPhone         !== undefined ? { shopPhone: data.shopPhone || null } : {}),
      ...(data.invoiceFooterNote !== undefined ? { invoiceFooterNote: data.invoiceFooterNote || null } : {}),
    },
  });
}

// Used by notifications.service.ts and pdf.ts call sites — safe to call from
// public/unauthenticated routes (invoice/quotation view) since it only ever
// reads cosmetic, non-sensitive fields. Never seeds (read-only fast path);
// callers that need seeding guarantees use getSettings/ensureSettings.
export async function getSettingsOrDefault(shopId: string) {
  const existing = await prisma.shopSettings.findUnique({ where: { shopId } });
  return existing ?? { lowStockThreshold: 2, shopAddress: null, shopPhone: null, invoiceFooterNote: null };
}
