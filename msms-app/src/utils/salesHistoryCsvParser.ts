import { parseDDMMYYYY } from './format';

/**
 * CSV parser for backfilling sales history from a client's previous app.
 *
 * Expected columns (header row required, order doesn't matter):
 *   date*, productName*, brand, quantity, salePrice*, purchasePrice,
 *   customerName, customerPhone, customerCnic,
 *   paymentType, dueDate, paid
 *
 * * = required. Dates are DD/MM/YYYY. Separator: comma. Quoted fields supported.
 */

export interface SalesHistoryCsvRow {
  date:           string;
  productName:    string;
  brand:          string;
  quantity:       string;
  salePrice:      string;
  purchasePrice:  string;
  customerName:   string;
  customerPhone:  string;
  customerCnic:   string;
  paymentType:    string;
  dueDate:        string;
  paid:           string;
}

export interface ParseResult {
  rows:   SalesHistoryCsvRow[];
  errors: string[];
}

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

export function parseSalesHistoryCSV(text: string): ParseResult {
  const errors: string[] = [];
  const rows:   SalesHistoryCsvRow[] = [];

  const lines = text
    .split('\n')
    .map(l => l.trim().replace(/\r$/, ''))
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must have a header row and at least one data row.'] };
  }

  const headers = splitLine(lines[0]).map(h =>
    h.toLowerCase().replace(/[\s_\-]/g, '')
  );

  const alias: Record<string, keyof SalesHistoryCsvRow> = {
    date:            'date',
    saledate:        'date',
    productname:     'productName',
    product:         'productName',
    name:            'productName',
    brand:           'brand',
    quantity:        'quantity',
    qty:             'quantity',
    saleprice:       'salePrice',
    price:           'salePrice',
    amount:          'salePrice',
    purchaseprice:   'purchasePrice',
    costprice:       'purchasePrice',
    customername:    'customerName',
    customer:        'customerName',
    customerphone:   'customerPhone',
    phone:           'customerPhone',
    customercnic:    'customerCnic',
    cnic:            'customerCnic',
    paymenttype:     'paymentType',
    payment:         'paymentType',
    duedate:         'dueDate',
    installmentdue:  'dueDate',
    paid:            'paid',
    installmentpaid: 'paid',
  };

  const fieldIndex: Partial<Record<keyof SalesHistoryCsvRow, number>> = {};
  headers.forEach((h, i) => {
    const field = alias[h];
    if (field) fieldIndex[field] = i;
  });

  const required: (keyof SalesHistoryCsvRow)[] = ['date', 'productName', 'salePrice'];
  const missing = required.filter(f => fieldIndex[f] === undefined);
  if (missing.length) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missing.join(', ')}. Check the template.`],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    const get = (field: keyof SalesHistoryCsvRow) => {
      const idx = fieldIndex[field];
      return idx !== undefined ? (values[idx] ?? '').trim() : '';
    };

    const date = get('date');
    const productName = get('productName');
    const salePrice = get('salePrice');
    const paymentType = get('paymentType').toLowerCase() === 'installment' ? 'INSTALLMENT' : 'CASH';
    const dueDate = get('dueDate');

    if (!productName) {
      errors.push(`Row ${i + 1}: productName is required — skipped.`);
      continue;
    }
    if (!parseDDMMYYYY(date)) {
      errors.push(`Row ${i + 1} (${productName}): invalid date "${date}" — expected DD/MM/YYYY — skipped.`);
      continue;
    }
    if (isNaN(Number(salePrice)) || !salePrice) {
      errors.push(`Row ${i + 1} (${productName}): invalid salePrice "${salePrice}" — skipped.`);
      continue;
    }
    if (paymentType === 'INSTALLMENT' && !parseDDMMYYYY(dueDate)) {
      errors.push(`Row ${i + 1} (${productName}): installment sales need a valid dueDate — skipped.`);
      continue;
    }

    rows.push({
      date,
      productName,
      brand:         get('brand'),
      quantity:      get('quantity')      || '1',
      salePrice,
      purchasePrice: get('purchasePrice'),
      customerName:  get('customerName'),
      customerPhone: get('customerPhone'),
      customerCnic:  get('customerCnic'),
      paymentType,
      dueDate,
      paid:          get('paid'),
    });
  }

  return { rows, errors };
}
