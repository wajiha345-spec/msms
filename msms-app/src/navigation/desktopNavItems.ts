import { Ionicons } from '@expo/vector-icons';

// Plain data mirror of MoreMenuScreen.tsx's menu items, consumed by the
// desktop sidebar (DesktopShell.tsx) so nav-item access rules (PRO-gated,
// owner-only) are expressed once rather than reimplemented. Kept as a
// separate file rather than extracted out of MoreMenuScreen.tsx itself —
// that screen is working, tested mobile UI and touching it isn't needed
// to reuse its data here. Keep in sync with MoreMenuScreen.tsx if items
// there change.
export interface DesktopNavItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  ownerOnly?: boolean;
  tab: 'MoreTab' | 'ProductsTab' | 'SalesTab';
  screen: string;
}

// All PRO-gated, same as every item in MoreMenuScreen's "Features" section.
export const desktopFeatureNavItems: DesktopNavItem[] = [
  { icon: 'notifications-outline', label: 'Notifications', subtitle: 'Low stock, team activity & overdue reminders', tab: 'MoreTab', screen: 'Notifications' },
  { icon: 'phone-portrait-outline', label: '2nd Hand Records', subtitle: 'Buy, track and sell secondhand phones', tab: 'MoreTab', screen: 'SecondhandList' },
  { icon: 'search-outline', label: 'IMEI Search', subtitle: 'Check IMEI details and history', tab: 'MoreTab', screen: 'ImeiSearch' },
  { icon: 'cloud-upload-outline', label: 'Import Products (CSV)', subtitle: 'Bulk-add hundreds of products at once', tab: 'ProductsTab', screen: 'ImportProducts' },
  { icon: 'document-text-outline', label: 'Import Sales History (CSV)', subtitle: 'Bring in past sales/customers from another app', tab: 'SalesTab', screen: 'ImportSalesHistory' },
  { icon: 'albums-outline', label: 'Product Catalog', subtitle: 'View and delete shared barcode catalog entries', tab: 'MoreTab', screen: 'Catalog' },
  { icon: 'receipt-outline', label: 'Expenses', subtitle: 'Record and categorize business expenses', tab: 'MoreTab', screen: 'ExpensesList' },
  { icon: 'wallet-outline', label: 'Income', subtitle: 'Record service, rental & other income', tab: 'MoreTab', screen: 'IncomeList' },
  { icon: 'person-outline', label: 'Customers (CRM)', subtitle: 'Profiles, tags, notes & follow-up reminders', tab: 'MoreTab', screen: 'CustomersList' },
  { icon: 'people-outline', label: 'Customer Ledger', subtitle: 'Credit sales, payments & outstanding balances', tab: 'MoreTab', screen: 'CustomerLedgerList' },
  { icon: 'calendar-outline', label: 'Due Installments', subtitle: '1st/2nd/3rd installment payments, mark paid', tab: 'MoreTab', screen: 'DueInstallments' },
  { icon: 'business-outline', label: 'Supplier Ledger', subtitle: 'Credit purchases, payments & outstanding balances', tab: 'MoreTab', screen: 'SupplierLedgerList' },
  { icon: 'clipboard-outline', label: 'Quotations', subtitle: 'Create quotes and convert them to sales', tab: 'MoreTab', screen: 'QuotationsList' },
  { icon: 'cloud-download-outline', label: 'Purchase Orders', subtitle: 'Order stock from suppliers, receive goods (partial OK)', tab: 'MoreTab', screen: 'PurchaseOrdersList' },
  { icon: 'paper-plane-outline', label: 'Sales Orders', subtitle: 'Track confirmed orders through delivery', tab: 'MoreTab', screen: 'SalesOrdersList' },
  { icon: 'trending-down-outline', label: 'Low Stock', subtitle: 'Products at or below their reorder point', tab: 'MoreTab', screen: 'LowStock' },
  { icon: 'swap-horizontal-outline', label: 'Transfer Stock', subtitle: 'Move stock between branches', tab: 'MoreTab', screen: 'TransferStock' },
  { icon: 'bar-chart-outline', label: 'Reports', subtitle: 'Sales, financial, expense/income & inventory reports', tab: 'MoreTab', screen: 'ReportsHub' },
];

// PRO-gated AND owner-only, same as MoreMenuScreen's "Business Management" section.
export const desktopBusinessNavItems: DesktopNavItem[] = [
  { icon: 'briefcase-outline', label: 'Business Management', subtitle: 'Chart of accounts, journal entries & trial balance', ownerOnly: true, tab: 'MoreTab', screen: 'BusinessManagement' },
  { icon: 'card-outline', label: 'Cash & Bank', subtitle: 'Deposits, withdrawals, transfers & reconciliation', ownerOnly: true, tab: 'MoreTab', screen: 'CashBankList' },
  { icon: 'people-circle-outline', label: 'Team Members', subtitle: 'Add staff accounts and manage their roles', ownerOnly: true, tab: 'MoreTab', screen: 'TeamMembersList' },
  { icon: 'lock-closed-outline', label: 'Role Permissions', subtitle: 'Choose what each role can access', ownerOnly: true, tab: 'MoreTab', screen: 'RolePermissions' },
  { icon: 'storefront-outline', label: 'Branches', subtitle: 'Manage locations, branch reports & stock assignment', ownerOnly: true, tab: 'MoreTab', screen: 'BranchesList' },
  { icon: 'save-outline', label: 'Backup & Export', subtitle: 'Download a full backup of your shop data', ownerOnly: true, tab: 'MoreTab', screen: 'Backup' },
  { icon: 'settings-outline', label: 'Settings', subtitle: 'Low stock alerts, shop contact info & invoice notes', ownerOnly: true, tab: 'MoreTab', screen: 'Settings' },
];
