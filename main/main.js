const { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, registerIpcHandlers, getDb } = require('./db');
const { startBackupScheduler, stopBackupScheduler } = require('./scheduler');

// ── Thermal Print ─────────────────────────────────────────────────────────────
const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');
const rawPrinterDriver = require('./rawPrinterDriver');
const THERMAL_PRINTER_NAME = 'BlackCopper 80mm Series';

/**
 * Create a new ThermalPrinter instance pointing at the named printer.
 * Each print job gets a fresh instance so there is no stale buffer.
 */
function createThermalPrinter(printerName) {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${printerName || THERMAL_PRINTER_NAME}`,
    driver: rawPrinterDriver,
    characterSet: CharacterSet.PC437_USA,
    width: 48,                                  // 48 chars @ Font A on 80 mm
    removeSpecialCharacters: false,
    lineCharacter: '-',
  });
}

let mainWindow;

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: path.join(__dirname, '../build/icon.ico'),
  });

  // Load Vite dev server in development, built files in production
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register custom protocol for local file access (images, etc.)
  protocol.handle('local-file', (request) => {
    // Strip scheme prefix (handles both // and ///)
    let filePath = decodeURIComponent(request.url.replace(/^local-file:\/{2,3}/, ''));
    // On Windows, URL parsing may prepend a / before drive letter (e.g. /C:/Users/...)
    if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(filePath)) {
      filePath = filePath.substring(1);
    }
    // Use pathToFileURL for a correct file:// URL on all platforms
    const { pathToFileURL } = require('url');
    return net.fetch(pathToFileURL(filePath).href);
  });

  initDatabase();
  registerIpcHandlers();

  // Register dialog handler
  ipcMain.handle('dialog:openFile', async (event, filters) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: filters || ['png', 'jpg', 'jpeg', 'svg'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'No file selected' };
    }
    return { success: true, data: result.filePaths[0] };
  });

  // Read file contents (for CSV imports)
  ipcMain.handle('dialog:readFile', async (event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Print IPC handlers ──────────────────────────────────────────────────────

  // Get available printers — returns Electron list (has isDefault flag)
  ipcMain.handle('print:getPrinters', async (event) => {
    try {
      const wc = event.sender;
      const printers = wc.getPrintersAsync
        ? await wc.getPrintersAsync()
        : wc.getPrinters();
      console.log(`[print] getPrinters → ${printers.length} printers found`);
      return { success: true, data: printers };
    } catch (err) {
      console.error('[print] getPrinters error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ── print:printDemand ─────────────────────────────────────────────────────
  // Pipeline: structured demand data → node-thermal-printer ESC/POS buffer
  //           → rawPrinterDriver → Win32 winspool WritePrinter (RAW mode)
  // Sends native ESC/POS commands directly to the thermal printer — no
  // HTML, no PDF, no Chromium print pipeline involved.
  // ────────────────────────────────────────────────────────────────────────
  ipcMain.handle('print:printDemand', async (_event, { demand, business, printerName }) => {
    console.log('[print] ── printDemand ─────────────────────────────────');
    try {
      if (!demand) return { success: false, error: 'No demand data' };

      const name = printerName || THERMAL_PRINTER_NAME;
      const printer = createThermalPrinter(name);

      const fmt = (n) => {
        const v = parseFloat(n) || 0;
        return v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      const fmtDate = (d) => {
        if (!d) return '';
        try {
          return new Date(d).toLocaleDateString('en-PK', {
            year: 'numeric', month: 'short', day: 'numeric',
          });
        } catch { return String(d); }
      };

      // ── Logo ─────────────────────────────────────────────────────────
      if (business?.logo_path) {
        try {
          const logoPath = business.logo_path;
          if (fs.existsSync(logoPath)) {
            await printer.printImage(logoPath);
            printer.newLine();
            console.log('[print] Logo printed:', logoPath);
          } else {
            console.warn('[print] Logo file not found:', logoPath);
          }
        } catch (logoErr) {
          console.warn('[print] Could not print logo:', logoErr.message);
        }
      }

      // ── Header ───────────────────────────────────────────────────────
      printer.alignCenter();
      printer.setTextDoubleWidth();
      printer.bold(true);
      printer.println(business?.name || 'Company Name');
      printer.bold(false);
      printer.setTextNormal();
      if (business?.address) printer.println(business.address);
      if (business?.phone)   printer.println(`Tel: ${business.phone}`);
      if (business?.email)   printer.println(business.email);
      printer.drawLine();

      // ── Invoice meta ─────────────────────────────────────────────────
      printer.alignLeft();
      const invoiceDate = fmtDate(demand.confirmed_at || demand.created_at);
      printer.leftRight('INVOICE', `Date: ${invoiceDate}`);

      const invoiceNum = demand.serial_number
        ? demand.serial_number.replace(/^[A-Z]+-0*/i, '') || demand.serial_number
        : null;
      if (invoiceNum) {
        printer.leftRight(`No: ${invoiceNum}`, demand.demand_code || '');
      } else if (demand.demand_code) {
        printer.println(demand.demand_code);
      }
      if (demand.status) {
        printer.leftRight('Status:', demand.status.charAt(0).toUpperCase() + demand.status.slice(1));
      }
      printer.drawLine();

      // ── Buyer ────────────────────────────────────────────────────────
      const buyerLabel = demand.buyer_name || 'Counter Sale';
      const buyerCode  = demand.buyer_code ? ` (${demand.buyer_code})` : '';
      printer.println(`Bill To: ${buyerLabel}${buyerCode}`);
      printer.drawLine();

      // ── Items table ──────────────────────────────────────────────────
      const items = demand.items || [];

      // Column formatter: truncates/pads to exact width
      const col = (str, width, rightAlign = false) => {
        const s = String(str ?? '').slice(0, width);
        return rightAlign ? s.padStart(width) : s.padEnd(width);
      };

      // Layout (43 of 48 chars):
      // [2:#][ ][13:Name][ ][7:Rate][ ][3:Qty][ ][6:Disc][ ][7:Total]
      const tblRow = (no, name, rate, qty, disc, total) =>
        col(no,    2, true) + ' ' +
        col(name, 13)       + ' ' +
        col(rate,  7, true) + ' ' +
        col(qty,   3, true) + ' ' +
        col(disc,  6, true) + ' ' +
        col(total, 7, true);

      // Table header — mirrors bill preview columns
      printer.bold(true);
      printer.println(tblRow('#', 'item', 'Rate', 'Qty', 'Disc', 'Total'));
      printer.bold(false);
      printer.drawLine();

      items.forEach((it, i) => {
        const qty       = Number(it.qty ?? it.quantity ?? 0);
        const rate      = Number(it.price ?? it.unit_price ?? it.unitPrice ?? 0);
        const gross     = qty * rate;
        const lineTotal = Number(it.line_total ?? gross);
        const discAmt   = Number(it.discount_amount ?? 0);
        const sku       = it.sku || it.product_sku || '';
        const name      = (it.product_name || 'Item').slice(0, 13);
        const discStr   = discAmt > 0 ? fmt(discAmt) : '-';

        // Row: all main bill-preview columns
        printer.println(tblRow(i + 1, name, fmt(rate), qty, discStr, fmt(lineTotal)));
      });
      printer.drawLine();

      // ── Totals ───────────────────────────────────────────────────────
      printer.leftRight('Gross Value:', fmt(demand.subtotal));
      if (demand.total_discount > 0) {
        printer.leftRight('Discount:', `-${fmt(demand.total_discount)}`);
      }
      if (demand.total_tax > 0) {
        printer.leftRight('Tax:', `+${fmt(demand.total_tax)}`);
      }
      printer.drawLine();
      printer.bold(true);
      printer.setTextDoubleWidth();
      printer.leftRight('NET AMOUNT', fmt(demand.grand_total));
      printer.setTextNormal();
      printer.bold(false);
      printer.drawLine();

      // ── Payment ──────────────────────────────────────────────────────
      printer.leftRight('Amount Paid:', fmt(demand.amount_paid));
      if (demand.balance_due > 0) {
        printer.bold(true);
        printer.leftRight('BALANCE DUE:', fmt(demand.balance_due));
        printer.bold(false);
      }

      // ── Notes ────────────────────────────────────────────────────────
      if (demand.notes) {
        printer.drawLine();
        printer.println(`Notes: ${demand.notes}`);
      }
      printer.drawLine();

      // ── Footer ───────────────────────────────────────────────────────
      printer.alignCenter();
      printer.bold(true);
      printer.println('No return / exchange without this bill');
      printer.bold(false);
      if (business?.footer_text) printer.println(business.footer_text);
      printer.println(`InstaMall | ${fmtDate(new Date().toISOString())}`);
      printer.newLine();

      printer.cut();

      // ── Execute: send ESC/POS bytes to printer ───────────────────────
      console.log(`[print] ESC/POS buffer: ${printer.getBuffer().length} bytes`);
      await printer.execute();
      console.log('[print] ✓ printDemand sent to printer');
      return { success: true };
    } catch (err) {
      console.error('[print] printDemand error:', err.message || err);
      return { success: false, error: err.message || String(err) };
    }
  });

  // ── print:testPrint ──────────────────────────────────────────────────────────
  ipcMain.handle('print:testPrint', async () => {
    console.log('[print] ── testPrint ────────────────────────────────────');
    try {
      const printer = createThermalPrinter(THERMAL_PRINTER_NAME);
      const now = new Date().toLocaleString('en-PK');

      printer.alignCenter();
      printer.setTextDoubleWidth();
      printer.bold(true);
      printer.println('TEST PRINT');
      printer.bold(false);
      printer.setTextNormal();
      printer.drawLine();
      printer.println('InstaMall POS');
      printer.println(THERMAL_PRINTER_NAME);
      printer.println(now);
      printer.drawLine();
      printer.println('If you can read this,');
      printer.println('printing works!');
      printer.drawLine();
      printer.newLine();
      printer.cut();

      console.log(`[print] testPrint buffer: ${printer.getBuffer().length} bytes`);
      await printer.execute();
      console.log('[print] testPrint ✓');
      return { success: true };
    } catch (err) {
      console.error('[print] testPrint error:', err.message || err);
      return { success: false, error: err.message || String(err) };
    }
  });

  createWindow();

  // Start auto-backup scheduler
  startBackupScheduler(getDb, mainWindow);
});

app.on('window-all-closed', () => {
  stopBackupScheduler();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
