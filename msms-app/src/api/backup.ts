import { apiClient } from './client';

export interface BackupCounts {
  products:          number;
  sales:             number;
  purchases:         number;
  secondhandRecords: number;
  expenses:          number;
  income:            number;
  customers:         number;
  quotations:        number;
  purchaseOrders:    number;
  salesOrders:       number;
  branches:          number;
  users:             number;
}

export interface BackupExport {
  exportedAt: string;
  shop:       { id: string; name: string; plan: string };
  counts:     BackupCounts;
  data:       Record<string, unknown>;
}

export const backupApi = {
  export: () =>
    apiClient.get<{ success: boolean; data: BackupExport }>('/backup/export', { timeout: 60000 }),
};
