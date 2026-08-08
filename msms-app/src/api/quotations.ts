import { apiClient } from './client';
import { PaymentFields } from './payment';

export type QuotationStatus = 'DRAFT' | 'CONVERTED' | 'CANCELLED';

export interface QuotationItem {
  id:            string;
  productId?:    string | null;
  description:   string;
  quantity:      number;
  unitPrice:     number;
  lineTotal:     number;
  createdSaleId?: string | null;
  product?:      { id: string; name: string; brand: string } | null;
}

export interface Quotation {
  id:            string;
  quoteNo:       string;
  customerName?:  string | null;
  customerPhone?: string | null;
  validUntil?:    string | null;
  status:        QuotationStatus;
  notes?:        string | null;
  createdAt:     string;
  items:         QuotationItem[];
  createdBy:     { username: string };
}

export interface QuotationItemPayload {
  productId?:  string;
  description: string;
  quantity:    number;
  unitPrice:   number;
}

export interface CreateQuotationPayload {
  customerName?:  string;
  customerPhone?: string;
  validUntil?:    string;
  notes?:         string;
  items:          QuotationItemPayload[];
}

export const quotationsApi = {
  list: () =>
    apiClient.get<{ success: boolean; data: Quotation[] }>('/quotations'),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Quotation }>(`/quotations/${id}`),

  create: (payload: CreateQuotationPayload) =>
    apiClient.post<{ success: boolean; data: Quotation }>('/quotations', payload),

  cancel: (id: string) =>
    apiClient.post<{ success: boolean; data: Quotation }>(`/quotations/${id}/cancel`),

  convert: (id: string, payment: PaymentFields) =>
    apiClient.post<{ success: boolean; data: any[] }>(`/quotations/${id}/convert`, payment),

  // Returns the URL to open — same "open in browser" pattern as invoicesApi.getUrl
  getViewUrl: (id: string) =>
    `${apiClient.defaults.baseURL}/quotations/${id}/view`,
};
