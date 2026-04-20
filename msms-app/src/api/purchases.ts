import { apiClient } from './client';

export interface Purchase {
  id:            string;
  productId:     string;
  quantity:      number;
  purchasePrice: number;
  supplierName?: string;
  supplierPhone?: string;
  createdAt:     string;
  product:       { name: string; brand: string };
  recordedBy:    { username: string };
}

export interface CreatePurchasePayload {
  productId:     string;
  quantity:      number;
  purchasePrice: number;
  supplierName?: string;
  supplierPhone?: string;
}

export const purchasesApi = {
  list: (productId?: string) =>
    apiClient.get<{ success: boolean; data: Purchase[] }>('/purchases', {
      params: { productId },
    }),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Purchase }>(`/purchases/${id}`),

  create: (payload: CreatePurchasePayload) =>
    apiClient.post<{ success: boolean; data: Purchase }>('/purchases', payload),
};