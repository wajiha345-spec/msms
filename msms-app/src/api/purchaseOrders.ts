import { apiClient } from './client';

export type PurchaseOrderStatus = 'DRAFT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id:               string;
  productId:        string;
  description:      string;
  quantityOrdered:  number;
  quantityReceived: number;
  unitPrice:        number;
  product:          { id: string; name: string; brand: string };
}

export interface PurchaseOrder {
  id:             string;
  poNo:           string;
  supplierName?:  string | null;
  supplierPhone?: string | null;
  status:         PurchaseOrderStatus;
  expectedDate?:  string | null;
  notes?:         string | null;
  createdAt:      string;
  items:          PurchaseOrderItem[];
  createdBy:      { username: string };
}

export interface PoItemPayload {
  productId:       string;
  description:     string;
  quantityOrdered: number;
  unitPrice:       number;
}

export interface CreatePurchaseOrderPayload {
  supplierName:  string;
  supplierPhone: string;
  expectedDate?: string;
  notes?:        string;
  items:         PoItemPayload[];
}

export interface ReceiveGoodsPayload {
  receipts:     { itemId: string; quantity: number }[];
  paymentType?: 'CASH' | 'CREDIT';
}

export const purchaseOrdersApi = {
  list: () =>
    apiClient.get<{ success: boolean; data: PurchaseOrder[] }>('/purchase-orders'),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: PurchaseOrder }>(`/purchase-orders/${id}`),

  create: (payload: CreatePurchaseOrderPayload) =>
    apiClient.post<{ success: boolean; data: PurchaseOrder }>('/purchase-orders', payload),

  cancel: (id: string) =>
    apiClient.post<{ success: boolean; data: PurchaseOrder }>(`/purchase-orders/${id}/cancel`),

  receive: (id: string, payload: ReceiveGoodsPayload) =>
    apiClient.post<{ success: boolean; data: PurchaseOrder }>(`/purchase-orders/${id}/receive`, payload),
};
