import { Request, Response } from 'express';
import { ok, fail } from '../../utils/response';
import { prisma } from '../../config/db';

// GET /api/download/:key
// Validates the license key and redirects to the correct APK download URL.
//
// APK_URL_SIMPLE and APK_URL_PRO can point to the same file if there is only
// one build — the plan is enforced by the license key at account setup time,
// not by separate binaries.  To use separate builds, set both env vars to
// different URLs.  If only APK_URL_PRO is set, SIMPLE customers fall back to
// that same URL (single-APK mode).
export async function downloadApp(req: Request, res: Response) {
  try {
    const key     = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    const license = await prisma.licenseKey.findUnique({ where: { key } });

    if (!license) {
      return res.status(404).send(downloadPage(
        '404 — Invalid Download Link',
        'This download link is not valid or has already been used. Please check your email for the correct link.',
        false,
      ));
    }

    // Resolve APK URL: prefer plan-specific URL, fall back to PRO URL (single-APK mode)
    const apkUrl =
      (license.plan === 'SIMPLE' && process.env.APK_URL_SIMPLE)
        ? process.env.APK_URL_SIMPLE
        : process.env.APK_URL_PRO;

    if (!apkUrl) {
      console.error('[Download] APK_URL_PRO is not set in environment variables');
      return res.status(503).send(downloadPage(
        'Download Temporarily Unavailable',
        'The download link is not configured yet. Please contact support and we will send you the file directly.',
        false,
      ));
    }

    return res.redirect(apkUrl);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

function downloadPage(title: string, message: string, success: boolean): string {
  const icon = success ? '✅' : '⚠️';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background:#f8fafc; color:#1e293b; margin:0;
           display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#fff; border-radius:16px; border:1px solid #e2e8f0;
            box-shadow:0 4px 24px rgba(0,0,0,.08);
            max-width:440px; width:100%; padding:48px 36px; text-align:center; }
    .icon { font-size:52px; margin-bottom:20px; }
    h2 { font-size:22px; margin:0 0 12px; }
    p  { color:#64748b; font-size:15px; line-height:1.65; margin:0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

// GET /api/licenses/validate/:key
// Called by the app during first-time setup to verify the key before registration
export async function validateKey(req: Request, res: Response) {
  try {
    const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    const license = await prisma.licenseKey.findUnique({
      where:   { key },
      include: { order: { select: { customerName: true, customerEmail: true } } },
    });

    if (!license) return fail(res, 'Invalid license key', 404);
    if (license.isActivated) return fail(res, 'This license key has already been used', 409);

    return ok(res, {
      plan:         license.plan,
      customerName: (license as any).order.customerName,
    });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
