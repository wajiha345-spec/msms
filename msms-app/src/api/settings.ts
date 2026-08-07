import { apiClient } from './client';

export interface ShopSettings {
  id:                 string;
  shopId:             string;
  lowStockThreshold:  number;
  shopAddress:        string | null;
  shopPhone:          string | null;
  invoiceFooterNote:  string | null;
  updatedAt:          string;
}

export interface UpdateSettingsPayload {
  lowStockThreshold?: number;
  shopAddress?:       string;
  shopPhone?:         string;
  invoiceFooterNote?: string;
}

export const settingsApi = {
  get: () =>
    apiClient.get<{ success: boolean; data: ShopSettings }>('/settings'),

  update: (payload: UpdateSettingsPayload) =>
    apiClient.patch<{ success: boolean; data: ShopSettings }>('/settings', payload),
};
