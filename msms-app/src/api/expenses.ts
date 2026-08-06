import { apiClient } from './client';

export interface ExpenseCategory {
  id:        string;
  name:      string;
  isSystem:  boolean;
  createdAt: string;
}

export interface Expense {
  id:                 string;
  amount:             number;
  date:               string;
  description?:       string | null;
  billPhotoUrl?:       string | null;
  journalEntryId?:     string | null;
  createdAt:          string;
  category:           { id: string; name: string };
  expenseAccount:     { id: string; code: string; name: string };
  paidFromAccount:    { id: string; code: string; name: string };
  recordedBy:         { username: string };
}

export interface ExpenseSummary {
  byCategory: { categoryId: string; categoryName: string; total: number }[];
  grandTotal: number;
}

export const expensesApi = {
  listCategories: () =>
    apiClient.get<{ success: boolean; data: ExpenseCategory[] }>('/expenses/categories'),

  createCategory: (name: string) =>
    apiClient.post<{ success: boolean; data: ExpenseCategory }>('/expenses/categories', { name }),

  list: (params?: { dateFrom?: string; dateTo?: string; categoryId?: string }) =>
    apiClient.get<{ success: boolean; data: Expense[] }>('/expenses', { params }),

  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Expense }>(`/expenses/${id}`),

  getSummary: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<{ success: boolean; data: ExpenseSummary }>('/expenses/reports/summary', { params }),

  // FormData — mirrors secondhandApi.create: use fetch directly for multipart
  // uploads (the optional bill photo), same 45s timeout for slow connections.
  create: async (formData: FormData) => {
    const baseURL = apiClient.defaults.baseURL;
    const token   = (apiClient.defaults.headers.common as any)['Authorization'];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(`${baseURL}/expenses`, {
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
};
