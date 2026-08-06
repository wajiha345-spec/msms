import { apiClient } from './client';

export type AssignableRole = 'manager' | 'cashier' | 'salesperson' | 'technician' | 'accountant';

export const ASSIGNABLE_ROLES: AssignableRole[] = ['manager', 'cashier', 'salesperson', 'technician', 'accountant'];

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
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  manage_accounting:       'Accounting',
  manage_cash_bank:        'Cash & Bank',
  manage_expenses:         'Expenses',
  manage_income:           'Income',
  manage_customer_ledger:  'Customer Ledger',
  manage_supplier_ledger:  'Supplier Ledger',
  manage_quotations:       'Quotations',
  manage_purchase_orders:  'Purchase Orders',
  manage_sales_orders:     'Sales Orders',
};

export interface TeamMember {
  id:        string;
  username:  string;
  role:      string;
  email?:    string | null;
  isActive:  boolean;
  createdAt: string;
}

export interface RolePermissionRow {
  id:         string;
  role:       string;
  permission: string;
  allowed:    boolean;
}

export interface CreateTeamMemberPayload {
  username: string;
  password: string;
  role:     AssignableRole;
  email?:   string;
}

export const usersApi = {
  list: () =>
    apiClient.get<{ success: boolean; data: TeamMember[] }>('/users'),

  create: (payload: CreateTeamMemberPayload) =>
    apiClient.post<{ success: boolean; data: TeamMember }>('/users', payload),

  updateRole: (id: string, role: AssignableRole) =>
    apiClient.patch<{ success: boolean; data: TeamMember }>(`/users/${id}/role`, { role }),

  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<{ success: boolean; data: TeamMember }>(`/users/${id}/active`, { isActive }),

  listPermissions: () =>
    apiClient.get<{ success: boolean; data: RolePermissionRow[] }>('/users/permissions'),

  updatePermission: (role: AssignableRole, permission: Permission, allowed: boolean) =>
    apiClient.patch<{ success: boolean; data: RolePermissionRow }>('/users/permissions', { role, permission, allowed }),
};
