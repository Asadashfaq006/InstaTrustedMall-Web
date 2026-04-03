import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useBusinessStore from '@/stores/businessStore';
import { formatCurrency } from '@/utils/buyerHelpers';
import { localFileUrl } from '@/lib/utils';
import { Printer, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Builds a self-contained receipt HTML document with inline
   styles for printing via window.print().
   No Tailwind / external CSS needed — works 100% reliably.
───────────────────────────────────────────────────────────── */
function buildReceiptHtml({ demand, business }) {
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
    } catch { return d; }
  };

  const esc = (s) => String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const items = demand.items || [];

  const invoiceNum = demand.serial_number
    ? demand.serial_number.replace(/^[A-Z]+-0*/i, '') || demand.serial_number
    : null;

  const itemRows = items.map((it, i) => {
    const qty = Number(it.qty ?? it.quantity ?? 0);
    const rate = Number(it.price ?? it.unit_price ?? it.unitPrice ?? 0);
    const sku = it.sku || it.product_sku || '';
    const lineTotal = Number(it.line_total ?? (qty * rate));
    const discountAmount = Number(it.discount_amount ?? 0);
    const gross = qty * rate;
    return `<tr>
        <td class="tc">${i + 1}</td>
        <td><b>${esc(it.product_name)}</b>${sku ? `<br><span class="sm">${esc(sku)}</span>` : ''}</td>
        <td class="tr">${fmt(rate)}</td>
        <td class="tc">${qty}</td>
        <td class="tr">${fmt(gross)}</td>
        <td class="tr">${discountAmount > 0 ? fmt(discountAmount) : '-'}</td>
        <td class="tr"><b>${fmt(lineTotal)}</b></td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { margin: 0; }
  body {
    width: 100%;
    padding: 2mm;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    -webkit-text-size-adjust: 100%;
  }
  table { width:100%; border-collapse:collapse; }
  td, th { font-size:11px; padding:2px 1px; vertical-align:top; }
  th { font-weight:700; border-bottom:1px solid #000; padding-bottom:3px; font-size:10px; }
  .tc { text-align:center; }
  .tr { text-align:right; }
  .tl { text-align:left; }
  b { font-weight:700; }
  .sm { font-size:9px; color:#555; }
  .lg { font-size:14px; }
  .xl { font-size:16px; }
  .sep { border-top:1px dashed #000; margin:4px 0; }
  .sep2 { border-top:2px solid #000; margin:4px 0; }
  .row { display:flex; justify-content:space-between; padding:1px 0; }
  .muted { color:#444; }
  .totals td { padding:2px 1px; font-size:11px; }
  .items td { border-bottom:1px solid #ccc; padding:3px 1px; }
  .items tr:last-child td { border-bottom:none; }
</style>
</head>
<body>

<!-- Header -->
<div style="text-align:center;margin-bottom:3px;">
  <div class="xl" style="font-weight:700;">${esc(business?.name || 'Company Name')}</div>
  ${business?.address ? `<div class="sm">${esc(business.address)}</div>` : ''}
  ${business?.phone ? `<div class="sm">Tel: ${esc(business.phone)}</div>` : ''}
</div>

<div class="sep2"></div>

<!-- Invoice Meta -->
<table style="margin-bottom:3px;">
  <tr>
    <td class="lg" style="font-weight:700;">INVOICE</td>
    <td class="tr sm">Date: ${fmtDate(demand.confirmed_at || demand.created_at)}</td>
  </tr>
  ${invoiceNum ? `<tr><td>No: <b>${esc(invoiceNum)}</b></td><td class="tr sm">${esc(demand.demand_code || '')}</td></tr>` : `<tr><td class="sm">${esc(demand.demand_code || '')}</td></tr>`}
</table>

<!-- Buyer -->
<div style="padding:2px 3px;margin-bottom:3px;border:1px solid #aaa;">
  <span class="sm" style="text-transform:uppercase;">Bill To:</span>
  <b>${esc(demand.buyer_name || 'Counter Sale')}</b>
  ${demand.buyer_code ? ` <span class="sm">(${esc(demand.buyer_code)})</span>` : ''}
</div>

<div class="sep"></div>

<!-- Items -->
<table class="items">
  <thead>
    <tr>
      <th class="tc" style="width:16px;">#</th>
      <th class="tl">Item</th>
      <th class="tr">Rate</th>
      <th class="tc" style="width:24px;">Qty</th>
      <th class="tr">Gross</th>
      <th class="tr">Disc</th>
      <th class="tr">Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<div class="sep2"></div>

<!-- Totals -->
<table class="totals">
  <tr><td class="muted">Gross Value</td><td class="tr">${fmt(demand.subtotal)}</td></tr>
  ${demand.total_discount > 0 ? `<tr><td>Discount</td><td class="tr">-${fmt(demand.total_discount)}</td></tr>` : ''}
  ${demand.total_tax > 0 ? `<tr><td class="muted">Tax</td><td class="tr">+${fmt(demand.total_tax)}</td></tr>` : ''}
</table>
<div class="sep2"></div>
<table class="totals">
  <tr><td class="lg" style="font-weight:700;">NET AMOUNT</td><td class="tr lg" style="font-weight:700;">${fmt(demand.grand_total)}</td></tr>
</table>

<div class="sep"></div>

<!-- Payment -->
<table class="totals">
  <tr><td>Paid</td><td class="tr">${fmt(demand.amount_paid)}</td></tr>
  ${demand.balance_due > 0 ? `<tr><td><b>BALANCE DUE</b></td><td class="tr"><b>${fmt(demand.balance_due)}</b></td></tr>` : ''}
</table>

${demand.notes ? `<div class="sep"></div><div style="margin-bottom:3px;"><span class="sm" style="text-transform:uppercase;">Notes:</span><div style="font-size:10px;white-space:pre-wrap;">${esc(demand.notes)}</div></div>` : ''}

<div class="sep2"></div>

<!-- Footer -->
<div style="text-align:center;padding:2px 0;">
  <div style="font-size:10px;font-weight:700;">No return / exchange without this bill</div>
  ${business?.footer_text ? `<div class="sm" style="margin-top:1px;">${esc(business.footer_text)}</div>` : ''}
  <div class="sm" style="margin-top:2px;color:#999;">InstaMall &bull; ${fmtDate(new Date().toISOString())}</div>
</div>

</body>
</html>`;
}

export default function BillPreview({ open, onOpenChange, demand }) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);

  const items = demand?.items || [];

  const handlePrint = useCallback(async () => {
    if (!demand) return;
    setPrinting(true);
    setPrintError(null);
    try {
      const api = window.electronAPI?.print;
      if (!api?.printDemand) {
        // Web fallback: use browser print dialog
        window.print();
        setPrinting(false);
        return;
      }

      // Detect BC 88AC or any other thermal / POS printer
      let printerName = null;
      try {
        const res = await api.getPrinters();
        if (res.success && Array.isArray(res.data)) {
          const thermalKeywords = [
            'bc 88', 'bc-88', 'bc88',
            'black copper',
            'thermal', 'pos', 'receipt',
            '80mm', '58mm', 'rp-', 'xp-', 'tm-',
          ];
          const matched = res.data.find((p) =>
            thermalKeywords.some((kw) => p.name.toLowerCase().includes(kw))
          );
          printerName = matched?.name
            || res.data.find((p) => p.isDefault)?.name
            || null;
        }
      } catch (e) {
        console.warn('Printer detection failed:', e);
      }

      // Send structured demand data — main process builds ESC/POS commands
      const result = await api.printDemand({
        demand,
        business: activeBusiness,
        printerName,
      });

      if (!result.success) {
        console.error('Print failed:', result.error);
        setPrintError(result.error || 'Print failed');
      }
    } catch (err) {
      console.error('Print error:', err);
      setPrintError(err.message || 'Unexpected print error');
    } finally {
      setPrinting(false);
    }
  }, [demand, activeBusiness]);

  // All hooks declared above — safe to early-return now
  if (!demand) return null;

  const formatDateLocal = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return d;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Bill Preview</DialogTitle>
        <DialogDescription className="sr-only">Invoice preview for printing</DialogDescription>
        {/* Toolbar - hidden in print */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Bill Preview</h3>
            {printError && (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                {printError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" className="gap-1.5" onClick={handlePrint} disabled={printing}>
              <Printer className="w-3.5 h-3.5" /> {printing ? 'Printing...' : 'Print'}
            </Button>
            <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-200 text-text-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-6" id="bill-preview-content">
          <div className="max-w-[700px] mx-auto bg-white">
            {/* Company Header */}
            <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
              {activeBusiness?.logo_path && (
                <img
                  src={localFileUrl(activeBusiness.logo_path)}
                  alt="Business Logo"
                  className="w-16 h-16 object-contain mx-auto mb-2"
                />
              )}
              <h1 className="text-xl font-bold text-gray-900">
                {activeBusiness?.name || 'Company Name'}
              </h1>
              {activeBusiness?.address && (
                <p className="text-sm text-gray-600 mt-1">{activeBusiness.address}</p>
              )}
              {activeBusiness?.phone && (
                <p className="text-sm text-gray-600">{activeBusiness.phone}</p>
              )}
            </div>

            {/* Invoice Title */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">INVOICE</h2>
                {demand.serial_number && (
                  <p className="text-sm text-gray-600">
                    Invoice No: <span className="font-bold text-gray-900 font-mono">{demand.serial_number.replace(/^[A-Z]+-0*/i, '') || demand.serial_number}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 font-mono">{demand.demand_code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Date: <span className="font-medium">{formatDateLocal(demand.confirmed_at || demand.created_at)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Status: <span className="font-medium capitalize">{demand.status}</span>
                </p>
              </div>
            </div>

            {/* Buyer Info */}
            <div className="mb-6 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
              <p className="text-sm font-semibold text-gray-900">
                {demand.buyer_name || 'Counter Sale'}
              </p>
              {demand.buyer_code && (
                <p className="text-xs text-gray-500 font-mono">{demand.buyer_code}</p>
              )}
            </div>

            {/* Line Items Table */}
            <table className="w-full mb-6 text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left pb-2 font-semibold text-gray-700">#</th>
                  <th className="text-left pb-2 font-semibold text-gray-700">Product</th>
                  <th className="text-right pb-2 font-semibold text-gray-700">Rate</th>
                  <th className="text-right pb-2 font-semibold text-gray-700">Qty</th>
                  <th className="text-right pb-2 font-semibold text-gray-700">Gross</th>
                  <th className="text-right pb-2 font-semibold text-gray-700">Disc.</th>
                  <th className="text-right pb-2 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const gross = item.qty * item.price;
                  return (
                    <tr key={item.id || i} className="border-b border-gray-100">
                      <td className="py-2 text-gray-500">{i + 1}</td>
                      <td className="py-2">
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        {item.sku && <p className="text-[11px] text-gray-500 font-mono">{item.sku}</p>}
                      </td>
                      <td className="py-2 text-right font-mono">{formatCurrency(item.price)}</td>
                      <td className="py-2 text-right">{item.qty}</td>
                      <td className="py-2 text-right font-mono">{formatCurrency(gross)}</td>
                      <td className="py-2 text-right">
                        {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : '0.00'}
                      </td>
                      <td className="py-2 text-right font-medium font-mono">{formatCurrency(item.line_total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-[280px] space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gross Value:</span>
                  <span className="font-medium font-mono">{formatCurrency(demand.subtotal)}</span>
                </div>
                {demand.total_discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatCurrency(demand.total_discount)}</span>
                  </div>
                )}
                {demand.total_tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-mono">+{formatCurrency(demand.total_tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t-2 border-gray-800 pt-2 mt-2">
                  <span>Net Amount</span>
                  <span className="font-mono">{formatCurrency(demand.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Balance Section */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-end">
                <div className="w-[260px] space-y-1.5">
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>Amount Paid</span>
                    <span className="font-medium">{formatCurrency(demand.amount_paid)}</span>
                  </div>
                  {demand.balance_due > 0 && (
                    <div className="flex justify-between text-sm font-bold text-red-700 border-t border-gray-200 pt-1.5">
                      <span>Balance Due</span>
                      <span>{formatCurrency(demand.balance_due)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {demand.notes && (
              <div className="mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{demand.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-4 border-t border-gray-200 space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                No return or exchange available without this bill.
              </p>
              {activeBusiness?.footer_text && (
                <p className="text-xs text-gray-500">{activeBusiness.footer_text}</p>
              )}
              <p className="text-xs text-gray-400">
                Generated by InstaMall &bull; {formatDateLocal(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
