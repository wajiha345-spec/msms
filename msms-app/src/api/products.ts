import { apiClient } from './client';

export interface Product {
  id:            string;
  name:          string;
  brand:         string;
  category:      string;
  condition:     'new' | 'used';
  imei?:         string;
  barcode?:      string;
  purchasePrice: number;
  salePrice:     number;
  stock:         number;
  isSecondhand:  boolean;
  storage?:      string;
  color?:        string;
  ram?:          string;
  createdAt:     string;
}

export interface CreateProductPayload {
  name:          string;
  brand:         string;
  category?:     string;
  condition:     'new' | 'used';
  imei?:         string;
  barcode?:      string;
  purchasePrice: number;
  salePrice:     number;
  stock:         number;
  isSecondhand?: boolean;
  storage?:      string;
  color?:        string;
  ram?:          string;
}

export const productsApi = {
  list: (search?: string, condition?: string) =>
    apiClient.get<{ success: boolean; data: Product[] }>('/products', {
      params: { search, condition },
    }),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Product }>(`/products/${id}`),

  // Lookup by IMEI or barcode (scanner flow)
  scan: (code: string) =>
    apiClient.get<{ success: boolean; data: Product }>(`/products/scan/${encodeURIComponent(code)}`),

  create: (payload: CreateProductPayload) =>
    apiClient.post<{ success: boolean; data: Product }>('/products', payload),

  update: (id: string, payload: Partial<CreateProductPayload>) =>
    apiClient.put<{ success: boolean; data: Product }>(`/products/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/products/${id}`),

  import: (products: Partial<CreateProductPayload>[]) =>
    apiClient.post<{ success: boolean; data: { created: number; errors: { row: number; name: string; error: string }[] } }>(
      '/products/import', { products }
    ),
};
