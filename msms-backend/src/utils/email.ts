import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not your login password)
    },
    // Hard timeouts so a bad Gmail SMTP connection never hangs the HTTP request
    connectionTimeout: 8000,   // 8s to establish TCP connection
    greetingTimeout:   8000,   // 8s to receive SMTP greeting
    socketTimeout:     10000,  // 10s of inactivity before giving up
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
  screenshotUrl?: string | null;
}) {
  const secret     = encodeURIComponent(process.env.ADMIN_SECRET ?? '');
  const approveUrl = `${process.env.BACKEND_URL}/api/admin/orders/${order.id}/approve?secret=${secret}`;
  const listUrl    = `${process.env.BACKEND_URL}/api/admin/orders?secret=${secret}&status=PENDING`;

  await createTransport().sendMail({
    from:    `"MSMS Orders" <${process.env.EMAIL_USER}>`,
    to:      process.env.ADMIN_EMAIL,
    subject: `New Order — ${order.plan} Plan — Rs ${order.amount.toLocaleString()} — ${order.customerName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                  max-width:540px;margin:0 auto;color:#1e293b">
        <h2 style="margin:0 0 4px">New Order Received</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 20px">
          Verify the payment below and click Approve to send the customer their license key.
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
          <tr style="background:#f8fafc">
            <td style="padding:10px 12px;color:#64748b;width:36%">Customer</td>
            <td style="padding:10px 12px;font-weight:600">${order.customerName}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;color:#64748b">Email</td>
            <td style="padding:10px 12px">${order.customerEmail}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:10px 12px;color:#64748b">Phone</td>
            <td style="padding:10px 12px">${order.customerPhone}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;color:#64748b">Plan</td>
            <td style="padding:10px 12px;font-weight:700;color:#0f766e">${order.plan}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:10px 12px;color:#64748b">Amount</td>
            <td style="padding:10px 12px;font-weight:700">Rs ${order.amount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;color:#64748b">Transaction ID</td>
            <td style="padding:10px 12px;font-family:monospace">${order.transactionId ?? '—'}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:10px 12px;color:#64748b">Order ID</td>
            <td style="padding:10px 12px;font-family:monospace;font-size:12px">${order.id}</td>
          </tr>
        </table>

        ${order.screenshotUrl ? `
        <div style="margin-bottom:24px">
          <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 8px">
            Payment Screenshot (verify before approving):
          </p>
          <a href="${order.screenshotUrl}" target="_blank">
            <img src="${order.screenshotUrl}"
                 alt="Payment screenshot"
                 style="max-width:100%;border-radius:10px;border:2px solid #e2e8f0;display:block" />
          </a>
          <p style="font-size:11px;color:#94a3b8;margin:6px 0 0">
            Click image to open full size in browser.
          </p>
        </div>
        ` : `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin-bottom:24px">
          <p style="margin:0;color:#c2410c;font-size:13px;font-weight:600">
            ⚠️ No payment screenshot was uploaded with this order.
          </p>
        </div>
        `}

        <a href="${approveUrl}"
           style="display:inline-block;background:#16a34a;color:#fff;
                  padding:13px 28px;border-radius:9px;text-decoration:none;
                  font-weight:700;font-size:15px;margin-right:10px">
          Approve &amp; Send License
        </a>
        <a href="${listUrl}"
           style="display:inline-block;background:#e2e8f0;color:#1e293b;
                  padding:13px 20px;border-radius:9px;text-decoration:none;
                  font-weight:600;font-size:14px">
          View All Orders
        </a>

        <p style="color:#94a3b8;font-size:12px;margin-top:20px;line-height:1.6">
          Clicking Approve will mark the order as paid, generate a license key,
          and email it to the customer automatically.<br/>
          If the email fails for any reason, a Resend button will appear on the approval page.
        </p>
      </div>
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

// ── Alert admin when IMEI API credit is running low ──────────────────────────
export async function sendImeiLowBalanceEmail(info: {
  balance:  number;
  currency: string;
  critical: boolean;   // true when ≤ $2
}) {
  const to = process.env.IMEI_ALERT_EMAIL ?? process.env.ADMIN_EMAIL;
  const urgency = info.critical
    ? { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '🚨', label: 'CRITICAL — Almost Empty' }
    : { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '⚠️', label: 'Low Balance Warning' };

  await createTransport().sendMail({
    from:    `"MSMS Alert" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${urgency.icon} IMEI API Balance ${urgency.label} — ${info.currency} ${info.balance.toFixed(2)} remaining`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                  max-width:520px;margin:0 auto;color:#1e293b">
        <div style="background:${urgency.bg};border:1px solid ${urgency.border};border-radius:12px;
                    padding:20px 24px;margin-bottom:20px">
          <h2 style="margin:0 0 6px;color:${urgency.color}">${urgency.icon} IMEI API — ${urgency.label}</h2>
          <p style="margin:0;color:${urgency.color};font-size:14px">
            ${info.critical
              ? 'Your imeicheck.net balance is nearly empty. Recharge now to avoid IMEI lookups stopping completely.'
              : 'Your imeicheck.net balance is getting low. Recharge soon to keep IMEI lookups working.'}
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
          <tr style="background:#f8fafc">
            <td style="padding:10px 12px;color:#64748b;width:40%">Remaining Balance</td>
            <td style="padding:10px 12px;font-weight:700;font-size:18px;color:${urgency.color}">
              ${info.currency} ${info.balance.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;color:#64748b">Alert Time</td>
            <td style="padding:10px 12px">${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} PKT</td>
          </tr>
        </table>

        <a href="https://imeicheck.net/dashboard"
           style="display:inline-block;background:#2563eb;color:#fff;
                  padding:13px 28px;border-radius:9px;text-decoration:none;
                  font-weight:700;font-size:15px">
          Recharge at imeicheck.net →
        </a>

        <div style="background:#f1f5f9;border-radius:10px;padding:14px 16px;
                    font-size:13px;color:#475569;line-height:1.7;margin-top:20px">
          <strong>Reminder:</strong> After recharging, no redeployment or code change is needed.
          IMEI lookups resume automatically on the next check.
        </div>

        <p style="color:#94a3b8;font-size:12px;margin-top:16px">
          ${info.critical
            ? 'This alert repeats every 6 hours while balance remains critical.'
            : 'This alert repeats once per day while balance remains below $5.'}
        </p>
      </div>
    `,
  });
}

// ── Alert admin when IMEI API has a problem ───────────────────────────────────
export async function sendImeiApiAlertEmail(issue: {
  reason:   string;   // human-readable cause
  httpCode: number;
  imei:     string;
}) {
  await createTransport().sendMail({
    from:    `"MSMS Alert" <${process.env.EMAIL_USER}>`,
    to:      process.env.ADMIN_EMAIL,
    subject: `⚠️ IMEI API Issue — ${issue.reason}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                  max-width:520px;margin:0 auto;color:#1e293b">
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;
                    padding:20px 24px;margin-bottom:20px">
          <h2 style="margin:0 0 6px;color:#c2410c">⚠️ IMEI API Alert</h2>
          <p style="margin:0;color:#92400e;font-size:14px">
            The imeicheck.net API returned an error. IMEI lookups are falling back
            to basic TAC prefix detection (brand only, no model).
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
          <tr style="background:#f8fafc">
            <td style="padding:10px 12px;color:#64748b;width:36%">Problem</td>
            <td style="padding:10px 12px;font-weight:700;color:#c2410c">${issue.reason}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;color:#64748b">HTTP Status</td>
            <td style="padding:10px 12px;font-family:monospace">${issue.httpCode}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:10px 12px;color:#64748b">Triggered by IMEI</td>
            <td style="padding:10px 12px;font-family:monospace">${issue.imei}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;color:#64748b">Time</td>
            <td style="padding:10px 12px">${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} PKT</td>
          </tr>
        </table>

        <div style="background:#f1f5f9;border-radius:10px;padding:16px;font-size:13px;color:#475569;line-height:1.7">
          <strong>What to do:</strong><br/>
          • If credits exhausted — recharge your balance at
            <a href="https://imeicheck.net/dashboard" style="color:#2563eb">imeicheck.net/dashboard</a>.
            <strong>No redeployment needed</strong> — the API will resume automatically after recharge.<br/>
          • If rate limited — wait a few minutes and checks will resume.<br/>
          • If API key invalid — update <code>IMEI_API_KEY</code> in your server environment variables.
        </div>

        <p style="color:#94a3b8;font-size:12px;margin-top:16px">
          This alert is sent once per hour maximum. IMEI checks are still working
          using the offline TAC prefix fallback.
        </p>
      </div>
    `,
  });
}
