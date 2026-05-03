import { apiClient } from './client';

export interface CatalogEntry {
  id:       string;
  barcode:  string;
  name:     string;
  brand:    string;
  category: string;
  addedAt:  string;
}

export const catalogApi = {
  list: (search?: string) =>
    apiClient.get<{ success: boolean; data: CatalogEntry[] }>(
      '/catalog', { params: { search } }
    ),

  lookup: (barcode: string) =>
    apiClient.get<{ success: boolean; data: CatalogEntry }>(
      `/catalog/${encodeURIComponent(barcode)}`
    ),

  contribute: (entry: { barcode: string; name: string; brand: string; category: string }) =>
    apiClient.post<{ success: boolean; data: { contributed: boolean } }>(
      '/catalog', entry
    ),

  delete: (id: string) =>
    apiClient.delete(`/catalog/${id}`),
};
