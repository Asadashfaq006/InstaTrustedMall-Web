import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import useBuyerStore from '@/stores/buyerStore';
import useBusinessStore from '@/stores/businessStore';
import { formatCurrency, getPaymentStatusConfig } from '@/utils/buyerHelpers';
import { PAYMENT_METHODS } from '@/constants/buyerConstants';
import { DollarSign, Calendar, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RecordPaymentModal({ open, onOpenChange, buyer, demandId }) {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const createPayment = useBuyerStore((s) => s.createPayment);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('cash');
      setReferenceNo('');
      setPaidAt(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [open]);

  if (!buyer) return null;

  const outstanding = buyer.outstanding || 0;
  const amountNum = parseFloat(amount) || 0;
  const newBalance = outstanding - amountNum;

  const handlePayFull = () => {
    if (outstanding > 0) {
      setAmount(outstanding.toString());
    }
  };

  const handleSubmit = async () => {
    if (amountNum <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let res;
      if (demandId) {
        // Record payment against specific demand
        res = await window.electronAPI.demands.recordPayment({
          businessId: activeBusiness.id,
          demandId,
          buyerId: buyer.id,
          amount: amountNum,
          method,
          referenceNo: referenceNo.trim() || null,
          notes: notes.trim() || null,
          paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        });
      } else {
        res = await createPayment({
          businessId: activeBusiness.id,
          buyerId: buyer.id,
          demandId: null,
          amount: amountNum,
          method,
          referenceNo: referenceNo.trim() || null,
          notes: notes.trim() || null,
          paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        });
      }

      if (res.success) {
        toast({ title: `Payment of ${formatCurrency(amountNum)} recorded` });
        onOpenChange(false);
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
            Recording payment for <span className="font-medium text-text-primary">{buyer.full_name}</span> ({buyer.buyer_code})
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          {/* Current Balance Info Box */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wide">Current Balance</p>
              <p className={cn(
                'text-lg font-bold',
                outstanding > 0 ? 'text-red-600' : 'text-emerald-600'
              )}>
                {formatCurrency(outstanding)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-text-muted">Total Paid</p>
              <p className="text-sm font-medium text-emerald-600">{formatCurrency(buyer.total_paid)}</p>
            </div>
          </div>

          {/* Demand Indicator */}
          {demandId && (
            <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <p className="text-xs text-blue-700 font-medium">Payment linked to Demand #{demandId}</p>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <Label htmlFor="payAmount">Amount *</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">Rs.</span>
                <Input
                  id="payAmount"
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
              {outstanding > 0 && (
                <Button variant="outline" size="sm" onClick={handlePayFull} className="whitespace-nowrap">
                  Pay Full ({formatCurrency(outstanding)})
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
              <Label htmlFor="payRef">Reference No.</Label>
              <Input
                id="payRef"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="payDate">Payment Date</Label>
              <Input
                id="payDate"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="payNotes">Notes</Label>
            <Textarea
              id="payNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes..."
              rows={2}
            />
          </div>

          {/* Live Preview Box */}
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
                <span className="text-blue-600">New Balance:</span>
                <span className={cn('text-right font-bold', newBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {formatCurrency(Math.max(newBalance, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || amountNum <= 0}>
            {saving ? 'Saving...' : `Record ${amountNum > 0 ? formatCurrency(amountNum) : 'Payment'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
