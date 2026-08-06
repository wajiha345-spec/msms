import { apiClient } from './client';

export interface Customer {
  id:        string;
  name:      string;
  phone:     string;
  email?:    string | null;
  cnic?:     string | null;
  address?:  string | null;
  tags:      string[];
  status:    'lead' | 'active' | 'vip' | 'inactive';
  source?:   string | null;
  notes?:    string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInteraction {
  id:           string;
  customerId:   string;
  type:         'NOTE' | 'CALL' | 'VISIT' | 'FOLLOW_UP';
  text:         string;
  followUpDate?: string | null;
  completed:    boolean;
  createdBy:    { username: string };
  createdAt:    string;
}

export interface CustomerStats {
  salesCount:       number;
  totalSpent:       number;
  outstanding:      number;
  quotationsCount:  number;
  salesOrdersCount: number;
  lastPurchaseAt:   string | null;
}

export interface CustomerProfile {
  customer:     Customer;
  interactions: CustomerInteraction[];
  stats:        CustomerStats;
}

export interface FollowUp extends CustomerInteraction {
  customer: { id: string; name: string; phone: string };
}

export interface CreateCustomerPayload {
  name:     string;
  phone:    string;
  email?:   string;
  cnic?:    string;
  address?: string;
  tags?:    string[];
  status?:  string;
  source?:  string;
  notes?:   string;
}

export type UpdateCustomerPayload = Partial<Omit<CreateCustomerPayload, 'phone'>>;

export interface AddInteractionPayload {
  type:          'NOTE' | 'CALL' | 'VISIT' | 'FOLLOW_UP';
  text:          string;
  followUpDate?: string;
}

export const crmApi = {
  listCustomers: (params?: { search?: string; status?: string; tag?: string }) =>
    apiClient.get<{ success: boolean; data: Customer[] }>('/crm/customers', { params }),

  createCustomer: (payload: CreateCustomerPayload) =>
    apiClient.post<{ success: boolean; data: Customer }>('/crm/customers', payload),

  getProfile: (id: string) =>
    apiClient.get<{ success: boolean; data: CustomerProfile }>(`/crm/customers/${id}`),

  updateCustomer: (id: string, payload: UpdateCustomerPayload) =>
    apiClient.patch<{ success: boolean; data: Customer }>(`/crm/customers/${id}`, payload),

  deleteCustomer: (id: string) =>
    apiClient.delete<{ success: boolean; data: { deleted: boolean } }>(`/crm/customers/${id}`),

  addInteraction: (customerId: string, payload: AddInteractionPayload) =>
    apiClient.post<{ success: boolean; data: CustomerInteraction }>(`/crm/customers/${customerId}/interactions`, payload),

  updateInteraction: (id: string, payload: { text?: string; completed?: boolean }) =>
    apiClient.patch<{ success: boolean; data: CustomerInteraction }>(`/crm/interactions/${id}`, payload),

  deleteInteraction: (id: string) =>
    apiClient.delete<{ success: boolean; data: { deleted: boolean } }>(`/crm/interactions/${id}`),

  listFollowUps: () =>
    apiClient.get<{ success: boolean; data: FollowUp[] }>('/crm/follow-ups'),
};
