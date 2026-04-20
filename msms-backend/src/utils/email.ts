import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not your login password)
    },
  });
}

const PRICES = { SIMPLE: 2500, PRO: 6000 };

// ── Notify admin of a new order ──────────────────────────────────────────────
export async function sendAdminNewOrderEmail(order: {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  plan: string;
  amount: number;
  transactionId?: string | null;
}) {
  const approveUrl =
    `${process.env.BACKEND_URL}/api/admin/orders/${order.id}/approve` +
    `?secret=${process.env.ADMIN_SECRET}`;

  await createTransport().sendMail({
    from: `"MSMS System" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `💰 New Order — ${order.plan} Plan (Rs ${order.amount.toLocaleString()})`,
    html: `
      <h2>New Order Received</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px">
        <tr><td style="padding:8px;color:#6b7280">Customer</td><td style="padding:8px;font-weight:600">${order.customerName}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Email</td><td style="padding:8px">${order.customerEmail}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Phone</td><td style="padding:8px">${order.customerPhone}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Plan</td><td style="padding:8px;font-weight:600">${order.plan}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Amount</td><td style="padding:8px;font-weight:600">Rs ${order.amount.toLocaleString()}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Transaction ID</td><td style="padding:8px">${order.transactionId || '—'}</td></tr>
      </table>
      <br/>
      <p>Once you verify the payment, click the button below to approve the order and automatically send the customer their license key.</p>
      <a href="${approveUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">
        ✅ Approve &amp; Send License Key
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:16px">Order ID: ${order.id}</p>
    `,
  });
}

// ── Send license key + download link to customer ─────────────────────────────
export async function sendLicenseEmail(customer: {
  name: string;
  email: string;
  plan: string;
  licenseKey: string;
}) {
  const downloadUrl = `${process.env.BACKEND_URL}/api/download/${customer.licenseKey}`;

  await createTransport().sendMail({
    from: `"MSMS" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: '🎉 Your MSMS License Key & Download Link',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1e293b">Thank you, ${customer.name}!</h2>
        <p>Your payment has been verified. Here is your <strong>${customer.plan} Plan</strong> license.</p>

        <div style="background:#f1f5f9;border-radius:10px;padding:20px;margin:20px 0;text-align:center">
          <p style="margin:0 0 6px;color:#64748b;font-size:13px">YOUR LICENSE KEY</p>
          <p style="font-size:20px;font-weight:700;letter-spacing:2px;color:#1e293b;margin:0;font-family:monospace">${customer.licenseKey}</p>
        </div>

        <h3>How to get started:</h3>
        <ol style="line-height:2">
          <li>Click the download button below to download the app</li>
          <li>Install the APK on your Android phone</li>
          <li>Open the app and enter your license key</li>
          <li>Set your shop name, username, and password</li>
          <li>You're ready to go!</li>
        </ol>

        <a href="${downloadUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;margin:16px 0">
          📲 Download MSMS App
        </a>

        <p style="color:#64748b;font-size:13px">The download link is tied to your license key. Keep your license key safe — you will need it to set up the app.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#94a3b8;font-size:12px">If you have any issues, reply to this email for support.</p>
      </div>
    `,
  });
}

// ── Confirm order received (while payment is being verified) ─────────────────
export async function sendOrderReceivedEmail(customer: {
  name: string;
  email: string;
  plan: string;
  amount: number;
  orderId: string;
}) {
  await createTransport().sendMail({
    from: `"MSMS" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: 'Order Received — MSMS',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1e293b">Hi ${customer.name},</h2>
        <p>We have received your order for the <strong>${customer.plan} Plan</strong> (Rs ${customer.amount.toLocaleString()}).</p>
        <p>We are verifying your payment. Once confirmed, you will receive your license key and download link at this email address — usually within a few hours.</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#64748b;font-size:13px">Order Reference</p>
          <p style="margin:4px 0 0;font-weight:700;font-family:monospace">${customer.orderId}</p>
        </div>
        <p style="color:#64748b;font-size:13px">Keep this email for your records. If you don't hear back within 24 hours, reply to this email.</p>
      </div>
    `,
  });
}
