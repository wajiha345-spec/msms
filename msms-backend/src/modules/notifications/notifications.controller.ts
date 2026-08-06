import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getAttentionItems,
} from './notifications.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function listNotificationsHandler(req: AuthRequest, res: Response) {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const notifications = await listNotifications(req.user!.shopId, req.user!.userId, unreadOnly);
    return ok(res, notifications);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getUnreadCountHandler(req: AuthRequest, res: Response) {
  try {
    const count = await getUnreadCount(req.user!.shopId, req.user!.userId);
    return ok(res, { count });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function markAsReadHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const notification = await markAsRead(req.user!.shopId, req.user!.userId, id);
    return ok(res, notification);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function markAllAsReadHandler(req: AuthRequest, res: Response) {
  try {
    await markAllAsRead(req.user!.shopId, req.user!.userId);
    return ok(res, { marked: true });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getAttentionItemsHandler(req: AuthRequest, res: Response) {
  try {
    const items = await getAttentionItems(req.user!.shopId);
    return ok(res, items);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
