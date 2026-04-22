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
  // Use fetch directly — axios+FormData in React Native has Content-Type header issues
  create: async (formData: FormData) => {
    const baseURL = apiClient.defaults.baseURL;
    const token   = (apiClient.defaults.headers.common as any)['Authorization'];
    const res = await fetch(`${baseURL}/secondhand`, {
      method:  'POST',
      headers: token ? { Authorization: token } : {},
      body:    formData,
    });
    const json = await res.json();
    if (!res.ok) throw { response: { data: json } };
    return { data: json };
  },

  update: (id: string, data: { notes?: string; salePrice?: number }) =>
    apiClient.put(`/secondhand/${id}`, data),
};