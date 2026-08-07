import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes       from './modules/auth/auth.routes';
import productRoutes    from './modules/products/products.routes';
import saleRoutes       from './modules/sales/sales.routes';
import purchaseRoutes   from './modules/purchases/purchases.routes';
import secondhandRoutes from './modules/secondhand/secondhand.routes';
import imeiRoutes       from './modules/imei/imei.routes';
import dashboardRoutes  from './modules/dashboard/dashboard.routes';
import invoiceRoutes    from './modules/invoices/invoices.routes';
import orderRoutes      from './modules/orders/orders.routes';
import adminRoutes      from './modules/admin/admin.routes';
import licenseRoutes    from './modules/licenses/licenses.routes';
import setupRoutes      from './modules/setup/setup.routes';
import catalogRoutes    from './modules/catalog/catalog.routes';
import imeiVerifyRoutes from './modules/imei-verify/imei-verify.routes';
import trialRoutes      from './modules/trial/trial.routes';
import accountingRoutes from './modules/accounting/accounting.routes';
import expensesRoutes   from './modules/expenses/expenses.routes';
import incomeRoutes     from './modules/income/income.routes';
import customerLedgerRoutes from './modules/customerLedger/customerLedger.routes';
import supplierLedgerRoutes from './modules/supplierLedger/supplierLedger.routes';
import cashBankRoutes       from './modules/cashBank/cashBank.routes';
import quotationRoutes      from './modules/quotations/quotations.routes';
import purchaseOrderRoutes  from './modules/purchaseOrders/purchaseOrders.routes';
import salesOrderRoutes     from './modules/salesOrders/salesOrders.routes';
import userRoutes           from './modules/users/users.routes';
import branchRoutes         from './modules/branches/branches.routes';
import crmRoutes            from './modules/crm/crm.routes';
import notificationRoutes   from './modules/notifications/notifications.routes';
import backupRoutes         from './modules/backup/backup.routes';
import settingsRoutes       from './modules/settings/settings.routes';
import inventoryRoutes      from './modules/inventory/inventory.routes';
import reportsRoutes        from './modules/reports/reports.routes';
import { downloadApp, downloadTrialApk } from './modules/licenses/licenses.controller';
import { authenticate, requirePlan, checkTrialExpiry, requireRole, requirePermission } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json());

// ── Public routes (no auth required) ────────────────────────────────────────
app.use('/api/auth',          authRoutes);       // login only (register removed)
app.use('/api/orders',        orderRoutes);      // website order form
app.use('/api/admin',         adminRoutes);      // protected by ADMIN_SECRET query param
app.use('/api/licenses',      licenseRoutes);    // key validation for app setup
app.use('/api/setup',         setupRoutes);      // first-time app registration + authenticated upgrade
app.use('/api/trial',         trialRoutes);      // 5-day free trial signup, no license key needed
app.get('/api/download/:key', downloadApp);      // APK download (license key = access token)
app.get('/api/download-trial', downloadTrialApk); // APK download for trial signups (no key needed)
app.use('/api/invoices',      invoiceRoutes);    // PDF invoices (invoice UUID = access token)
app.use('/api/quotations',    quotationRoutes);  // :id/view is public (quote UUID = access token); CRUD gated inside the router

// ── SIMPLE + PRO: both plans can access these ────────────────────────────────
app.use('/api/products', authenticate, checkTrialExpiry, productRoutes);  // import route gated inside
app.use('/api/sales',    authenticate, checkTrialExpiry, saleRoutes);

// ── PRO only (an active trial counts as PRO) ────────────────────────────────
app.use('/api/purchases',   authenticate, checkTrialExpiry, requirePlan('PRO'), purchaseRoutes);
app.use('/api/secondhand',  authenticate, checkTrialExpiry, requirePlan('PRO'), secondhandRoutes);
app.use('/api/imei',        authenticate, checkTrialExpiry, requirePlan('PRO'), imeiRoutes);
app.use('/api/imei-verify', authenticate, checkTrialExpiry, requirePlan('PRO'), imeiVerifyRoutes);
app.use('/api/dashboard',   authenticate, checkTrialExpiry, requirePlan('PRO'), dashboardRoutes);
app.use('/api/catalog',     authenticate, checkTrialExpiry, requirePlan('PRO'), catalogRoutes);

// ── Business Management: Accounting (PRO + owner or granted permission) ────
app.use('/api/accounting',  authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_accounting'), accountingRoutes);

// ── Business Management: Expense & Income (PRO + owner or granted permission) ──
app.use('/api/expenses',    authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_expenses'), expensesRoutes);
app.use('/api/income',      authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_income'), incomeRoutes);
app.use('/api/customer-ledger', authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_customer_ledger'), customerLedgerRoutes);
app.use('/api/supplier-ledger', authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_supplier_ledger'), supplierLedgerRoutes);

// ── Business Management: Cash & Bank (PRO + owner or granted permission) ───
app.use('/api/cash-bank',   authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_cash_bank'), cashBankRoutes);

// ── Business Management: Purchase Orders & Sales Orders (PRO + owner or granted permission) ──
app.use('/api/purchase-orders', authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_purchase_orders'), purchaseOrderRoutes);
app.use('/api/sales-orders',    authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_sales_orders'), salesOrderRoutes);

// ── Business Management: Multi-User Roles & Permissions (PRO + shop owner only) ──
app.use('/api/users',       authenticate, checkTrialExpiry, requirePlan('PRO'), requireRole('admin'), userRoutes);

// ── Business Management: Multi-Branch (PRO; list is open to any team
// member so Sale/Purchase screens can offer a branch picker, everything
// else — create/rename/deactivate/reports/reassignment — is admin-only,
// gated inside branches.routes.ts) ──────────────────────────────────────
app.use('/api/branches',    authenticate, checkTrialExpiry, requirePlan('PRO'), branchRoutes);

// ── Business Management: CRM (PRO + owner or granted permission) ───────────
app.use('/api/crm',         authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_crm'), crmRoutes);

// ── Business Management: Notifications (PRO; every user sees only their own
// userId-scoped inbox, so no permission grant is needed on top of PRO) ─────
app.use('/api/notifications', authenticate, checkTrialExpiry, requirePlan('PRO'), notificationRoutes);

// ── Business Management: Data Backup (PRO + shop owner only) ───────────────
app.use('/api/backup',      authenticate, checkTrialExpiry, requirePlan('PRO'), requireRole('admin'), backupRoutes);

// ── Business Management: Settings (PRO + shop owner only) ──────────────────
app.use('/api/settings',    authenticate, checkTrialExpiry, requirePlan('PRO'), requireRole('admin'), settingsRoutes);

// ── Business Management: Inventory Enhancements (PRO; low-stock list is open
// to any team member, reorder-point edits & stock transfer are admin-only,
// gated inside inventory.routes.ts) ─────────────────────────────────────────
app.use('/api/inventory',   authenticate, checkTrialExpiry, requirePlan('PRO'), inventoryRoutes);

// ── Business Management: Reports (PRO + owner or granted permission) ───────
// Reuses manage_accounting — the same gate the existing financial statements
// (Balance Sheet, P&L, Cash Flow, Trial Balance) already use, since this is
// conceptually the same report surface rather than a new permission tier.
app.use('/api/reports',     authenticate, checkTrialExpiry, requirePlan('PRO'), requirePermission('manage_accounting'), reportsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Temporary email diagnostic (remove after confirming emails work) ─────────
app.get('/api/health/email', async (_req, res) => {
  try {
    const { Resend } = await import('resend');
    const key = process.env.RESEND_API_KEY;
    if (!key) return res.json({ ok: false, error: 'RESEND_API_KEY is not set in environment' });

    const resend = new Resend(key);
    const result = await resend.emails.send({
      from:    'noreply@msms-app.site',
      to:      process.env.ADMIN_EMAIL!,
      subject: 'MSMS Email Test',
      html:    '<p>Test email from MSMS backend. If you see this, Resend is working!</p>',
    });
    return res.json({ ok: true, result });
  } catch (err: any) {
    return res.json({ ok: false, error: err?.message ?? String(err) });
  }
});

export default app;
