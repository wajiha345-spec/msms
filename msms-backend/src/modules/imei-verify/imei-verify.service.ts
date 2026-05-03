/**
 * IMEI Verification Service
 *
 * Data sources:
 *  1. TAC (first 8 digits of IMEI) → imeicheck.net API → brand/model
 *     Requires IMEI_API_KEY in .env AND API Manager enabled at imeicheck.net/dashboard
 *     Free tier: 50 checks/day.
 *
 *  2. TAC prefix fallback → local table of popular Pakistani phone brands
 *     Works offline, no key needed. Covers Samsung, Apple, Xiaomi, Vivo,
 *     Oppo, Realme, Huawei, Tecno, Infinix, Nokia, OnePlus, etc.
 *
 *  3. PTA / DIRBS (Pakistan Device Identification, Registration & Blocking)
 *     Public API — free, no key required.
 *     Returns: Compliant | Non-Compliant | Provisional | Stolen | Blocked
 */

import 'dotenv/config';
import { sendImeiApiAlertEmail, sendImeiLowBalanceEmail } from '../../utils/email';

// Throttle admin alerts to at most once per hour
let lastAlertSentAt = 0;
async function alertAdmin(reason: string, httpCode: number, imei: string) {
  const now = Date.now();
  if (now - lastAlertSentAt < 60 * 60 * 1000) return; // 1 hour cooldown
  lastAlertSentAt = now;
  sendImeiApiAlertEmail({ reason, httpCode, imei }).catch(err =>
    console.error('[IMEI] Failed to send admin alert email:', err?.message)
  );
}

// ── Luhn / IMEI validation ────────────────────────────────────────────────────
export function isValidImei(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(imei[i], 10);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DeviceInfo {
  brand:      string;
  model:      string;
  found:      boolean;
  source:     'gsma_api' | 'tac_prefix' | 'unknown';
  confidence: 'high' | 'low';
}

export type PtaStatusCode =
  | 'compliant'
  | 'non_compliant'
  | 'provisional'
  | 'stolen'
  | 'blocked'
  | 'not_registered'
  | 'unknown';

export interface PtaResult {
  status:  PtaStatusCode;
  label:   string;       // human-readable
  checked: boolean;      // false = API unavailable, treat as unknown
}

export type Recommendation = 'accept' | 'caution' | 'reject';

export interface ImeiVerifyResult {
  imei:           string;
  isValid:        boolean;
  device:         DeviceInfo;
  pta:            PtaResult;
  recommendation: Recommendation;
  warnings:       string[];
}

// ── TAC prefix → brand table (popular Pakistani models) ──────────────────────
// TAC = first 8 digits of IMEI. First 2 digits = Reporting Body Identifier.
// Source: GSMA TAC database (public subset, curated for PK market)
const TAC_BRANDS: Array<{ prefix: string; brand: string }> = [
  // Apple (RBI 01)
  { prefix: '013', brand: 'Apple' },
  { prefix: '012', brand: 'Apple' },
  { prefix: '011', brand: 'Apple' },
  // Samsung (RBI 35)
  { prefix: '352', brand: 'Samsung' },
  { prefix: '353', brand: 'Samsung' },
  { prefix: '354', brand: 'Samsung' },
  { prefix: '355', brand: 'Samsung' },
  { prefix: '356', brand: 'Samsung' },
  { prefix: '357', brand: 'Samsung' },
  { prefix: '358', brand: 'Samsung' },
  { prefix: '359', brand: 'Samsung' },
  { prefix: '350', brand: 'Samsung' },
  { prefix: '351', brand: 'Samsung' },
  // Nokia / HMD (RBI 35)
  { prefix: '3538', brand: 'Nokia' },
  { prefix: '3534', brand: 'Nokia' },
  // Huawei (RBI 86)
  { prefix: '8601', brand: 'Huawei' },
  { prefix: '8602', brand: 'Huawei' },
  { prefix: '8603', brand: 'Huawei' },
  { prefix: '8604', brand: 'Huawei' },
  // Honor (Huawei spin-off)
  { prefix: '8605', brand: 'Honor' },
  { prefix: '8606', brand: 'Honor' },
  // Xiaomi / Redmi (RBI 86)
  { prefix: '8610', brand: 'Xiaomi' },
  { prefix: '8611', brand: 'Xiaomi' },
  { prefix: '8612', brand: 'Xiaomi' },
  { prefix: '8613', brand: 'Xiaomi' },
  { prefix: '8677', brand: 'Xiaomi' },
  { prefix: '8679', brand: 'Xiaomi' },
  // Vivo (RBI 86)
  { prefix: '8607', brand: 'Vivo' },
  { prefix: '8608', brand: 'Vivo' },
  { prefix: '8609', brand: 'Vivo' },
  { prefix: '8640', brand: 'Vivo' },
  { prefix: '8641', brand: 'Vivo' },
  { prefix: '8642', brand: 'Vivo' },
  { prefix: '8643', brand: 'Vivo' },
  // Oppo (RBI 86)
  { prefix: '8614', brand: 'Oppo' },
  { prefix: '8615', brand: 'Oppo' },
  { prefix: '8616', brand: 'Oppo' },
  { prefix: '8617', brand: 'Oppo' },
  { prefix: '8650', brand: 'Oppo' },
  { prefix: '8651', brand: 'Oppo' },
  // Realme (Oppo sub-brand)
  { prefix: '8618', brand: 'Realme' },
  { prefix: '8619', brand: 'Realme' },
  { prefix: '8620', brand: 'Realme' },
  { prefix: '8660', brand: 'Realme' },
  // OnePlus (Oppo parent)
  { prefix: '8621', brand: 'OnePlus' },
  { prefix: '8622', brand: 'OnePlus' },
  // Tecno (Transsion)
  { prefix: '3566', brand: 'Tecno' },
  { prefix: '3567', brand: 'Tecno' },
  { prefix: '3568', brand: 'Tecno' },
  // Infinix (Transsion)
  { prefix: '3569', brand: 'Infinix' },
  { prefix: '3570', brand: 'Infinix' },
  { prefix: '3571', brand: 'Infinix' },
  // itel (Transsion)
  { prefix: '3572', brand: 'itel' },
  // Motorola / Lenovo (RBI 35)
  { prefix: '3560', brand: 'Motorola' },
  { prefix: '3561', brand: 'Motorola' },
  { prefix: '3562', brand: 'Motorola' },
  // Sony (RBI 35)
  { prefix: '3535', brand: 'Sony' },
  { prefix: '3536', brand: 'Sony' },
  // LG (RBI 35)
  { prefix: '3554', brand: 'LG' },
  { prefix: '3555', brand: 'LG' },
  // Google Pixel (RBI 35)
  { prefix: '3527', brand: 'Google' },
  { prefix: '3528', brand: 'Google' },
];

/**
 * Best-effort brand from TAC prefix — no network needed.
 * Tries longest prefix match first for accuracy.
 */
function lookupTacBrand(imei: string): string | null {
  const tac = imei.substring(0, 8);
  // Try 4-digit prefix first (more specific), then 3-digit
  for (const len of [4, 3]) {
    const pfx = tac.substring(0, len);
    const match = TAC_BRANDS.find(t => t.prefix === pfx);
    if (match) return match.brand;
  }
  return null;
}

// ── TAC / Device lookup via imeicheck.net ─────────────────────────────────────
// API docs: https://imeicheck.net/api-service
// Endpoint: POST https://api.imeicheck.net/v1/checks
// Headers:  Authorization: Bearer {token}
// Body:     { "deviceId": "{imei}", "serviceId": 1 }
// NOTE: After registering, you MUST enable API access at:
//       imeicheck.net/dashboard → API Manager → Enable
async function lookupDeviceApi(imei: string): Promise<DeviceInfo | null> {
  const apiKey = (process.env.IMEI_API_KEY ?? '').trim();
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.imeicheck.net/v1/checks', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body:   JSON.stringify({ deviceId: imei, serviceId: Number(process.env.IMEI_SERVICE_ID ?? 12) }),
      signal: AbortSignal.timeout(10000),
    });

    // ── Alert admin on actionable HTTP errors ───────────────────────────────
    if (res.status === 402) {
      console.error('[IMEI] imeicheck.net: credits exhausted (HTTP 402)');
      alertAdmin('Credits exhausted — recharge your imeicheck.net balance', 402, imei);
      return null;
    }
    if (res.status === 429) {
      console.warn('[IMEI] imeicheck.net: rate limited (HTTP 429)');
      alertAdmin('Rate limit exceeded — too many requests in a short period', 429, imei);
      return null;
    }
    if (res.status === 401 || res.status === 403) {
      console.error(`[IMEI] imeicheck.net: authentication error (HTTP ${res.status})`);
      alertAdmin(`API key rejected (HTTP ${res.status}) — check IMEI_API_KEY in environment variables`, res.status, imei);
      return null;
    }

    const data: any = await res.json();

    // Handle known error codes gracefully
    if (data?.code === 'api_disabled') {
      console.warn('[IMEI] imeicheck.net API is disabled — enable at dashboard → API Manager');
      alertAdmin('API is disabled — enable API Manager at imeicheck.net/dashboard', res.status, imei);
      return null;
    }
    if (data?.code === 'insufficient_balance' || data?.code === 'no_credits') {
      console.error('[IMEI] imeicheck.net: insufficient balance');
      alertAdmin('Credits exhausted — recharge your imeicheck.net balance', res.status, imei);
      return null;
    }
    if (data?.status !== 'successful') {
      console.warn(`[IMEI] imeicheck.net: status=${data?.status} code=${data?.code}`);
      return null;
    }

    // Service ID 22 response shape (observed):
    //   Nokia:   { deviceName:"NOKIA 3110",          brand:"NA",             manufacturer:"Nokia Mobile Phones Ltd" }
    //   Apple:   { deviceName:"Apple iPhone 5 A1429", brand:"Apple iPhone 5", manufacturer:"Apple Inc" }
    //   Unknown: { properties: [] }  (status still "successful" but no data)
    const props = Array.isArray(data?.properties) ? {} : (data?.properties ?? {});

    const deviceName: string = (props.deviceName ?? '').toString().trim();
    const mfr:        string = (props.manufacturer ?? '').toString().trim();
    const rawBrand:   string = (props.brand ?? '').toString().trim();

    // ── Extract brand ───────────────────────────────────────────────────────
    // Priority: TAC prefix (most reliable for PK market) → manufacturer → rawBrand
    let brand = lookupTacBrand(imei) ?? '';

    if (!brand) {
      // Parse manufacturer: "Nokia Mobile Phones Ltd" → "Nokia"
      //                     "Apple Inc"              → "Apple"
      //                     "Samsung Electronics"    → "Samsung"
      brand = extractBrandFromManufacturer(mfr);
    }
    if (!brand && rawBrand && rawBrand.toUpperCase() !== 'NA') {
      // rawBrand is sometimes "Apple iPhone 5" — take first word only
      brand = capitalise(rawBrand.split(' ')[0]);
    }

    // ── Extract model ───────────────────────────────────────────────────────
    // deviceName is most useful, e.g. "Apple iPhone 5 A1429", "NOKIA 3110"
    let model = '';
    if (deviceName) {
      // Strip the brand prefix from deviceName to get clean model
      model = deviceName
        .replace(new RegExp(`^${escapeRegex(brand)}\\s*`, 'i'), '')   // strip brand prefix
        .replace(/\[.*?\]/g, '')                                       // strip [A1429] [iPhone14,3] brackets
        .replace(/\b[A-Z]{2,}-[A-Z0-9]{3,}\b/g, '')                   // strip codes like SM-A155F, GT-I9300
        .replace(/\b[A-Z]{1,2}\d{4,}\b/g, '')                         // strip Apple codes A1429, A2484
        .replace(/\biPhone\d+,\d+\b/gi, '')                            // strip iPhone14,3 internal identifiers
        .replace(/\s+/g, ' ')
        .trim();

      // Edge case: if brand wasn't stripped (brand="NA"), strip first word if it looks like a brand name
      if (!model || model === deviceName.trim()) {
        const words = deviceName.split(' ');
        model = words.slice(1).join(' ').replace(/\[.*?\]/g, '').trim();
      }
    }

    if (!brand && !model && !deviceName) return null;

    // If we only have deviceName and couldn't parse, use it as model
    if (!model && deviceName) model = deviceName.replace(/\[.*?\]/g, '').trim();

    return {
      brand:      capitalise(brand || deviceName.split(' ')[0]),
      model:      model.replace(/\s+/g, ' ').trim(),
      found:      true,
      source:     'gsma_api',
      confidence: 'high',
    };
  } catch (err) {
    console.warn('[IMEI] Device API lookup failed:', err);
    return null;
  }
}

/**
 * Device lookup — tries GSMA API first, falls back to TAC prefix table.
 */
async function lookupDevice(imei: string): Promise<DeviceInfo> {
  // 1. Try GSMA API (returns full brand + model)
  const apiResult = await lookupDeviceApi(imei);
  if (apiResult) return apiResult;

  // 2. Fallback: TAC prefix → brand only (no model, but better than nothing)
  const brand = lookupTacBrand(imei);
  if (brand) {
    return {
      brand,
      model:      '',
      found:      true,
      source:     'tac_prefix',
      confidence: 'low',
    };
  }

  return unknown();
}

function unknown(): DeviceInfo {
  return { brand: '', model: '', found: false, source: 'unknown', confidence: 'low' };
}

function capitalise(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Map manufacturer name → clean brand name
function extractBrandFromManufacturer(mfr: string): string {
  if (!mfr || mfr.toUpperCase() === 'NA') return '';
  const lower = mfr.toLowerCase();
  const MAP: Array<[string, string]> = [
    ['apple',    'Apple'],
    ['samsung',  'Samsung'],
    ['xiaomi',   'Xiaomi'],
    ['huawei',   'Huawei'],
    ['honor',    'Honor'],
    ['vivo',     'Vivo'],
    ['oppo',     'Oppo'],
    ['realme',   'Realme'],
    ['oneplus',  'OnePlus'],
    ['nokia',    'Nokia'],
    ['motorola', 'Motorola'],
    ['lenovo',   'Lenovo'],
    ['sony',     'Sony'],
    ['lg ',      'LG'],
    ['zte',      'ZTE'],
    ['google',   'Google'],
    ['tecno',    'Tecno'],
    ['infinix',  'Infinix'],
    ['itel',     'itel'],
    ['htc',      'HTC'],
  ];
  for (const [key, val] of MAP) {
    if (lower.includes(key)) return val;
  }
  // Fallback: first word of manufacturer
  return capitalise(mfr.split(' ')[0]);
}

// ── PTA / DIRBS compliance check ──────────────────────────────────────────────
// NOTE: The PTA DIRBS REST API (api.dirbs.pta.gov.pk) has been decommissioned.
// PTA compliance is now verified directly on the PTA portal by the user.
// The frontend shows a "Check PTA →" button that opens dirbs.pta.gov.pk.
// This function returns unknownPta() immediately so there is zero network delay.
async function checkPta(_imei: string): Promise<PtaResult> {
  return unknownPta();
}

function parsePtaStatus(raw: string): PtaResult {
  if (raw.includes('stolen'))                         return ptaResult('stolen',         '🚫 Stolen — DO NOT accept');
  if (raw.includes('blocked'))                        return ptaResult('blocked',        '🚫 Blocked by PTA');
  if (raw.includes('non_compliant') ||
      (raw.includes('non') && raw.includes('compliant')))
                                                      return ptaResult('non_compliant',  '⚠️ Non-Compliant');
  if (raw.includes('provisional'))                    return ptaResult('provisional',    '⚠️ Provisional Compliance');
  if (raw.includes('compliant'))                      return ptaResult('compliant',      '✅ PTA Compliant');
  if (raw.includes('not_registered') ||
      raw.includes('not registered'))                 return ptaResult('not_registered', '⚠️ Not Registered with PTA');
  return unknownPta();
}

function ptaResult(status: PtaStatusCode, label: string): PtaResult {
  return { status, label, checked: true };
}

function unknownPta(): PtaResult {
  return { status: 'unknown', label: '— PTA check unavailable', checked: false };
}

// ── Derive recommendation from checks ────────────────────────────────────────
function deriveRecommendation(pta: PtaResult, hasLuhnError: boolean): Recommendation {
  if (pta.status === 'stolen' || pta.status === 'blocked') return 'reject';
  if (pta.status === 'non_compliant' || pta.status === 'not_registered' || hasLuhnError) return 'caution';
  return 'accept';
}

// ── Main verify function ──────────────────────────────────────────────────────
export async function verifyImei(imei: string): Promise<ImeiVerifyResult> {
  const valid = isValidImei(imei);
  const warnings: string[] = [];

  if (!valid) warnings.push('IMEI failed Luhn check — may be incorrectly entered');

  // Run both checks in parallel
  const [deviceResult, ptaSettled] = await Promise.allSettled([
    lookupDevice(imei),
    checkPta(imei),
  ]);

  const device: DeviceInfo = deviceResult.status === 'fulfilled'
    ? deviceResult.value
    : unknown();

  const pta: PtaResult = ptaSettled.status === 'fulfilled'
    ? ptaSettled.value
    : unknownPta();

  if (!device.found) {
    warnings.push('Device not found — verify brand and model manually');
  } else if (device.source === 'tac_prefix') {
    warnings.push('Brand identified from TAC prefix — model not available, verify manually');
  }

  const recommendation = deriveRecommendation(pta, !valid);

  return { imei, isValid: valid, device, pta, recommendation, warnings };
}

// ── Periodic balance monitor ──────────────────────────────────────────────────
// Called every 6 hours from server.ts.
// Sends a warning at ≤ $5 (once/day) and a critical alert at ≤ $2 (every 6 h).

let lastLowAlertAt     = 0;
let lastCriticalAlertAt = 0;

export async function checkAndAlertImeiBalance(): Promise<void> {
  const apiKey = (process.env.IMEI_API_KEY ?? '').trim();
  if (!apiKey) return; // IMEI API not configured, nothing to monitor

  try {
    const res = await fetch('https://api.imeicheck.net/v1/accounts/me', {
      method:  'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept':        'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[IMEI Balance] Account endpoint returned HTTP ${res.status}`);
      return;
    }

    const data: any = await res.json();

    // imeicheck.net returns { balance: number, currency: string }
    const balance:  number = typeof data?.balance  === 'number' ? data.balance  : parseFloat(data?.balance  ?? 'NaN');
    const currency: string = data?.currency ?? 'USD';

    if (isNaN(balance)) {
      console.warn('[IMEI Balance] Could not parse balance from response:', JSON.stringify(data).slice(0, 200));
      return;
    }

    console.log(`[IMEI Balance] Current balance: ${currency} ${balance.toFixed(2)}`);

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const SIX_HRS =  6 * 60 * 60 * 1000;

    if (balance <= 2) {
      // Critical — alert every 6 hours
      if (now - lastCriticalAlertAt >= SIX_HRS) {
        lastCriticalAlertAt = now;
        lastLowAlertAt      = now; // reset low-alert timer too
        await sendImeiLowBalanceEmail({ balance, currency, critical: true });
        console.warn(`[IMEI Balance] Critical alert sent — ${currency} ${balance.toFixed(2)} remaining`);
      }
    } else if (balance <= 5) {
      // Low — alert once per day
      if (now - lastLowAlertAt >= ONE_DAY) {
        lastLowAlertAt = now;
        await sendImeiLowBalanceEmail({ balance, currency, critical: false });
        console.warn(`[IMEI Balance] Low balance alert sent — ${currency} ${balance.toFixed(2)} remaining`);
      }
    }
  } catch (err: any) {
    console.warn('[IMEI Balance] Balance check failed:', err?.message);
  }
}
