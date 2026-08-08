import { apiClient } from './client';
import { PaymentFields } from './payment';

export interface SaleInstallment {
  id:                string;
  saleId:            string;
  installmentNumber: number;
  amount:            number;
  dueDate:           string;
  status:            'PENDING' | 'PAID';
  paidAt?:           string | null;
  paymentMethod?:    string | null;
  sale: {
    invoiceNo:     string;
    customerName:  string | null;
    customerPhone: string | null;
  };
}

export const saleInstallmentsApi = {
  listDue: () =>
    apiClient.get<{ success: boolean; data: SaleInstallment[] }>('/sales/installments'),

  markPaid: (id: string, payment: PaymentFields) =>
    apiClient.post<{ success: boolean; data: SaleInstallment }>(`/sales/installments/${id}/mark-paid`, payment),
};
