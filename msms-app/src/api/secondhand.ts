import { apiClient } from './client';

export interface SecondhandRecord {
  id:             string;
  productId:      string;
  mobileName:     string;
  brand:          string;
  imei?:          string;
  sellerName:     string;
  sellerCnic:     string;
  sellerPhone:    string;
  purchasePrice:  number;
  notes?:         string;
  sellerPhotoUrl?: string;
  cnicPhotoUrl?:   string;
  isSold:         boolean;
  createdAt:      string;
  product?:       {
    name: string; stock: number;
    salePrice: number; isDeleted: boolean;
  };
}

export const secondhandApi = {
  list: (isSold?: boolean) =>
    apiClient.get<{ success: boolean; data: SecondhandRecord[] }>('/secondhand', {
      params: isSold !== undefined ? { isSold } : {},
    }),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: SecondhandRecord }>(`/secondhand/${id}`),

  // FormData because we're uploading images
  create: (formData: FormData) =>
    apiClient.post<{ success: boolean; data: SecondhandRecord }>(
      '/secondhand',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

  update: (id: string, data: { notes?: string; salePrice?: number }) =>
    apiClient.put(`/secondhand/${id}`, data),
};