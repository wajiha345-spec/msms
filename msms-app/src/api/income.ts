import { apiClient } from './client';

export interface IncomeCategory {
  id:        string;
  name:      string;
  isSystem:  boolean;
  createdAt: string;
}

export interface Income {
  id:                    string;
  amount:                number;
  date:                  string;
  description?:          string | null;
  journalEntryId?:        string | null;
  createdAt:             string;
  category:              { id: string; name: string };
  incomeAccount:          { id: string; code: string; name: string };
  receivedIntoAccount:    { id: string; code: string; name: string };
  recordedBy:            { username: string };
}

export interface CreateIncomePayload {
  categoryId:            string;
  incomeAccountId:       string;
  receivedIntoAccountId: string;
  amount:                number;
  date?:                 string;
  description?:          string;
}

export interface IncomeSummary {
  byCategory: { categoryId: string; categoryName: string; total: number }[];
  grandTotal: number;
}

export const incomeApi = {
  listCategories: () =>
    apiClient.get<{ success: boolean; data: IncomeCategory[] }>('/income/categories'),

  createCategory: (name: string) =>
    apiClient.post<{ success: boolean; data: IncomeCategory }>('/income/categories', { name }),

  list: (params?: { dateFrom?: string; dateTo?: string; categoryId?: string }) =>
    apiClient.get<{ success: boolean; data: Income[] }>('/income', { params }),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Income }>(`/income/${id}`),

  getSummary: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<{ success: boolean; data: IncomeSummary }>('/income/reports/summary', { params }),

  create: (payload: CreateIncomePayload) =>
    apiClient.post<{ success: boolean; data: Income }>('/income', payload),
};
