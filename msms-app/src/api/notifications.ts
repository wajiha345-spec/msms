import { apiClient } from './client';

export interface Notification {
  id:         string;
  type:       'LOW_STOCK' | 'SALE_RECORDED' | 'PURCHASE_RECORDED' | 'PURCHASE_ORDER_RECEIVED';
  title:      string;
  message:    string;
  entityType?: string | null;
  entityId?:   string | null;
  isRead:     boolean;
  createdAt:  string;
}

export interface OverdueInstallment {
  saleId:        string;
  invoiceNo:     string;
  customerName:  string | null;
  customerPhone: string | null;
  pendingAmount: number;
  dueDate:       string | null;
  installmentNumber: number;
}

export interface OverdueFollowUp {
  interactionId: string;
  text:          string;
  followUpDate:  string | null;
  customer:      { id: string; name: string; phone: string };
}

export interface UpcomingLicenseInstallment {
  installmentNumber: number;
  amount:             number;
  dueDate:            string | null;
}

export interface AttentionItems {
  overdueInstallments: OverdueInstallment[];
  dueSoonInstallments: OverdueInstallment[];
  overdueFollowUps:    OverdueFollowUp[];
  upcomingLicenseInstallment: UpcomingLicenseInstallment | null;
}

export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    apiClient.get<{ success: boolean; data: Notification[] }>('/notifications', {
      params: unreadOnly ? { unreadOnly: 'true' } : undefined,
    }),

  getUnreadCount: () =>
    apiClient.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count'),

  getAttentionItems: () =>
    apiClient.get<{ success: boolean; data: AttentionItems }>('/notifications/attention'),

  markAsRead: (id: string) =>
    apiClient.patch<{ success: boolean; data: Notification }>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.post<{ success: boolean; data: { marked: boolean } }>('/notifications/mark-all-read'),
};
