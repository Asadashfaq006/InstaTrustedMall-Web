import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import useDemandStore from '@/stores/demandStore';
import useBusinessStore from '@/stores/businessStore';
import { formatCurrency } from '@/utils/buyerHelpers';
import { PAYMENT_METHODS } from '@/constants/buyerConstants';
import { DollarSign, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal for recording payment against a specific demand.
 * Props:
 *   open         - boolean
 *   onOpenChange - (open) => void
 *   demand       - demand object with id, demand_code, balance_due, buyer_name, buyer_id, grand_total, amount_paid
 *   onSuccess    - () => void callback after successful payment
 */
export default function DemandPaymentModal({ open, onOpenChange, demand, onSuccess }) {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const recordPayment = useDemandStore((s) => s.recordPayment);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('cash');
      setReferenceNo('');
      setPaidAt(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [open]);

  if (!demand) return null;

  const balanceDue = demand.balance_due || 0;
  const amountNum = parseFloat(amount) || 0;
  const newBalance = balanceDue - amountNum;

  const handlePayFull = () => {
    if (balanceDue > 0) setAmount(balanceDue.toString());
  };

  const handleSubmit = async () => {
    if (amountNum <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await recordPayment({
        businessId: activeBusiness.id,
        demandId: demand.id,
        buyerId: demand.buyer_id,
        amount: amountNum,
        method,
        referenceNo: referenceNo.trim() || null,
        notes: notes.trim() || null,
        paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
      });

      if (res.success) {
        toast({ title: `Payment of ${formatCurrency(amountNum)} recorded for ${demand.demand_code}` });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({ title: res.error || 'Failed to record payment', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Payment for demand <span className="font-medium text-text-primary font-mono">{demand.demand_code}</span>
            {demand.buyer_name && (
              <> — <span className="font-medium text-text-primary">{demand.buyer_name}</span></>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          {/* Balance Info */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wide">Demand Balance</p>
              <p className={cn('text-lg font-bold', balanceDue > 0 ? 'text-red-600' : 'text-emerald-600')}>
                {formatCurrency(balanceDue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-text-muted">Demand Total</p>
              <p className="text-sm font-medium text-text-primary">{formatCurrency(demand.grand_total)}</p>
              <p className="text-[11px] text-text-muted">
                Paid: {formatCurrency(demand.amount_paid || 0)}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="demandPayAmount">Amount *</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">Rs.</span>
                <Input
                  id="demandPayAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {balanceDue > 0 && (
                <Button variant="outline" size="sm" onClick={handlePayFull} className="whitespace-nowrap">
                  Pay Full ({formatCurrency(balanceDue)})
                </Button>
              )}
            </div>
          </div>

          {/* Payment Method Cards */}
          <div>
            <Label>Payment Method</Label>
            <div className="grid grid-cols-5 gap-2 mt-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-center',
                    method === m.key
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-gray-200 hover:border-gray-300 text-text-secondary'
                  )}
                >
                  <span className="text-lg leading-none">{m.icon}</span>
                  <span className="text-[10px] font-medium leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reference & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="demandPayRef">Reference No.</Label>
              <Input
                id="demandPayRef"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="demandPayDate">Payment Date</Label>
              <Input
                id="demandPayDate"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="demandPayNotes">Notes</Label>
            <Textarea
              id="demandPayNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes..."
              rows={2}
            />
          </div>

          {/* Live Preview */}
          {amountNum > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700">Payment Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-xs">
                <span className="text-blue-600">Amount:</span>
                <span className="text-right font-medium text-blue-800">{formatCurrency(amountNum)}</span>
                <span className="text-blue-600">Method:</span>
                <span className="text-right font-medium text-blue-800 capitalize">{method}</span>
                <span className="text-blue-600">New Demand Balance:</span>
                <span className={cn('text-right font-bold', newBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {formatCurrency(Math.max(newBalance, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || amountNum <= 0}>
            {saving ? 'Saving...' : `Record ${amountNum > 0 ? formatCurrency(amountNum) : 'Payment'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
