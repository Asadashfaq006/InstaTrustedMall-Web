import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import useBusinessStore from '@/stores/businessStore';
import { formatCurrency } from '@/utils/buyerHelpers';
import { localFileUrl } from '@/lib/utils';
import { Printer, Save, X, CheckCircle, PrinterCheck, DollarSign, Clock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ConfirmDemandDialog
 *
 * Shows a bill preview matching BillPreview layout.
 * Action buttons: Save Draft, Print (thermal), Confirm & Print, Confirm, Cancel.
 */
export default function ConfirmDemandDialog({
  open,
  onOpenChange,
  demand,
  onSave,
  onPrint,
  onConfirm,
  onConfirmAndPrint,
  saving = false,
  confirming = false,
}) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const [printing, setPrinting] = useState(false);
  const [confirmingAndPrinting, setConfirmingAndPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [partialAmount, setPartialAmount] = useState('');

  const items = demand?.items || [];

  const handlePrint = useCallback(async () => {
    if (!demand) return;
    setPrinting(true);
    setPrintError(null);
    try {
      const api = window.electronAPI?.print;
      if (!api?.printDemand) {
        window.print();
        setPrinting(false);
        return;
      }

      let printerName = null;
      try {
        const res = await api.getPrinters();
        if (res.success && Array.isArray(res.data)) {
          const thermalKeywords = [
            'bc 88', 'bc-88', 'bc88', 'black copper',
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

  const handleConfirmAndPrint = useCallback(async () => {
    if (!onConfirmAndPrint) return;
    setConfirmingAndPrinting(true);
    setPrintError(null);
    try {
      const payOpts = { paymentStatus, paidAmount: paymentStatus === 'partial' ? (parseFloat(partialAmount) || 0) : 0 };
      const success = await onConfirmAndPrint(payOpts);
      if (success) {
        // Confirm succeeded — now print before navigating
        await handlePrint();
        // Close dialog and navigate after print
        onOpenChange?.(false);
        navigate('/demands');
      }
    } catch (err) {
      console.error('Confirm & Print error:', err);
      setPrintError(err.message || 'Confirm & Print failed');
    } finally {
      setConfirmingAndPrinting(false);
    }
  }, [onConfirmAndPrint, handlePrint, onOpenChange, navigate, paymentStatus, partialAmount]);

  if (!demand) return null;

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return d; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Confirm Demand</DialogTitle>
        <DialogDescription className="sr-only">Review invoice before confirming</DialogDescription>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Confirm &amp; Print</h3>
            {printError && (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                {printError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onSave && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={onSave} disabled={saving}>
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Draft'}
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint} disabled={printing}>
              <Printer className="w-3.5 h-3.5" /> {printing ? 'Printing...' : 'Print'}
            </Button>
            {onConfirmAndPrint && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleConfirmAndPrint}
                disabled={confirmingAndPrinting || confirming || (paymentStatus === 'partial' && (parseFloat(partialAmount) || 0) <= 0)}
              >
                <PrinterCheck className="w-3.5 h-3.5" /> {confirmingAndPrinting ? 'Processing...' : 'Confirm & Print'}
              </Button>
            )}
            <Button size="sm" variant="default" className="gap-1.5" onClick={() => {
              const payOpts = { paymentStatus, paidAmount: paymentStatus === 'partial' ? (parseFloat(partialAmount) || 0) : 0 };
              onConfirm(payOpts);
            }} disabled={confirming || confirmingAndPrinting || (paymentStatus === 'partial' && (parseFloat(partialAmount) || 0) <= 0)}>
              <CheckCircle className="w-3.5 h-3.5" /> {confirming ? 'Confirming...' : 'Confirm'}
            </Button>
            <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-200 text-text-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payment Status Selection */}
        <div className="px-4 py-3 border-b border-gray-200 bg-blue-50/50 print:hidden shrink-0">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Payment Status</p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Paid */}
            <button
              onClick={() => { setPaymentStatus('paid'); setPartialAmount(''); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                paymentStatus === 'paid'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-text-secondary hover:border-gray-300'
              )}
            >
              <DollarSign className="w-4 h-4" />
              Paid
            </button>
            {/* Outstanding */}
            <button
              onClick={() => { setPaymentStatus('outstanding'); setPartialAmount(''); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                paymentStatus === 'outstanding'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 bg-white text-text-secondary hover:border-gray-300'
              )}
            >
              <Clock className="w-4 h-4" />
              Outstanding
            </button>
            {/* Partial */}
            <button
              onClick={() => setPaymentStatus('partial')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                paymentStatus === 'partial'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-text-secondary hover:border-gray-300'
              )}
            >
              <CreditCard className="w-4 h-4" />
              Partial
            </button>
          </div>
          {/* Partial amount input */}
          {paymentStatus === 'partial' && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-text-muted">Amount:</span>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">Rs.</span>
                <Input
                  type="number"
                  min="0"
                  max={demand?.grand_total || 0}
                  step="0.01"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="pl-10 h-8 text-sm"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <span className="text-xs text-text-muted">
                of {formatCurrency(demand?.grand_total || 0)}
              </span>
              {parseFloat(partialAmount) > 0 && (
                <span className="text-xs font-medium text-red-600 ml-auto">
                  Balance: {formatCurrency(Math.max((demand?.grand_total || 0) - (parseFloat(partialAmount) || 0), 0))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Invoice Content — same layout as BillPreview */}
        <div className="flex-1 overflow-y-auto p-6" id="confirm-preview-content">
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
                    Invoice No: <span className="font-bold text-gray-900 font-mono">
                      {demand.serial_number.replace(/^[A-Z]+-0*/i, '') || demand.serial_number}
                    </span>
                  </p>
                )}
                <p className="text-xs text-gray-500 font-mono">{demand.demand_code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Date: <span className="font-medium">{fmtDate(demand.confirmed_at || demand.created_at)}</span>
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
                  <th className="text-right pb-2 font-semibold text-gray-700">Disc.</th>
                  <th className="text-right pb-2 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id || i} className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">{i + 1}</td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {item.sku && <p className="text-[11px] text-gray-500 font-mono">{item.sku}</p>}
                    </td>
                    <td className="py-2 text-right font-mono">{formatCurrency(item.price)}</td>
                    <td className="py-2 text-right">{item.qty}</td>
                    <td className="py-2 text-right">
                      {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : '—'}
                    </td>
                    <td className="py-2 text-right font-medium font-mono">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
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
                Generated by InstaMall &bull; {fmtDate(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
