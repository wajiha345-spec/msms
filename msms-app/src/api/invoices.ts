import { apiClient } from './client';

export const invoicesApi = {
  // Returns the URL to open — we open it in the browser
  getUrl: (saleId: string) =>
    `${apiClient.defaults.baseURL}/invoices/${saleId}`,
};