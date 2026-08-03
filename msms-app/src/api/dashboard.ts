import { apiClient } from './client';

export interface DashboardData {
  today: {
    salesCount:     number;
    revenue:        number;
    profit:         number;
    purchasesCount: number;
    cost:           number;
  };
  stock: {
    totalProducts:   number;
    newStock:        number;
    secondhandStock: number;
  };
  recentSales: Array<{
    id:           string;
    invoiceNo:    string;
    totalAmount:  number;
    profit:       number;
    quantity:     number;
    customerName?: string;
    createdAt:    string;
    product:      { name: string; brand: string };
    recordedBy:   { username: string };
  }>;
  installmentAlerts: Array<{
    saleId:        string;
    invoiceNo:     string;
    customerName:  string | null;
    customerCnic:  string | null;
    customerPhone: string | null;
    pendingAmount: number;
    dueDate:       string | null;
    isOverdue:     boolean;
  }>;
}

export const dashboardApi = {
  summary: () =>
    apiClient.get<{ success: boolean; data: DashboardData }>('/dashboard/summary'),
};