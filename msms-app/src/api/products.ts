import { apiClient } from './client';

export interface Product {
  id:            string;
  name:          string;
  brand:         string;
  category:      string;
  condition:     'new' | 'used';
  imei?:         string;
  purchasePrice: number;
  salePrice:     number;
  stock:         number;
  isSecondhand:  boolean;
  createdAt:     string;
}

export interface CreateProductPayload {
  name:          string;
  brand:         string;
  category?:     string;
  condition:     'new' | 'used';
  imei?:         string;
  purchasePrice: number;
  salePrice:     number;
  stock:         number;
  isSecondhand?: boolean;
}

export const productsApi = {
  list: (search?: string, condition?: string) =>
    apiClient.get<{ success: boolean; data: Product[] }>('/products', {
      params: { search, condition },
    }),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Product }>(`/products/${id}`),

  create: (payload: CreateProductPayload) =>
    apiClient.post<{ success: boolean; data: Product }>('/products', payload),

  update: (id: string, payload: Partial<CreateProductPayload>) =>
    apiClient.put<{ success: boolean; data: Product }>(`/products/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/products/${id}`),
};