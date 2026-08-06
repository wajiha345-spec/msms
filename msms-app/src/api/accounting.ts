import { apiClient } from './client';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface Account {
  id:                 string;
  code:               string;
  name:               string;
  type:               AccountType;
  parentId?:          string | null;
  isSystem:           boolean;
  isActive:           boolean;
  openingBalance:     number;
  openingBalanceDate?: string | null;
  createdAt:          string;
}

export interface CreateAccountPayload {
  code:      string;
  name:      string;
  type:      AccountType;
  parentId?: string | null;
}

export interface JournalEntryLine {
  id?:          string;
  accountId:    string;
  debit?:       number;
  credit?:      number;
  description?: string;
  account?:     { code: string; name: string };
}

export interface JournalEntry {
  id:          string;
  entryNo:     string;
  date:        string;
  memo?:       string | null;
  sourceType:  'MANUAL' | 'SYSTEM';
  sourceModule?: string | null;
  createdAt:   string;
  createdBy:   { username: string };
  lines:       JournalEntryLine[];
}

export interface CreateJournalEntryPayload {
  date?: string;
  memo?: string;
  lines: JournalEntryLine[];
}

export interface LedgerEntry {
  id:          string;
  entryNo:     string;
  date:        string;
  memo?:       string | null;
  description?: string | null;
  debit:       number;
  credit:      number;
  balance:     number;
}

export interface GeneralLedger {
  account: { id: string; code: string; name: string; type: AccountType; openingBalance: number };
  entries: LedgerEntry[];
  closingBalance: number;
}

export interface TrialBalanceRow {
  accountId: string;
  code:      string;
  name:      string;
  type:      AccountType;
  debit:     number;
  credit:    number;
}

export interface TrialBalance {
  asOfDate:    string | null;
  rows:        TrialBalanceRow[];
  totalDebit:  number;
  totalCredit: number;
}

export interface BalanceSheetRow {
  accountId: string;
  code:      string;
  name:      string;
  balance:   number;
}

export interface BalanceSheet {
  asOfDate:              string | null;
  assets:                BalanceSheetRow[];
  liabilities:           BalanceSheetRow[];
  equity:                BalanceSheetRow[];
  currentPeriodEarnings: number;
  totalAssets:           number;
  totalLiabilities:      number;
  totalEquity:           number;
  isBalanced:            boolean;
}

export interface ProfitAndLossRow {
  accountId: string;
  code:      string;
  name:      string;
  amount:    number;
}

export interface ProfitAndLoss {
  dateFrom:     string | null;
  dateTo:       string | null;
  income:       ProfitAndLossRow[];
  expense:      ProfitAndLossRow[];
  totalIncome:  number;
  totalExpense: number;
  netProfit:    number;
}

export interface CashFlowCategory {
  category: string;
  inflow:   number;
  outflow:  number;
  net:      number;
}

export interface CashFlowReport {
  dateFrom:       string | null;
  dateTo:         string | null;
  categories:     CashFlowCategory[];
  totalInflow:    number;
  totalOutflow:   number;
  netChange:      number;
  openingBalance: number;
  closingBalance: number;
}

export interface ClosingEntry {
  id:              string;
  periodStart:     string;
  periodEnd:       string;
  netIncome:       number;
  equityAccountId: string;
  equityAccount:   { code: string; name: string };
  journalEntry:    { entryNo: string };
  createdBy?:      { username: string };
  createdAt:       string;
}

export interface CreateClosingEntryPayload {
  periodStart:     string;
  periodEnd:       string;
  equityAccountId: string;
  memo?:           string;
}

export const accountingApi = {
  listAccounts: () =>
    apiClient.get<{ success: boolean; data: Account[] }>('/accounting/accounts'),

  createAccount: (payload: CreateAccountPayload) =>
    apiClient.post<{ success: boolean; data: Account }>('/accounting/accounts', payload),

  updateAccount: (id: string, payload: Partial<CreateAccountPayload> & { isActive?: boolean }) =>
    apiClient.patch<{ success: boolean; data: Account }>(`/accounting/accounts/${id}`, payload),

  deactivateAccount: (id: string) =>
    apiClient.delete<{ success: boolean; data: Account }>(`/accounting/accounts/${id}`),

  setOpeningBalance: (id: string, amount: number, date?: string) =>
    apiClient.post<{ success: boolean; data: Account }>(`/accounting/accounts/${id}/opening-balance`, { amount, date }),

  listJournalEntries: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<{ success: boolean; data: JournalEntry[] }>('/accounting/journal-entries', { params }),

  getJournalEntry: (id: string) =>
    apiClient.get<{ success: boolean; data: JournalEntry }>(`/accounting/journal-entries/${id}`),

  createJournalEntry: (payload: CreateJournalEntryPayload) =>
    apiClient.post<{ success: boolean; data: JournalEntry }>('/accounting/journal-entries', payload),

  getLedger: (accountId: string, params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<{ success: boolean; data: GeneralLedger }>(`/accounting/ledger/${accountId}`, { params }),

  getTrialBalance: (asOfDate?: string) =>
    apiClient.get<{ success: boolean; data: TrialBalance }>('/accounting/trial-balance', { params: { asOfDate } }),

  getBalanceSheet: (asOfDate?: string) =>
    apiClient.get<{ success: boolean; data: BalanceSheet }>('/accounting/balance-sheet', { params: { asOfDate } }),

  getProfitAndLoss: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<{ success: boolean; data: ProfitAndLoss }>('/accounting/profit-loss', { params }),

  getCashFlow: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<{ success: boolean; data: CashFlowReport }>('/accounting/cash-flow', { params }),

  createClosingEntry: (payload: CreateClosingEntryPayload) =>
    apiClient.post<{ success: boolean; data: ClosingEntry }>('/accounting/closing-entries', payload),

  listClosingEntries: () =>
    apiClient.get<{ success: boolean; data: ClosingEntry[] }>('/accounting/closing-entries'),
};
