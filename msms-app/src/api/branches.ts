import { apiClient } from './client';

export interface Branch {
  id:        string;
  name:      string;
  address?:  string | null;
  isMain:    boolean;
  isActive:  boolean;
  createdAt: string;
}

export interface BranchReport {
  branch:           { id: string; name: string; isMain: boolean };
  salesCount:       number;
  totalRevenue:     number;
  totalProfit:      number;
  purchasesCount:   number;
  totalPurchaseCost: number;
  productCount:     number;
  totalStock:       number;
}

export interface AssignableProduct {
  id:     string;
  name:   string;
  brand:  string;
  stock:  number;
  branch: { id: string; name: string } | null;
}

export const branchesApi = {
  list: () =>
    apiClient.get<{ success: boolean; data: Branch[] }>('/branches'),

  create: (payload: { name: string; address?: string }) =>
    apiClient.post<{ success: boolean; data: Branch }>('/branches', payload),

  rename: (id: string, name: string) =>
    apiClient.patch<{ success: boolean; data: Branch }>(`/branches/${id}/rename`, { name }),

  deactivate: (id: string) =>
    apiClient.post<{ success: boolean; data: Branch }>(`/branches/${id}/deactivate`),

  getReport: (id: string) =>
    apiClient.get<{ success: boolean; data: BranchReport }>(`/branches/${id}/report`),

  listProductsForAssignment: () =>
    apiClient.get<{ success: boolean; data: AssignableProduct[] }>('/branches/products/all'),

  assignProduct: (productId: string, branchId: string) =>
    apiClient.post<{ success: boolean; data: any }>('/branches/products/assign', { productId, branchId }),
};
