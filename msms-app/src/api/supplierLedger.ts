import { apiClient } from './client';

export interface Supplier {
  supplierPhone:  string;
  supplierName:   string | null;
  purchasesCount: number;
  totalAmount:    number;
  totalPaid:      number;
  outstanding:    number;
}

export interface SupplierLedgerTxn {
  type:       'PURCHASE' | 'PAYMENT';
  date:       string;
  amount:     number;
  ref:        string;
  purchaseId: string;
  balance:    number;
}

export interface SupplierStatement {
  purchases: {
    id: string; quantity: number; purchasePrice: number; paymentType: string;
    paymentDueDate: string | null; createdAt: string;
    product: { name: string; brand: string };
  }[];
  payments: {
    id: string; purchaseId: string; amount: number; method: string; note: string | null; createdAt: string;
  }[];
  ledger: SupplierLedgerTxn[];
  totalInvoiced: number;
  totalPaid:     number;
  outstanding:   number;
}

export interface AgingBucket { label: string; total: number; count: number }

export interface AgingEntry {
  purchaseId: string; productName: string;
  supplierName: string | null; supplierPhone: string | null;
  outstanding: number; daysOverdue: number; paymentDueDate: string | null;
}

export interface AgingReport {
  buckets: AgingBucket[];
  entries: AgingEntry[];
}

export interface RecordSupplierPaymentPayload {
  purchaseId: string;
  amount:     number;
  method?:    string;
  note?:      string;
}

export interface CreateCreditPurchasePayload {
  productId:       string;
  quantity:        number;
  purchasePrice:   number;
  supplierName?:   string;
  supplierPhone?:  string;
  paymentDueDate?: string;
}

export const supplierLedgerApi = {
  listSuppliers: () =>
    apiClient.get<{ success: boolean; data: Supplier[] }>('/supplier-ledger/suppliers'),

  getStatement: (phone: string) =>
    apiClient.get<{ success: boolean; data: SupplierStatement }>(`/supplier-ledger/suppliers/${phone}/statement`),

  getAging: () =>
    apiClient.get<{ success: boolean; data: AgingReport }>('/supplier-ledger/aging'),

  recordPayment: (payload: RecordSupplierPaymentPayload) =>
    apiClient.post<{ success: boolean; data: { payment: any; outstanding: number } }>('/supplier-ledger/payments', payload),

  createCreditPurchase: (payload: CreateCreditPurchasePayload) =>
    apiClient.post<{ success: boolean; data: any }>('/supplier-ledger/credit-purchases', payload),
};
