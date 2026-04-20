import { apiClient } from './client';

export interface ImeiSearchResult {
  query:   string;
  found:   boolean;
  products: Array<{
    id: string; name: string; brand: string;
    condition: string; imei?: string; stock: number;
    purchasePrice: number; salePrice: number;
    isSecondhand: boolean; createdAt: string;
  }>;
  sales: Array<{
    id: string; invoiceNo: string; imei?: string;
    quantity: number; salePrice: number; totalAmount: number;
    customerName?: string; createdAt: string;
    product: { name: string; brand: string };
    recordedBy: { username: string };
  }>;
  secondhandRecords: Array<{
    id: string; mobileName: string; brand: string;
    imei?: string; sellerName: string; sellerCnic: string;
    sellerPhone: string; purchasePrice: number;
    isSold: boolean; createdAt: string;
    product?: { stock: number; salePrice: number };
  }>;
}

export const imeiApi = {
  search: (q: string) =>
    apiClient.get<{ success: boolean; data: ImeiSearchResult }>('/imei/search', {
      params: { q },
    }),
};