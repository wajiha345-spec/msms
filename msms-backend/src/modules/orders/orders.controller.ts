import { Request, Response } from 'express';
import { ok, fail } from '../../utils/response';
import { createOrder } from './orders.service';
import { uploadToCloudinary } from '../../middleware/upload';

export async function placeOrder(req: Request, res: Response) {
  try {
    const { customerName, customerEmail, customerPhone, plan, transactionId, notes } = req.body;

    if (!customerName || !customerEmail || !customerPhone || !plan || !transactionId) {
      return fail(res, 'customerName, customerEmail, customerPhone, plan, and transactionId are required');
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(customerEmail)) return fail(res, 'Invalid email address');

    // Screenshot is mandatory — reject the order if not provided
    if (!req.file) {
      return fail(res, 'Payment screenshot is required. Please upload a screenshot of your payment confirmation.');
    }

    // Upload screenshot to Cloudinary before creating the order
    let screenshotUrl: string;
    try {
      screenshotUrl = await uploadToCloudinary(
        req.file.buffer,
        'payment-screenshots',
        `order-${Date.now()}`
      );
    } catch (uploadErr: any) {
      console.error('[Orders] Screenshot upload failed:', uploadErr?.message);
      return fail(res, 'Failed to upload screenshot. Please try again.');
    }

    const order = await createOrder({ customerName, customerEmail, customerPhone, plan, transactionId, screenshotUrl, notes });
    return ok(res, {
      orderId:  order.id,
      plan:     order.plan,
      amount:   order.amount,
      status:   order.status,
      message:  'Order received. You will get your license key by email after payment is verified.',
    });
  } catch (e: any) {
    return fail(res, e.message);
  }
}
