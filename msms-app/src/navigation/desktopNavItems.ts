// Plain data mirror of MoreMenuScreen.tsx's menu items, consumed by the
// desktop sidebar (DesktopShell.tsx) so nav-item access rules (PRO-gated,
// owner-only) are expressed once rather than reimplemented. Kept as a
// separate file rather than extracted out of MoreMenuScreen.tsx itself —
// that screen is working, tested mobile UI and touching it isn't needed
// to reuse its data here. Keep in sync with MoreMenuScreen.tsx if items
// there change.
export interface DesktopNavItem {
  icon: string;
  label: string;
  subtitle: string;
  ownerOnly?: boolean;
  tab: 'MoreTab' | 'ProductsTab' | 'SalesTab';
  screen: string;
}

// All PRO-gated, same as every item in MoreMenuScreen's "Features" section.
export const desktopFeatureNavItems: DesktopNavItem[] = [
  { icon: '🔔', label: 'Notifications', subtitle: 'Low stock, team activity & overdue reminders', tab: 'MoreTab', screen: 'Notifications' },
  { icon: '📱', label: '2nd Hand Records', subtitle: 'Buy, track and sell secondhand phones', tab: 'MoreTab', screen: 'SecondhandList' },
  { icon: '🔍', label: 'IMEI Search', subtitle: 'Check IMEI details and history', tab: 'MoreTab', screen: 'ImeiSearch' },
  { icon: '📥', label: 'Import Products (CSV)', subtitle: 'Bulk-add hundreds of products at once', tab: 'ProductsTab', screen: 'ImportProducts' },
  { icon: '📜', label: 'Import Sales History (CSV)', subtitle: 'Bring in past sales/customers from another app', tab: 'SalesTab', screen: 'ImportSalesHistory' },
  { icon: '🗄️', label: 'Product Catalog', subtitle: 'View and delete shared barcode catalog entries', tab: 'MoreTab', screen: 'Catalog' },
  { icon: '🧾', label: 'Expenses', subtitle: 'Record and categorize business expenses', tab: 'MoreTab', screen: 'ExpensesList' },
  { icon: '💵', label: 'Income', subtitle: 'Record service, rental & other income', tab: 'MoreTab', screen: 'IncomeList' },
  { icon: '👤', label: 'Customers (CRM)', subtitle: 'Profiles, tags, notes & follow-up reminders', tab: 'MoreTab', screen: 'CustomersList' },
  { icon: '🧑‍🤝‍🧑', label: 'Customer Ledger', subtitle: 'Credit sales, payments & outstanding balances', tab: 'MoreTab', screen: 'CustomerLedgerList' },
  { icon: '🗓️', label: 'Due Installments', subtitle: '1st/2nd/3rd installment payments, mark paid', tab: 'MoreTab', screen: 'DueInstallments' },
  { icon: '🚚', label: 'Supplier Ledger', subtitle: 'Credit purchases, payments & outstanding balances', tab: 'MoreTab', screen: 'SupplierLedgerList' },
  { icon: '📋', label: 'Quotations', subtitle: 'Create quotes and convert them to sales', tab: 'MoreTab', screen: 'QuotationsList' },
  { icon: '📥', label: 'Purchase Orders', subtitle: 'Order stock from suppliers, receive goods (partial OK)', tab: 'MoreTab', screen: 'PurchaseOrdersList' },
  { icon: '📤', label: 'Sales Orders', subtitle: 'Track confirmed orders through delivery', tab: 'MoreTab', screen: 'SalesOrdersList' },
  { icon: '📉', label: 'Low Stock', subtitle: 'Products at or below their reorder point', tab: 'MoreTab', screen: 'LowStock' },
  { icon: '🔀', label: 'Transfer Stock', subtitle: 'Move stock between branches', tab: 'MoreTab', screen: 'TransferStock' },
  { icon: '📑', label: 'Reports', subtitle: 'Sales, financial, expense/income & inventory reports', tab: 'MoreTab', screen: 'ReportsHub' },
];

// PRO-gated AND owner-only, same as MoreMenuScreen's "Business Management" section.
export const desktopBusinessNavItems: DesktopNavItem[] = [
  { icon: '💼', label: 'Business Management', subtitle: 'Chart of accounts, journal entries & trial balance', ownerOnly: true, tab: 'MoreTab', screen: 'BusinessManagement' },
  { icon: '🏦', label: 'Cash & Bank', subtitle: 'Deposits, withdrawals, transfers & reconciliation', ownerOnly: true, tab: 'MoreTab', screen: 'CashBankList' },
  { icon: '👥', label: 'Team Members', subtitle: 'Add staff accounts and manage their roles', ownerOnly: true, tab: 'MoreTab', screen: 'TeamMembersList' },
  { icon: '🔐', label: 'Role Permissions', subtitle: 'Choose what each role can access', ownerOnly: true, tab: 'MoreTab', screen: 'RolePermissions' },
  { icon: '🏬', label: 'Branches', subtitle: 'Manage locations, branch reports & stock assignment', ownerOnly: true, tab: 'MoreTab', screen: 'BranchesList' },
  { icon: '💾', label: 'Backup & Export', subtitle: 'Download a full backup of your shop data', ownerOnly: true, tab: 'MoreTab', screen: 'Backup' },
  { icon: '⚙️', label: 'Settings', subtitle: 'Low stock alerts, shop contact info & invoice notes', ownerOnly: true, tab: 'MoreTab', screen: 'Settings' },
];
