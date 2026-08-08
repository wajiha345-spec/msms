import { apiClient } from './client';

export interface Customer {
  customerPhone: string;
  customerName:  string | null;
  salesCount:    number;
  totalAmount:   number;
  totalPaid:     number;
  outstanding:   number;
}

export interface LedgerTxn {
  type:   'SALE' | 'PAYMENT';
  date:   string;
  amount: number;
  ref:    string;
  saleId: string;
  balance: number;
}

export interface CustomerStatement {
  customerPhone: string;
  sales: {
    id: string; invoiceNo: string; totalAmount: number; paymentType: string;
    installmentDueDate: string | null; installmentPaid: boolean; createdAt: string;
  }[];
  payments: {
    id: string; saleId: string; amount: number; method: string; note: string | null; createdAt: string;
  }[];
  ledger: LedgerTxn[];
  totalInvoiced: number;
  totalPaid:     number;
  outstanding:   number;
}

export interface AgingBucket { label: string; total: number; count: number }

export interface AgingEntry {
  saleId: string; invoiceNo: string;
  customerName: string | null; customerPhone: string | null;
  outstanding: number; daysOverdue: number; installmentDueDate: string | null;
}

export interface AgingReport {
  buckets: AgingBucket[];
  entries: AgingEntry[];
}

export interface RecordCustomerPaymentPayload {
  saleId:  string;
  amount:  number;
  method?: string; // "CASH" | "ACCOUNT" | "SPLIT" — set to also post to the Cash/Bank ledger
  note?:   string;
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}

export const customerLedgerApi = {
  listCustomers: () =>
    apiClient.get<{ success: boolean; data: Customer[] }>('/customer-ledger/customers'),

  getStatement: (phone: string) =>
    apiClient.get<{ success: boolean; data: CustomerStatement }>(`/customer-ledger/customers/${phone}/statement`),

  getAging: () =>
    apiClient.get<{ success: boolean; data: AgingReport }>('/customer-ledger/aging'),

  recordPayment: (payload: RecordCustomerPaymentPayload) =>
    apiClient.post<{ success: boolean; data: { payment: any; outstanding: number } }>('/customer-ledger/payments', payload),
};
