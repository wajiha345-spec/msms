import { apiClient } from './client';

export interface LicenseInstallment {
  id:                 string;
  installmentNumber:  number;
  amount:             number;
  dueDate:            string | null;
  status:             'PENDING' | 'SUBMITTED' | 'PAID';
  transactionId?:      string | null;
  screenshotUrl?:       string | null;
  submittedAt?:        string | null;
  paidAt?:             string | null;
}

export interface LicenseInstallmentPlan {
  id:                 string;
  plan:               string;
  installmentAmount:  number;
  totalInstallments:  number;
  status:             'ACTIVE' | 'COMPLETED';
  installments:       LicenseInstallment[];
  overdueInstallment:  LicenseInstallment | null;
  upcomingInstallment: LicenseInstallment | null;
}

// Payment submission (start/submit an installment) now happens entirely on
// the website (msms-app.site), not in the app — see msms-website/index.html
// and the public /api/license-installments/public/submit endpoint. This
// client only reads status, which AuthContext polls in the background to
// detect an overdue installment (lock the app) or an out-of-band admin
// approval (unlock it) — see AuthContext.refreshInstallmentStatus.
export const licenseInstallmentsApi = {
  getStatus: () =>
    apiClient.get<{ success: boolean; data: LicenseInstallmentPlan | null }>('/license-installments/status'),
};
