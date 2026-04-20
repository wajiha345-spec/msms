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
import { downloadApp }  from './modules/licenses/licenses.controller';
import { authenticate } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json());

// ── Public routes (no auth) ──────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/orders',   orderRoutes);      // website order form
app.use('/api/admin',    adminRoutes);      // protected by ADMIN_SECRET query param
app.use('/api/licenses', licenseRoutes);    // key validation for app setup
app.use('/api/setup',    setupRoutes);      // first-time app registration
app.get('/api/download/:key', downloadApp); // APK download (key = access token)
app.use('/api/invoices', invoiceRoutes);    // PDF invoices (UUID = access token)

// ── Authenticated routes ─────────────────────────────────────────────────────
app.use('/api/products',   authenticate, productRoutes);
app.use('/api/sales',      authenticate, saleRoutes);
app.use('/api/purchases',  authenticate, purchaseRoutes);
app.use('/api/secondhand', authenticate, secondhandRoutes);
app.use('/api/imei',       authenticate, imeiRoutes);
app.use('/api/dashboard',  authenticate, dashboardRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default app;
