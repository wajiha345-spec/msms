import { Request, Response } from 'express';
import { ok, fail } from '../../utils/response';
import { prisma } from '../../config/db';

// GET /api/download/:key
// Validates key and redirects to the APK download URL
export async function downloadApp(req: Request, res: Response) {
  try {
    const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    const license = await prisma.licenseKey.findUnique({ where: { key } });

    if (!license) {
      return res.status(404).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
          <h2>Invalid License Key</h2>
          <p>This download link is not valid. Please check your email for the correct link.</p>
        </body></html>
      `);
    }

    // Serve the correct APK based on plan
    const apkUrl =
      license.plan === 'SIMPLE'
        ? process.env.APK_URL_SIMPLE
        : process.env.APK_URL_PRO;

    if (!apkUrl) {
      return res.status(503).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
          <h2>Download Temporarily Unavailable</h2>
          <p>Please contact support.</p>
        </body></html>
      `);
    }

    return res.redirect(apkUrl);
  } catch (e: any) {
    return fail(res, e.message);
  }
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
