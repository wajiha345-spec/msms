import { Router } from 'express';
import {
  listNotificationsHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  getAttentionItemsHandler,
} from './notifications.controller';

const router = Router();

router.get('/',              listNotificationsHandler);
router.get('/unread-count',  getUnreadCountHandler);
router.get('/attention',     getAttentionItemsHandler);
router.patch('/:id/read',    markAsReadHandler);
router.post('/mark-all-read', markAllAsReadHandler);

export default router;
