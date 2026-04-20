import { Request, Response } from 'express';
import { ok, fail } from '../../utils/response';
import { createOrder } from './orders.service';

export async function placeOrder(req: Request, res: Response) {
  try {
    const { customerName, customerEmail, customerPhone, plan, transactionId, notes } = req.body;

    if (!customerName || !customerEmail || !customerPhone || !plan || !transactionId) {
      return fail(res, 'customerName, customerEmail, customerPhone, plan, and transactionId are required');
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(customerEmail)) return fail(res, 'Invalid email address');

    const order = await createOrder({ customerName, customerEmail, customerPhone, plan, transactionId, notes });
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
