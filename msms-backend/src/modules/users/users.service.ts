import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db';

// Fixed permission set — one per Business Management route group from
// Phases 1-7. "Configurable" means the owner toggles which of these each
// role has; it isn't user-extensible.
export const PERMISSIONS = [
  'manage_accounting',
  'manage_cash_bank',
  'manage_expenses',
  'manage_income',
  'manage_customer_ledger',
  'manage_supplier_ledger',
  'manage_quotations',
  'manage_purchase_orders',
  'manage_sales_orders',
  'manage_crm',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// The 5 roles assignable to a new team member. "admin" (shop owner) is set
// only at signup (setup.controller.ts / trial.controller.ts) and is never
// assignable here — it always bypasses permission checks entirely.
export const ASSIGNABLE_ROLES = ['manager', 'cashier', 'salesperson', 'technician', 'accountant'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const DEFAULT_PERMISSIONS: Record<AssignableRole, Permission[]> = {
  manager: [...PERMISSIONS],
  accountant: ['manage_accounting', 'manage_cash_bank', 'manage_customer_ledger', 'manage_supplier_ledger'],
  cashier: ['manage_income', 'manage_customer_ledger', 'manage_crm'],
  salesperson: ['manage_quotations', 'manage_sales_orders', 'manage_customer_ledger', 'manage_crm'],
  technician: [],
};

// Lazily seeds a shop's RolePermission rows from the default matrix —
// same pattern as accounting.service.ts:ensureDefaultAccounts. Uses
// skipDuplicates rather than a count-based early return so that a *new*
// permission added to PERMISSIONS later (e.g. manage_crm) still backfills
// for shops that already seeded rows under an older, shorter PERMISSIONS
// list — otherwise those shops would be stuck with the new permission
// permanently unlisted and unlisted-therefore-denied.
export async function ensureDefaultPermissions(shopId: string) {
  const rows: { shopId: string; role: string; permission: string; allowed: boolean }[] = [];
  for (const role of ASSIGNABLE_ROLES) {
    for (const permission of PERMISSIONS) {
      rows.push({ shopId, role, permission, allowed: DEFAULT_PERMISSIONS[role].includes(permission) });
    }
  }
  await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
}

// Used by middleware/auth.ts:requirePermission — admin bypass is checked by
// the caller before this is ever invoked. Returns the up-to-date user (for
// the isActive check) alongside whether the permission is granted.
export async function checkPermission(shopId: string, userId: string, permission: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, shopId } });
  if (!user) return { isActive: false, allowed: false };
  if (!user.isActive) return { isActive: false, allowed: false };

  await ensureDefaultPermissions(shopId);
  const grant = await prisma.rolePermission.findUnique({
    where: { shopId_role_permission: { shopId, role: user.role, permission } },
  });
  return { isActive: true, allowed: grant?.allowed ?? false };
}

export async function listPermissions(shopId: string) {
  await ensureDefaultPermissions(shopId);
  return prisma.rolePermission.findMany({ where: { shopId }, orderBy: [{ role: 'asc' }, { permission: 'asc' }] });
}

export async function updatePermission(shopId: string, role: string, permission: string, allowed: boolean) {
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) throw new Error('Invalid role');
  if (!PERMISSIONS.includes(permission as Permission)) throw new Error('Invalid permission');

  await ensureDefaultPermissions(shopId);
  return prisma.rolePermission.upsert({
    where:  { shopId_role_permission: { shopId, role, permission } },
    update: { allowed },
    create: { shopId, role, permission, allowed },
  });
}

const USER_SELECT = {
  id: true, username: true, role: true, email: true, isActive: true, createdAt: true,
} as const;

export async function listUsers(shopId: string) {
  return prisma.user.findMany({ where: { shopId }, select: USER_SELECT, orderBy: { createdAt: 'asc' } });
}

interface CreateUserInput {
  username: string;
  password: string;
  role:     string;
  email?:   string;
}

export async function createUser(shopId: string, data: CreateUserInput) {
  if (!data.username?.trim() || data.username.trim().length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  if (!data.password || data.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  if (!ASSIGNABLE_ROLES.includes(data.role as AssignableRole)) {
    throw new Error(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
  }

  const existing = await prisma.user.findUnique({ where: { username: data.username.trim() } });
  if (existing) throw new Error('That username is already taken. Please choose another.');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: data.username.trim(),
      passwordHash,
      role:     data.role,
      email:    data.email?.trim() || null,
      shopId,
    },
    select: USER_SELECT,
  });
  return user;
}

export async function updateUserRole(shopId: string, actingUserId: string, targetUserId: string, role: string) {
  if (targetUserId === actingUserId) throw new Error('You cannot change your own role');
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) {
    throw new Error(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
  }
  const target = await prisma.user.findFirst({ where: { id: targetUserId, shopId } });
  if (!target) throw new Error('User not found');
  if (target.role === 'admin') throw new Error('Cannot change the shop owner\'s role');

  return prisma.user.update({ where: { id: targetUserId }, data: { role }, select: USER_SELECT });
}

export async function setUserActive(shopId: string, actingUserId: string, targetUserId: string, isActive: boolean) {
  if (targetUserId === actingUserId) throw new Error('You cannot deactivate your own account');
  const target = await prisma.user.findFirst({ where: { id: targetUserId, shopId } });
  if (!target) throw new Error('User not found');
  if (target.role === 'admin') throw new Error('Cannot deactivate the shop owner');

  return prisma.user.update({ where: { id: targetUserId }, data: { isActive }, select: USER_SELECT });
}
