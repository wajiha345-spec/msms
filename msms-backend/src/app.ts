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
import { downloadApp }  from './modules/licenses/licenses.controller';
import { authenticate, requirePlan } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json());

// ── Public routes (no auth required) ────────────────────────────────────────
app.use('/api/auth',          authRoutes);       // login only (register removed)
app.use('/api/orders',        orderRoutes);      // website order form
app.use('/api/admin',         adminRoutes);      // protected by ADMIN_SECRET query param
app.use('/api/licenses',      licenseRoutes);    // key validation for app setup
app.use('/api/setup',         setupRoutes);      // first-time app registration
app.get('/api/download/:key', downloadApp);      // APK download (license key = access token)
app.use('/api/invoices',      invoiceRoutes);    // PDF invoices (invoice UUID = access token)

// ── SIMPLE + PRO: both plans can access these ────────────────────────────────
app.use('/api/products', authenticate, productRoutes);  // import route gated inside
app.use('/api/sales',    authenticate, saleRoutes);

// ── PRO only ─────────────────────────────────────────────────────────────────
app.use('/api/purchases',   authenticate, requirePlan('PRO'), purchaseRoutes);
app.use('/api/secondhand',  authenticate, requirePlan('PRO'), secondhandRoutes);
app.use('/api/imei',        authenticate, requirePlan('PRO'), imeiRoutes);
app.use('/api/imei-verify', authenticate, requirePlan('PRO'), imeiVerifyRoutes);
app.use('/api/dashboard',   authenticate, requirePlan('PRO'), dashboardRoutes);
app.use('/api/catalog',     authenticate, requirePlan('PRO'), catalogRoutes);

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
