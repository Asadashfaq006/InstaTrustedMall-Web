import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a local absolute file path to a proper local-file:// URL.
 * Handles Windows backslashes and drive letters correctly.
 */
export function localFileUrl(filePath) {
  if (!filePath) return '';
  // Already a web-safe URL — pass through
  if (/^(https?:|data:|blob:)/.test(filePath)) return filePath;
  // Server-relative path (e.g. /uploads/products/abc123.jpg)
  if (filePath.startsWith('/uploads')) return filePath;
  // Missing leading slash (e.g. uploads/products/abc123.jpg)
  if (filePath.startsWith('uploads/') || filePath.startsWith('uploads\\')) return '/' + filePath.replace(/\\/g, '/');
  // OS file path — not displayable in browser
  return '';
}

/**
 * Parse a SQLite datetime string into a JS Date.
 * SQLite datetime('now') stores UTC as 'YYYY-MM-DD HH:MM:SS' without timezone.
 * Without the 'Z' suffix, JS Date() treats it as local time — causing offset bugs.
 */
export function parseDbDate(dateStr) {
  if (!dateStr) return null;
  // Already has timezone info (T + Z/offset) → leave as-is
  if (dateStr.includes('T') && (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr))) {
    return new Date(dateStr);
  }
  // SQLite format: 'YYYY-MM-DD HH:MM:SS' → convert to ISO 8601 UTC
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}
