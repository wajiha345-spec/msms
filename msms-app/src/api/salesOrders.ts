import { apiClient } from './client';
import { PaymentFields } from './payment';

export type SalesOrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface SalesOrderItem {
  id:             string;
  productId:      string;
  description:    string;
  quantity:       number;
  unitPrice:      number;
  createdSaleId?: string | null;
  product:        { id: string; name: string; brand: string };
}

export interface SalesOrder {
  id:             string;
  soNo:           string;
  customerName?:  string | null;
  customerPhone?: string | null;
  status:         SalesOrderStatus;
  deliveryDate?:  string | null;
  notes?:         string | null;
  createdAt:      string;
  items:          SalesOrderItem[];
  createdBy:      { username: string };
  // Payment choice made at creation — null on orders created before this
  // field existed (legacy orders still ask for payment when delivered).
  paymentMethod?: 'CASH' | 'ACCOUNT' | 'SPLIT' | null;
  cashAmount?:    number | null;
  accountId?:     string | null;
  accountAmount?: number | null;
}

export interface SoItemPayload {
  productId:   string;
  description: string;
  quantity:    number;
  unitPrice:   number;
}

export interface CreateSalesOrderPayload extends PaymentFields {
  customerName:  string;
  customerPhone: string;
  deliveryDate?: string;
  notes?:        string;
  items:         SoItemPayload[];
}

export const salesOrdersApi = {
  list: () =>
    apiClient.get<{ success: boolean; data: SalesOrder[] }>('/sales-orders'),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: SalesOrder }>(`/sales-orders/${id}`),

  create: (payload: CreateSalesOrderPayload) =>
    apiClient.post<{ success: boolean; data: SalesOrder }>('/sales-orders', payload),

  updateStatus: (id: string, status: 'PENDING' | 'PROCESSING' | 'SHIPPED') =>
    apiClient.patch<{ success: boolean; data: SalesOrder }>(`/sales-orders/${id}/status`, { status }),

  cancel: (id: string) =>
    apiClient.post<{ success: boolean; data: SalesOrder }>(`/sales-orders/${id}/cancel`),

  deliver: (id: string, payment: PaymentFields) =>
    apiClient.post<{ success: boolean; data: any[] }>(`/sales-orders/${id}/deliver`, payment),
};
