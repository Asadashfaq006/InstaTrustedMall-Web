/**
 * Module 10: HID Scanner Listener
 *
 * USB/Bluetooth HID barcode scanners emulate keyboard input.
 * They "type" all digits in < 50ms then send Enter/Tab.
 * We use timing to distinguish scanner input from real keyboard typing.
 */

const DEFAULT_SCAN_DELAY_MS = 80;
const MIN_SCAN_LENGTH = 4;

/**
 * Attach a global keydown listener that detects scanner input.
 *
 * @param {(code: string) => void} onScanComplete — called when a complete scan is received
 * @param {object} [opts]
 * @param {number} [opts.scanDelayMs=80] — ms to wait after last char before completing
 * @param {number} [opts.minLength=4]    — minimum chars to consider a scan
 * @returns {() => void} detach function
 */
export function attachScannerListener(onScanComplete, opts = {}) {
  const scanDelayMs = opts.scanDelayMs || DEFAULT_SCAN_DELAY_MS;
  const minLength = opts.minLength || MIN_SCAN_LENGTH;

  let buffer = '';
  let bufferTimer = null;

  const handler = (e) => {
    // Skip if focused in an input/textarea (unless they're scanner-aware)
    const active = document.activeElement;
    const isScannerInput = active?.dataset?.scannerAware === 'true';
    const isInputField = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

    // If the user is in an input field that isn't scanner-aware, don't intercept
    if (isInputField && !isScannerInput) return;

    // Ignore modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

    // Scanner suffix: Enter or Tab completes the scan immediately
    if ((e.key === 'Enter' || e.key === 'Tab') && buffer.length >= minLength) {
      e.preventDefault();
      e.stopPropagation();
      const code = buffer.trim();
      buffer = '';
      clearTimeout(bufferTimer);
      onScanComplete(code);
      return;
    }

    // Accumulate printable characters
    if (e.key.length === 1) {
      buffer += e.key;
      clearTimeout(bufferTimer);
      // Auto-complete after scanDelayMs of no input
      bufferTimer = setTimeout(() => {
        if (buffer.length >= minLength) {
          const code = buffer.trim();
          buffer = '';
          onScanComplete(code);
        } else {
          buffer = ''; // too short — was real keyboard input
        }
      }, scanDelayMs);
    }
  };

  window.addEventListener('keydown', handler, true); // capture phase
  return () => {
    window.removeEventListener('keydown', handler, true);
    clearTimeout(bufferTimer);
    buffer = '';
  };
}

/**
 * Strip configured prefix and suffix from a scanned code.
 */
export function stripPrefixSuffix(code, prefix, suffix) {
  if (!code) return '';
  let result = code;
  if (prefix && result.startsWith(prefix)) result = result.slice(prefix.length);
  if (suffix && result.endsWith(suffix)) result = result.slice(0, -suffix.length);
  return result.trim();
}
