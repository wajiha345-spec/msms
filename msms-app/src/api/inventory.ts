import { apiClient } from './client';

export interface LowStockProduct {
  id:                  string;
  name:                string;
  brand:               string;
  stock:               number;
  reorderPoint:        number | null;
  effectiveThreshold:  number;
  branch:              { id: string; name: string } | null;
}

export interface TransferResult {
  source:      { id: string; name: string; stock: number };
  destination: { id: string; name: string; stock: number };
}

export const inventoryApi = {
  listLowStock: () =>
    apiClient.get<{ success: boolean; data: LowStockProduct[] }>('/inventory/low-stock'),

  setReorderPoint: (productId: string, reorderPoint: number | null) =>
    apiClient.patch<{ success: boolean; data: any }>(`/inventory/products/${productId}/reorder-point`, { reorderPoint }),

  transfer: (payload: { productId: string; toBranchId: string; quantity: number }) =>
    apiClient.post<{ success: boolean; data: TransferResult }>('/inventory/transfer', payload),
};
