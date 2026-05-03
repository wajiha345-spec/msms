/**
 * Simple CSV parser — no external dependency needed.
 *
 * Expected columns (header row required, order doesn't matter):
 *   name*, brand*, category, condition, barcode, imei,
 *   purchasePrice*, salePrice*, stock
 *
 * * = required
 * Separator: comma. Quoted fields supported ("value with, comma").
 */

export interface CsvRow {
  name:          string;
  brand:         string;
  category:      string;
  condition:     string;
  barcode:       string;
  imei:          string;
  purchasePrice: string;
  salePrice:     string;
  stock:         string;
}

export interface ParseResult {
  rows:   CsvRow[];
  errors: string[];
}

/** Split one CSV line respecting quoted fields */
function splitLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): ParseResult {
  const errors: string[] = [];
  const rows:   CsvRow[] = [];

  const lines = text
    .split('\n')
    .map(l => l.trim().replace(/\r$/, ''))
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must have a header row and at least one data row.'] };
  }

  // Normalise header names: lowercase, strip spaces and special chars
  const headers = splitLine(lines[0]).map(h =>
    h.toLowerCase().replace(/[\s_\-]/g, '')
  );

  // Map common header aliases to canonical field names
  const alias: Record<string, keyof CsvRow> = {
    name:          'name',
    productname:   'name',
    brand:         'brand',
    make:          'brand',
    category:      'category',
    type:          'category',
    condition:     'condition',
    barcode:       'barcode',
    ean:           'barcode',
    upc:           'barcode',
    imei:          'imei',
    purchaseprice: 'purchasePrice',
    costprice:     'purchasePrice',
    buyprice:      'purchasePrice',
    saleprice:     'salePrice',
    sellprice:     'salePrice',
    price:         'salePrice',
    stock:         'stock',
    quantity:      'stock',
    qty:           'stock',
  };

  const fieldIndex: Partial<Record<keyof CsvRow, number>> = {};
  headers.forEach((h, i) => {
    const field = alias[h];
    if (field) fieldIndex[field] = i;
  });

  const required: (keyof CsvRow)[] = ['name', 'brand', 'purchasePrice', 'salePrice'];
  const missing = required.filter(f => fieldIndex[f] === undefined);
  if (missing.length) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missing.join(', ')}. Check the template.`],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    const get = (field: keyof CsvRow) => {
      const idx = fieldIndex[field];
      return idx !== undefined ? (values[idx] ?? '').trim() : '';
    };

    const name = get('name');
    const brand = get('brand');
    const purchasePrice = get('purchasePrice');
    const salePrice = get('salePrice');

    if (!name || !brand) {
      errors.push(`Row ${i + 1}: name and brand are required — skipped.`);
      continue;
    }
    if (isNaN(Number(purchasePrice)) || !purchasePrice) {
      errors.push(`Row ${i + 1} (${name}): invalid purchasePrice "${purchasePrice}" — skipped.`);
      continue;
    }
    if (isNaN(Number(salePrice)) || !salePrice) {
      errors.push(`Row ${i + 1} (${name}): invalid salePrice "${salePrice}" — skipped.`);
      continue;
    }

    rows.push({
      name,
      brand,
      category:      get('category')      || 'phone',
      condition:     get('condition')      || 'new',
      barcode:       get('barcode'),
      imei:          get('imei'),
      purchasePrice,
      salePrice,
      stock:         get('stock')          || '0',
    });
  }

  return { rows, errors };
}
