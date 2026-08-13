import { Request, Response } from 'express';
import { ok, fail } from '../../utils/response';
import { prisma } from '../../config/db';

// Platform query param (?platform=android|desktop) accepted by both download
// routes below. Omitting it shows a chooser page instead of guessing — the
// same emailed/shared link works for either platform, picked at click-time.
type Platform = 'android' | 'desktop';
function resolvePlatform(req: Request): Platform | null {
  const p = req.query.platform;
  if (p === 'android' || p === 'desktop') return p;
  return null;
}

// GET /api/download/:key
// Validates the license key and redirects to the correct APK/EXE download URL.
//
// APK_URL_SIMPLE and APK_URL_PRO can point to the same file if there is only
// one build — the plan is enforced by the license key at account setup time,
// not by separate binaries.  To use separate builds, set both env vars to
// different URLs.  If only APK_URL_PRO is set, SIMPLE customers fall back to
// that same URL (single-APK mode). EXE_URL is a single desktop build shared
// across plans — the Electron app enforces plan/trial status the same way
// the mobile app does, server-side, so there's no need for separate binaries.
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

    const platform = resolvePlatform(req);
    if (!platform) {
      return res.send(platformChooserPage(`/api/download/${encodeURIComponent(key)}`));
    }

    if (platform === 'desktop') {
      const exeUrl = process.env.EXE_URL;
      if (!exeUrl) {
        console.error('[Download] EXE_URL is not set in environment variables');
        return res.status(503).send(downloadPage(
          'Download Temporarily Unavailable',
          'The Windows download is not configured yet. Please contact support and we will send you the file directly.',
          false,
        ));
      }
      return res.redirect(exeUrl);
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

// GET /api/download-trial
// Public download for the 5-day free trial — no license key required.
// Always serves the PRO build since the trial unlocks all PRO features;
// access is gated server-side by the trial account's JWT, not the binary.
export async function downloadTrialApk(req: Request, res: Response) {
  const platform = resolvePlatform(req);
  if (!platform) {
    return res.send(platformChooserPage('/api/download-trial'));
  }

  if (platform === 'desktop') {
    const exeUrl = process.env.EXE_URL;
    if (!exeUrl) {
      console.error('[Download] EXE_URL is not set in environment variables');
      return res.status(503).send(downloadPage(
        'Download Temporarily Unavailable',
        'The Windows download is not configured yet. Please contact support and we will send you the file directly.',
        false,
      ));
    }
    return res.redirect(exeUrl);
  }

  const apkUrl = process.env.APK_URL_PRO;
  if (!apkUrl) {
    console.error('[Download] APK_URL_PRO is not set in environment variables');
    return res.status(503).send(downloadPage(
      'Download Temporarily Unavailable',
      'The download link is not configured yet. Please contact support and we will send you the file directly.',
      false,
    ));
  }
  return res.redirect(apkUrl);
}

// Simple "pick your platform" landing page — reused by both download routes
// so the same link (typed, bookmarked, or emailed) works for either
// platform; the choice is just appended as ?platform=... on the same path.
function platformChooserPage(basePath: string): string {
  const androidHref = `${basePath}${basePath.includes('?') ? '&' : '?'}platform=android`;
  const desktopHref = `${basePath}${basePath.includes('?') ? '&' : '?'}platform=desktop`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Download SmartShop</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background:#f8fafc; color:#1e293b; margin:0;
           display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#fff; border-radius:16px; border:1px solid #e2e8f0;
            box-shadow:0 4px 24px rgba(0,0,0,.08);
            max-width:460px; width:100%; padding:48px 36px; text-align:center; }
    .icon { font-size:52px; margin-bottom:20px; }
    h2 { font-size:22px; margin:0 0 12px; }
    p  { color:#64748b; font-size:15px; line-height:1.6; margin:0 0 28px; }
    .choices { display:flex; flex-direction:column; gap:12px; }
    .choice { display:flex; align-items:center; gap:14px; text-align:left;
              padding:16px 18px; border-radius:12px; border:1px solid #e2e8f0;
              text-decoration:none; color:#1e293b; transition:border-color .15s, background .15s; }
    .choice:hover { border-color:#2563eb; background:#f0f6ff; }
    .choice-icon { font-size:28px; }
    .choice-title { font-weight:700; font-size:15px; }
    .choice-sub { font-size:12px; color:#64748b; margin-top:2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📲</div>
    <h2>Choose your platform</h2>
    <p>The same license works on both — pick where you want to install SmartShop.</p>
    <div class="choices">
      <a class="choice" href="${androidHref}">
        <span class="choice-icon">📱</span>
        <span>
          <span class="choice-title">Android</span><br/>
          <span class="choice-sub">Download the .apk — Android 8.0 or higher</span>
        </span>
      </a>
      <a class="choice" href="${desktopHref}">
        <span class="choice-icon">🖥️</span>
        <span>
          <span class="choice-title">Windows Desktop</span><br/>
          <span class="choice-sub">Download the .exe installer — Windows 10/11</span>
        </span>
      </a>
    </div>
  </div>
</body>
</html>`;
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
