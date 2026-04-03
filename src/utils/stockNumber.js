export function roundStockNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export function formatStockNumber(value) {
  const rounded = roundStockNumber(value);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function sanitizeStockDecimalInput(value) {
  if (value === '') return '';
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  const intPart = parts[0] ?? '';
  if (parts.length === 1) return intPart;
  const decPart = parts.slice(1).join('').slice(0, 3);
  return `${intPart}.${decPart}`;
}
