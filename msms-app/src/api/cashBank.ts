import { apiClient } from './client';
import { Account, JournalEntry } from './accounting';

export interface CashBankAccount extends Account {
  balance: number;
}

export interface MoveMoneyPayload {
  toAccountId:   string;
  fromAccountId: string;
  amount:        number;
  date?:         string;
  memo?:         string;
}

export interface Reconciliation {
  id:               string;
  accountId:        string;
  statementDate:    string;
  statementBalance: number;
  bookBalance:      number;
  difference:       number;
  note?:            string | null;
  createdAt:        string;
  account:          { code: string; name: string };
  createdBy?:       { username: string };
}

export interface CreateReconciliationPayload {
  accountId:        string;
  statementDate:    string;
  statementBalance: number;
  note?:            string;
}

export const cashBankApi = {
  listAccounts: () =>
    apiClient.get<{ success: boolean; data: CashBankAccount[] }>('/cash-bank/accounts'),

  recordDeposit: (payload: MoveMoneyPayload) =>
    apiClient.post<{ success: boolean; data: JournalEntry }>('/cash-bank/deposits', payload),

  recordWithdrawal: (payload: MoveMoneyPayload) =>
    apiClient.post<{ success: boolean; data: JournalEntry }>('/cash-bank/withdrawals', payload),

  recordTransfer: (payload: MoveMoneyPayload) =>
    apiClient.post<{ success: boolean; data: JournalEntry }>('/cash-bank/transfers', payload),

  listTransactions: (accountId?: string) =>
    apiClient.get<{ success: boolean; data: JournalEntry[] }>('/cash-bank/transactions', { params: { accountId } }),

  createReconciliation: (payload: CreateReconciliationPayload) =>
    apiClient.post<{ success: boolean; data: Reconciliation }>('/cash-bank/reconciliations', payload),

  listReconciliations: (accountId?: string) =>
    apiClient.get<{ success: boolean; data: Reconciliation[] }>('/cash-bank/reconciliations', { params: { accountId } }),
};
