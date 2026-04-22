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

  // FormData — use fetch with 45s timeout for image uploads to Cloudinary
  create: async (formData: FormData) => {
    const baseURL = apiClient.defaults.baseURL;
    const token   = (apiClient.defaults.headers.common as any)['Authorization'];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(`${baseURL}/secondhand`, {
        method:  'POST',
        headers: token ? { Authorization: token } : {},
        body:    formData,
        signal:  controller.signal,
      });
      const json = await res.json();
      if (!res.ok) throw { response: { data: json } };
      return { data: json };
    } finally {
      clearTimeout(timer);
    }
  },

  update: (id: string, data: { notes?: string; salePrice?: number }) =>
    apiClient.put(`/secondhand/${id}`, data),
};