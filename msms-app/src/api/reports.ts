import { apiClient } from './client';

export interface SalesSummaryTotals {
  salesCount:     number;
  revenue:        number;
  profit:         number;
  unitsSold:      number;
  purchasesCount: number;
  cost:           number;
  unitsPurchased: number;
}

export interface SalesSummaryDay {
  date:    string;
  revenue: number;
  profit:  number;
  cost:    number;
}

export interface SalesSummaryProduct {
  productId: string;
  name:      string;
  brand:     string;
  unitsSold: number;
  revenue:   number;
  profit:    number;
}

export interface SalesSummary {
  from:        string;
  to:          string;
  totals:      SalesSummaryTotals;
  byDay:       SalesSummaryDay[];
  topProducts: SalesSummaryProduct[];
}

export const reportsApi = {
  getSalesSummary: (from?: string, to?: string) =>
    apiClient.get<{ success: boolean; data: SalesSummary }>('/reports/sales-summary', {
      params: { from, to },
    }),
};
