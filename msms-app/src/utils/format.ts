export function formatCnic(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function formatPhone(text: string): string {
  return text.replace(/\D/g, '').slice(0, 11);
}

// Extracts a 15-digit run (GSMA IMEI length) from a scanned barcode string,
// rather than requiring the whole decoded string to be exactly 15 digits.
// Some IMEI barcodes decode with a stray prefix/suffix character (a label
// like "IMEI:", a trailing checksum digit the encoder embeds) that would
// otherwise make an exact-match check silently misclassify it as a plain
// product barcode. Returns null if no 15-digit run is present at all.
export function extractImei(code: string): string | null {
  const match = code.trim().match(/\d{15}/);
  return match ? match[0] : null;
}

export function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Formats a Date as "DD/MM/YYYY" — the inverse of parseDDMMYYYY below.
export function formatDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

// Parses a "DD/MM/YYYY" string into a Date, returning null if invalid.
export function parseDDMMYYYY(text: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;

  const day   = Number(match[1]);
  const month = Number(match[2]);
  const year  = Number(match[3]);
  const date  = new Date(year, month - 1, day);

  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValid ? date : null;
}
