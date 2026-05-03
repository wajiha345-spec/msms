/**
 * barcodeApi.ts — look up product info from barcode.
 *
 * Lookup order:
 *  1. Your own backend shared catalog  (/api/catalog/:barcode)
 *     — grows every time any shopkeeper adds a new product manually.
 *     — best source for Pakistani/regional phone brands (Itel, Infinix,
 *       Q-Mobile, Tecno, etc.) that aren't in Western databases.
 *
 *  2. UPCItemDB public API (fallback)
 *     — covers Samsung, Apple, Xiaomi, Oppo, Vivo and other global brands.
 *     — free tier: 100 lookups/day, no API key required.
 *
 * IMEIs (15-digit numbers) identify individual devices, NOT models — they
 * cannot be looked up in any product database.  Only box barcodes (EAN-13,
 * UPC-A, Code-128 …) carry model information.
 */

import { catalogApi } from '../api/catalog';

export interface BarcodeLookupResult {
  name:     string;
  brand:    string;
  category: string;
  source:   'catalog' | 'upcitemdb' | 'unknown';
}

function deriveCategory(raw: string): string {
  const c = raw.toLowerCase();
  if (c.includes('tablet'))                                      return 'tablet';
  if (c.includes('laptop') || c.includes('notebook'))           return 'laptop';
  if (c.includes('accessory') || c.includes('case') ||
      c.includes('charger')   || c.includes('cable') ||
      c.includes('earphone')  || c.includes('headphone'))       return 'accessory';
  if (c.includes('watch') || c.includes('wearable'))            return 'smartwatch';
  return 'phone';
}

async function tryUpcItemDb(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const res  = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;

    const json = await res.json();
    if (json.code !== 'OK' || !Array.isArray(json.items) || json.items.length === 0) {
      return null;
    }

    const item = json.items[0];
    const name = (item.title ?? '').trim();
    if (!name) return null;

    return {
      name,
      brand:    (item.brand ?? '').trim(),
      category: deriveCategory(item.category ?? ''),
      source:   'upcitemdb',
    };
  } catch {
    return null;
  }
}

/**
 * Main lookup function.
 * Tries shared catalog first, then UPCItemDB.
 * Returns null if nothing is found anywhere.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
  // ── 1. Shared catalog (our backend) ────────────────────────────────────────
  try {
    const res = await catalogApi.lookup(barcode);
    const entry = res.data.data;
    if (entry?.name) {
      return {
        name:     entry.name,
        brand:    entry.brand,
        category: entry.category,
        source:   'catalog',
      };
    }
  } catch (e: any) {
    // 404 = not in catalog yet — fall through to UPCItemDB
    if (e?.response?.status !== 404) {
      // Unexpected error — still fall through, don't block the user
    }
  }

  // ── 2. UPCItemDB (global brands fallback) ──────────────────────────────────
  return tryUpcItemDb(barcode);
}
