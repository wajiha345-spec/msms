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

async function uploadProof(url: string, transactionId: string, photoUri: string) {
  const formData = new FormData();
  formData.append('transactionId', transactionId);
  const filename = photoUri.split('/').pop() ?? 'proof.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  formData.append('screenshot', {
    uri:  photoUri,
    name: filename,
    type: ext === 'png' ? 'image/png' : 'image/jpeg',
  } as any);

  // Mirrors expensesApi.create: use fetch directly for multipart uploads.
  const baseURL = apiClient.defaults.baseURL;
  const token   = (apiClient.defaults.headers.common as any)['Authorization'];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`${baseURL}${url}`, {
      method:  'POST',
      headers: token ? { Authorization: token } : {},
      body:    formData,
      signal:  controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw { response: { data: json } };
    return { data: json };
  } finally {
    clearTimeout(timer);
  }
}

export const licenseInstallmentsApi = {
  getStatus: () =>
    apiClient.get<{ success: boolean; data: LicenseInstallmentPlan | null }>('/license-installments/status'),

  start: (transactionId: string, photoUri: string) =>
    uploadProof('/license-installments/start', transactionId, photoUri),

  submitInstallment: (installmentNumber: number, transactionId: string, photoUri: string) =>
    uploadProof(`/license-installments/${installmentNumber}/submit`, transactionId, photoUri),
};
