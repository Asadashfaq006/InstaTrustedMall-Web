/**
 * rawPrinterDriver.js
 * ────────────────────────────────────────────────────────────────────────────
 * Custom driver for node-thermal-printer that sends RAW ESC/POS bytes
 * directly to a Windows printer via the Win32 Spooler API (winspool.drv).
 *
 * This bypasses the GDI / XPS rendering pipeline entirely — the thermal
 * printer receives the exact ESC/POS byte stream produced by the library.
 *
 * Works on any Windows USB / network thermal printer visible in the
 * system printer list.
 * ────────────────────────────────────────────────────────────────────────────
 */
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── P/Invoke C# source that calls winspool.drv WritePrinter ───────────────
const CS_TYPE = `
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOCINFOW {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, ref DOCINFOW pDocInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendFile(string printerName, string filePath) {
        IntPtr hPrinter;
        DOCINFOW di = new DOCINFOW();
        di.pDocName  = "InstaMall Receipt";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
            return false;

        if (!StartDocPrinter(hPrinter, 1, ref di)) {
            ClosePrinter(hPrinter);
            return false;
        }

        if (!StartPagePrinter(hPrinter)) {
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return false;
        }

        byte[] bytes = File.ReadAllBytes(filePath);
        IntPtr pUnmanaged = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanaged, bytes.Length);

        int written;
        bool ok = WritePrinter(hPrinter, pUnmanaged, bytes.Length, out written);

        Marshal.FreeCoTaskMem(pUnmanaged);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return ok;
    }
}
`.trim();

/**
 * Send a raw binary file to a named Windows printer
 * using PowerShell + .NET P/Invoke (winspool.drv).
 */
function sendFileToPrinter(printerName, filePath) {
  return new Promise((resolve, reject) => {
    // Escape backslashes for PowerShell string embedding
    const safePath = filePath.replace(/\\/g, '\\\\');
    const safeName = printerName.replace(/'/g, "''");

    const ps = [
      `Add-Type -TypeDefinition @"\n${CS_TYPE}\n"@ -Language CSharp`,
      `$ok = [RawPrint]::SendFile('${safeName}', '${safePath}')`,
      `if ($ok) { Write-Output 'OK' } else { Write-Error 'WritePrinter failed'; exit 1 }`,
    ].join('\n');

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', ps],
      { timeout: 20000 },
      (err, stdout, stderr) => {
        if (err) {
          console.error('[rawPrint] PowerShell error:', err.message);
          if (stderr) console.error('[rawPrint] stderr:', stderr.trim());
          return reject(new Error(`Raw print failed: ${err.message}`));
        }
        if (stdout.trim() === 'OK') {
          resolve();
        } else {
          reject(new Error(`Raw print unexpected output: ${stdout.trim()}`));
        }
      }
    );
  });
}

// ── Driver interface expected by node-thermal-printer ──────────────────────
module.exports = {
  /**
   * Return all available system printers.
   * Not strictly needed when we specify the printer name,
   * but the library calls this for "auto" mode.
   */
  getPrinters() {
    return [];
  },

  /**
   * Return info about a specific printer.
   * The library only checks that `status` does not contain "NOT-AVAILABLE".
   */
  getPrinter(name) {
    return { name, status: 'READY' };
  },

  /**
   * Send raw bytes to the printer.
   * node-thermal-printer calls this from its execute() method.
   *
   * @param {Object} opts
   * @param {Buffer} opts.data    - The ESC/POS byte buffer
   * @param {string} opts.printer - Printer name
   * @param {string} opts.type    - "RAW"
   * @param {Function} opts.success - callback(jobID)
   * @param {Function} opts.error   - callback(err)
   */
  printDirect({ data, printer, type, success, error }) {
    const tmpFile = path.join(os.tmpdir(), `instamall-raw-${Date.now()}.bin`);
    try {
      fs.writeFileSync(tmpFile, data);
      console.log(`[rawPrint] ${data.length} bytes → ${tmpFile} → "${printer}"`);
    } catch (err) {
      error(err);
      return;
    }

    sendFileToPrinter(printer, tmpFile)
      .then(() => {
        console.log('[rawPrint] ✓ sent to printer');
        try { fs.unlinkSync(tmpFile); } catch {}
        success(Date.now());
      })
      .catch((err) => {
        console.error('[rawPrint] ✗', err.message);
        try { fs.unlinkSync(tmpFile); } catch {}
        error(err);
      });
  },
};
