import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import { uploadToCloudinary } from '../../middleware/upload';
import { startPlan, getStatus, submitInstallment, submitPublicInstallment } from './licenseInstallments.service';

async function uploadProof(req: Request, tag: string): Promise<string> {
  if (!req.file) throw new Error('Payment screenshot is required. Please upload a screenshot of your payment confirmation.');
  return uploadToCloudinary(req.file.buffer, 'license-installments', `${tag}-${Date.now()}`);
}

export async function start(req: AuthRequest, res: Response) {
  try {
    const { transactionId } = req.body;
    if (!transactionId?.trim()) return fail(res, 'Transaction ID is required');

    let screenshotUrl: string;
    try {
      screenshotUrl = await uploadProof(req, `installment-${req.user!.shopId}-1`);
    } catch (e: any) {
      return fail(res, e.message);
    }

    const result = await startPlan(req.user!.shopId, { transactionId, screenshotUrl });
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function status(req: AuthRequest, res: Response) {
  try {
    const result = await getStatus(req.user!.shopId);
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function submit(req: AuthRequest, res: Response) {
  try {
    const installmentNumber = Number(req.params.number);
    if (![2, 3].includes(installmentNumber)) return fail(res, 'Invalid installment number');

    const { transactionId } = req.body;
    if (!transactionId?.trim()) return fail(res, 'Transaction ID is required');

    let screenshotUrl: string;
    try {
      screenshotUrl = await uploadProof(req, `installment-${req.user!.shopId}-${installmentNumber}`);
    } catch (e: any) {
      return fail(res, e.message);
    }

    const result = await submitInstallment(req.user!.shopId, installmentNumber, { transactionId, screenshotUrl });
    return ok(res, result);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

// Public — no session exists on the website. Identifies the shop by
// username + a loose email/phone cross-check (see
// licenseInstallments.service.ts:submitPublicInstallment for the reasoning).
// Reuses the exact same startPlan/submitInstallment logic as the
// authenticated app routes above — this only figures out *which* shop and
// *which* installment number, it doesn't duplicate any payment state logic.
export async function publicSubmit(req: Request, res: Response) {
  try {
    const { username, contact, transactionId } = req.body;
    if (!username?.trim())      return fail(res, 'Username is required');
    if (!contact?.trim())       return fail(res, 'Email or phone is required');
    if (!transactionId?.trim()) return fail(res, 'Transaction ID is required');

    let screenshotUrl: string;
    try {
      screenshotUrl = await uploadProof(req, `installment-public-${Date.now()}`);
    } catch (e: any) {
      return fail(res, e.message);
    }

    const result = await submitPublicInstallment({ username, contact, transactionId, screenshotUrl });
    return ok(res, { message: 'Payment submitted — you will be unlocked once it is approved.', installment: result });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
