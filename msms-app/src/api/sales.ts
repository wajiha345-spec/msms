import { apiClient } from './client';

export interface Guarantor {
  id?:   string;
  name?: string;
  cnic:  string;
  phone: string;
}

export interface Sale {
  id:            string;
  invoiceNo:     string;
  productId:     string;
  quantity:      number;
  salePrice:     number;
  totalAmount:   number;
  profit:        number;
  customerName?: string;
  customerPhone?: string;
  customerCnic?: string;
  imei?:         string;
  paymentType:   'CASH' | 'INSTALLMENT';
  installmentDueDate?: string;
  installmentPaid?:    boolean;
  guarantors?:   Guarantor[];
  createdAt:     string;
  product:       { name: string; brand: string };
  recordedBy:    { username: string };
}

export interface CreateSalePayload {
  productId:     string;
  quantity:      number;
  salePrice:     number;
  customerName?: string;
  customerPhone?: string;
  customerCnic?: string;
  imei?:         string;
  secondhandId?: string;
  paymentType:   'CASH' | 'INSTALLMENT';
  installmentDueDate?: string;
  guarantors?:   Guarantor[];
}

export const salesApi = {
  list: (productId?: string, date?: string) =>
    apiClient.get<{ success: boolean; data: Sale[] }>('/sales', {
      params: { productId, date },
    }),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Sale }>(`/sales/${id}`),

  create: (payload: CreateSalePayload) =>
    apiClient.post<{ success: boolean; data: Sale }>('/sales', payload),

  markPaid: (id: string) =>
    apiClient.patch<{ success: boolean; data: Sale }>(`/sales/${id}/mark-paid`),
};
