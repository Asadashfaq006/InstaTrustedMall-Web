import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import useDemandStore from '@/stores/demandStore';
import { DEMAND_STATUS } from '@/constants/demandConstants';
import { formatCurrency } from '@/utils/buyerHelpers';
import { getAvatarColor, getBuyerInitials } from '@/utils/buyerHelpers';
import { PAYMENT_METHODS } from '@/constants/buyerConstants';
import {
  X, FileText, Edit, CheckCircle, XCircle, RotateCcw,
  Trash2, DollarSign, Printer, CreditCard, Package,
} from 'lucide-react';
import { cn, parseDbDate } from '@/lib/utils';
import EntityAuditTrail from '@/components/audit/EntityAuditTrail';

/**
 * 480px slide-in panel showing demand details, line items, payments.
 * Props:
 *   demandId     - ID to load
 *   onClose      - () => void
 *   onRefresh    - () => void  (reload parent list after status change)
 *   onRecordPayment - (demand) => void (open payment modal)
 */
export default function DemandDetailPanel({ demandId, onClose, onRefresh, onRecordPayment }) {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { toast } = useToast();
  const {
    selectedDemand: demand,
    detailLoading,
    loadDemandDetail,
    confirmDemand,
    cancelDemand,
    deleteDemand,
    reopenDemand,
  } = useDemandStore();

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);

  useEffect(() => {
    if (demandId) {
      loadDemandDetail(demandId);
      loadPayments(demandId);
    }
  }, [demandId]);

  // Reload payments when demand status/amount changes (e.g., after payment recorded)
  useEffect(() => {
    if (demandId && demand && (demand.status === 'paid' || demand.status === 'partial')) {
      loadPayments(demandId);
    }
  }, [demand?.amount_paid, demand?.status]);

  const loadPayments = async (id) => {
    setPaymentsLoading(true);
    try {
      const res = await window.electronAPI.demands.getPayments(id);
      if (res.success) setPayments(res.data);
    } catch { /* silent */ }
    finally { setPaymentsLoading(false); }
  };

  const handleConfirm = async () => {
    const res = await confirmDemand(demandId);
    if (res.success) {
      toast({ title: 'Demand confirmed' });
      onRefresh?.();
    } else {
      toast({ title: res.error || 'Failed', variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    const res = await cancelDemand(demandId, cancelReason);
    if (res.success) {
      toast({ title: 'Demand cancelled' });
      setShowCancelInput(false);
      setCancelReason('');
      onRefresh?.();
    } else {
      toast({ title: res.error || 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    const res = await deleteDemand(demandId);
    if (res.success) {
      toast({ title: 'Draft deleted' });
      onClose();
      onRefresh?.();
    } else {
      toast({ title: res.error || 'Failed', variant: 'destructive' });
    }
  };

  const handleReopen = async () => {
    const res = await reopenDemand(demandId);
    if (res.success) {
      toast({ title: 'Demand reopened as draft' });
      onRefresh?.();
    } else {
      toast({ title: res.error || 'Failed', variant: 'destructive' });
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return formatDistanceToNow(parseDbDate(d), { addSuffix: true }); }
    catch { return d; }
  };

  const getMethodLabel = (method) => {
    const m = PAYMENT_METHODS.find((pm) => pm.key === method);
    return m ? `${m.icon} ${m.label}` : method;
  };

  if (!demand && !detailLoading) return null;

  const statusConfig = demand ? (DEMAND_STATUS[demand.status] || DEMAND_STATUS.draft) : DEMAND_STATUS.draft;

  return (
    <div className="w-[480px] h-full bg-white border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/50">
        <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Demand Details
        </h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-200 text-text-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {detailLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      ) : demand ? (
        <>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Demand header info */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-text-primary font-mono">{demand.demand_code}</span>
                <Badge className={cn('text-xs', statusConfig.bgColor, statusConfig.textColor, 'border', statusConfig.borderColor)}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-text-muted">Created {formatDate(demand.created_at)}</p>
              {demand.confirmed_at && (
                <p className="text-xs text-text-muted">Confirmed {formatDate(demand.confirmed_at)}</p>
              )}
            </div>

            {/* Buyer info */}
            {demand.buyer_name && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(demand.buyer_id) }}
                  >
                    <span className="text-white text-xs font-bold">{getBuyerInitials(demand.buyer_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{demand.buyer_name}</p>
                    <p className="text-[11px] text-text-muted font-mono">{demand.buyer_code}</p>
                  </div>
                  {demand.buyer_outstanding > 0 && (
                    <span className="text-xs font-semibold text-red-600">
                      {formatCurrency(demand.buyer_outstanding)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Financials */}
            <div className="px-4 pb-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-[11px] text-text-muted uppercase tracking-wide">Total</p>
                  <p className="text-sm font-semibold text-text-primary mt-0.5">{formatCurrency(demand.grand_total)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                  <p className="text-[11px] text-emerald-600 uppercase tracking-wide">Paid</p>
                  <p className="text-sm font-semibold text-emerald-700 mt-0.5">{formatCurrency(demand.amount_paid)}</p>
                </div>
                <div className={cn('rounded-lg p-2.5 text-center', demand.balance_due > 0 ? 'bg-red-50' : 'bg-slate-50')}>
                  <p className={cn('text-[11px] uppercase tracking-wide', demand.balance_due > 0 ? 'text-red-600' : 'text-text-muted')}>
                    Balance
                  </p>
                  <p className={cn('text-sm font-semibold mt-0.5', demand.balance_due > 0 ? 'text-red-700' : 'text-text-primary')}>
                    {formatCurrency(demand.balance_due)}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="px-4 pb-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Items ({demand.items?.length || 0})
              </h4>
              {(demand.items?.length || 0) > 0 ? (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase w-[28px]">#</th>
                        <th className="text-left px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase">Product</th>
                        <th className="text-center px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase w-[50px]">Qty</th>
                        <th className="text-right px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase w-[70px]">Price</th>
                        <th className="text-right px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase w-[70px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(demand.items || []).map((item, idx) => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-b-0">
                          <td className="px-2 py-1.5 text-text-muted text-xs">{idx + 1}</td>
                          <td className="px-2 py-1.5">
                            <p className="text-sm font-medium text-text-primary truncate">{item.product_name}</p>
                            {item.discount_amount > 0 && (
                              <span className="text-[10px] text-emerald-600">-{formatCurrency(item.discount_amount)}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-xs">{item.qty}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-xs">{formatCurrency(item.price)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold text-text-primary text-xs">{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-text-muted text-center py-3">No items</p>
              )}

              {/* Totals breakdown */}
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Subtotal</span>
                  <span>{formatCurrency(demand.subtotal)}</span>
                </div>
                {demand.total_discount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(demand.total_discount)}</span>
                  </div>
                )}
                {demand.total_tax > 0 && (
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Tax</span>
                    <span>+{formatCurrency(demand.total_tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-text-primary pt-1 border-t border-gray-100">
                  <span>Grand Total</span>
                  <span>{formatCurrency(demand.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {demand.notes && (
              <div className="px-4 pb-3">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Notes</h4>
                <p className="text-sm text-text-secondary whitespace-pre-wrap bg-gray-50 rounded p-2 border border-gray-100">
                  {demand.notes}
                </p>
              </div>
            )}

            {/* Payments */}
            <div className="px-4 pb-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Payments ({payments.length})
              </h4>
              {paymentsLoading ? (
                <p className="text-xs text-text-muted text-center py-3">Loading...</p>
              ) : payments.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-3 bg-gray-50 rounded border border-gray-100">
                  No payments recorded
                </p>
              ) : (
                <div className="space-y-1.5">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                      <div>
                        <span className="text-sm font-semibold text-emerald-700">{formatCurrency(p.amount)}</span>
                        <span className="text-[11px] text-text-muted ml-2">{getMethodLabel(p.method)}</span>
                        <p className="text-[11px] text-text-muted">{formatDate(p.paid_at)}</p>
                      </div>
                      {p.reference_no && (
                        <span className="text-[11px] text-text-muted">Ref: {p.reference_no}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Trail */}
            <div className="px-4 pb-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Activity
              </h4>
              <EntityAuditTrail entityType="demand" entityId={demand.id} limit={20} />
            </div>

            {/* Cancel reason input */}
            {showCancelInput && (
              <div className="px-4 pb-3">
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Cancel reason (optional)..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="destructive" onClick={handleCancel} className="gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Confirm Cancel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCancelInput(false)}>
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-border px-4 py-3 flex items-center gap-2 flex-wrap">
            {demand.status === 'draft' && (
              <>
                <Button size="sm" className="gap-1" onClick={handleConfirm}>
                  <CheckCircle className="w-3.5 h-3.5" /> Confirm
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/demands/${demand.id}/edit`)}>
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-600 hover:bg-red-50 ml-auto" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </>
            )}

            {(demand.status === 'outstanding' || demand.status === 'partial') && (
              <>
                <Button size="sm" className="gap-1" onClick={() => onRecordPayment?.(demand)}>
                  <DollarSign className="w-3.5 h-3.5" /> Record Payment
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/demands/${demand.id}/edit`)}>
                  <Printer className="w-3.5 h-3.5" /> View Bill
                </Button>
                {!showCancelInput && (
                  <Button size="sm" variant="outline" className="gap-1 text-red-600 hover:bg-red-50 ml-auto" onClick={() => setShowCancelInput(true)}>
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </Button>
                )}
              </>
            )}

            {demand.status === 'paid' && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/demands/${demand.id}/edit`)}>
                <Printer className="w-3.5 h-3.5" /> View Bill
              </Button>
            )}

            {demand.status === 'cancelled' && (
              <Button size="sm" variant="outline" className="gap-1" onClick={handleReopen}>
                <RotateCcw className="w-3.5 h-3.5" /> Reopen as Draft
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
