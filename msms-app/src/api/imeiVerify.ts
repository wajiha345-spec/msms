import { apiClient } from './client';

export type PtaStatusCode =
  | 'compliant'
  | 'non_compliant'
  | 'provisional'
  | 'stolen'
  | 'blocked'
  | 'not_registered'
  | 'unknown';

export interface ImeiVerifyResult {
  imei:    string;
  isValid: boolean;
  device: {
    brand:      string;
    model:      string;
    found:      boolean;
    source:     'gsma_api' | 'tac_prefix' | 'unknown';
    confidence: 'high' | 'low';
  };
  pta: {
    status:  PtaStatusCode;
    label:   string;
    checked: boolean;
  };
  recommendation: 'accept' | 'caution' | 'reject';
  warnings:       string[];
}

export const imeiVerifyApi = {
  check: (imei: string) =>
    apiClient.get<{ success: boolean; data: ImeiVerifyResult }>(
      `/imei-verify/${imei}`
    ),
};
