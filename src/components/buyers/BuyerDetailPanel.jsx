import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import useBuyerStore from '@/stores/buyerStore';
import {
  getAvatarColor, getBuyerInitials, getPaymentStatusConfig, formatCurrency,
} from '@/utils/buyerHelpers';
import { PAYMENT_METHODS } from '@/constants/buyerConstants';
import { DEMAND_STATUS } from '@/constants/demandConstants';
import {
  X, Phone, Mail, MapPin, Building2, Edit, Archive, Trash2,
  DollarSign, FileText, CreditCard, StickyNote, ClipboardList,
  Plus, AlertTriangle, Activity,
} from 'lucide-react';
import EntityAuditTrail from '@/components/audit/EntityAuditTrail';
import { cn, parseDbDate } from '@/lib/utils';

const TABS = [
  { key: 'demands', label: 'Demands', icon: ClipboardList },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'activity', label: 'Activity', icon: Activity },
];

export default function BuyerDetailPanel({
  buyer,
  onClose,
  onEdit,
  onRecordPayment,
}) {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { toast } = useToast();
  const archiveBuyer = useBuyerStore((s) => s.archiveBuyer);
  const deleteBuyer = useBuyerStore((s) => s.deleteBuyer);
  const updateBuyer = useBuyerStore((s) => s.updateBuyer);

  const [activeTab, setActiveTab] = useState('payments');
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [demands, setDemands] = useState([]);
  const [demandsLoading, setDemandsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const notesTimerRef = useRef(null);

  // Load payments when tab is active
  useEffect(() => {
    if (buyer && activeTab === 'payments') {
      loadPayments();
    }
    if (buyer && activeTab === 'demands') {
      loadDemands();
    }
  }, [buyer?.id, activeTab]);

  // Sync notes from buyer
  useEffect(() => {
    if (buyer) {
      setNotes(buyer.notes || '');
    }
  }, [buyer?.id, buyer?.notes]);

  const loadPayments = async () => {
    if (!buyer) return;
    setPaymentsLoading(true);
    try {
      const res = await window.electronAPI.payments.getByBuyer({ buyerId: buyer.id, limit: 50, offset: 0 });
      if (res.success) setPayments(res.data);
    } catch {
      // silent
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadDemands = async () => {
    if (!buyer) return;
    setDemandsLoading(true);
    try {
      const res = await window.electronAPI.demands.getByBuyer({ buyerId: buyer.id, limit: 20, offset: 0 });
      if (res.success) setDemands(res.data.demands || res.data);
    } catch {
      // silent
    } finally {
      setDemandsLoading(false);
    }
  };

  // Auto-save notes with debounce
  const handleNotesChange = useCallback((value) => {
    setNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      if (buyer) {
        await updateBuyer({ buyerId: buyer.id, notes: value });
      }
    }, 1000);
  }, [buyer?.id, updateBuyer]);

  const handleArchive = async () => {
    const res = await archiveBuyer(buyer.id);
    if (res.success) {
      toast({ title: 'Buyer archived' });
      onClose();
    } else if (res.error === 'has_balance') {
      toast({
        title: 'Cannot archive',
        description: `Buyer has an outstanding balance of ${formatCurrency(res.outstanding)}. Clear the balance first.`,
        variant: 'destructive',
      });
    } else {
      toast({ title: res.error || 'Failed to archive', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    const res = await deleteBuyer(buyer.id);
    if (res.success) {
      toast({ title: 'Buyer deleted' });
      onClose();
    } else if (res.error === 'has_history') {
      toast({
        title: 'Cannot delete',
        description: 'Buyer has demand/payment history. Archive instead.',
        variant: 'destructive',
      });
    } else {
      toast({ title: res.error || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const deleteRes = await useBuyerStore.getState().deletePayment(paymentId, buyer.id);
    if (deleteRes.success) {
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      toast({ title: 'Payment deleted' });
    } else {
      toast({ title: deleteRes.error || 'Failed', variant: 'destructive' });
    }
  };

  if (!buyer) return null;

  const statusConfig = getPaymentStatusConfig(buyer.payment_status);
  const avatarColor = getAvatarColor(buyer.id);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return formatDistanceToNow(parseDbDate(d), { addSuffix: true });
    } catch {
      return d;
    }
  };

  const getMethodLabel = (method) => {
    const m = PAYMENT_METHODS.find((pm) => pm.key === method);
    return m ? `${m.icon} ${m.label}` : method;
  };

  return (
    <div className="w-[400px] h-full bg-white border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/50">
        <h3 className="font-semibold text-text-primary text-sm">Buyer Details</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-200 text-text-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            {buyer.photo_path ? (
              <img
                src={`local-file://${buyer.photo_path}`}
                alt={buyer.full_name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-border flex-shrink-0"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                <span className="text-white font-bold text-lg">
                  {getBuyerInitials(buyer.full_name)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-text-primary truncate">{buyer.full_name}</h4>
              <p className="text-xs text-text-muted font-mono">{buyer.buyer_code}</p>
              {buyer.business_name && (
                <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3" />
                  {buyer.business_name}
                </p>
              )}
            </div>
            <Badge className={cn('text-[11px]', statusConfig.bgColor, statusConfig.textColor, 'border', statusConfig.borderColor)}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="mt-3 space-y-1.5">
            {buyer.phone && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Phone className="w-3.5 h-3.5 text-text-muted" />
                <span>{buyer.phone}</span>
              </div>
            )}
            {buyer.email && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail className="w-3.5 h-3.5 text-text-muted" />
                <span className="truncate">{buyer.email}</span>
              </div>
            )}
            {(buyer.address || buyer.city) && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <MapPin className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                <span className="truncate">
                  {[buyer.address, buyer.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-[11px] text-text-muted uppercase tracking-wide">Billed</p>
              <p className="text-sm font-semibold text-text-primary mt-0.5">
                {formatCurrency(buyer.total_billed)}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
              <p className="text-[11px] text-emerald-600 uppercase tracking-wide">Paid</p>
              <p className="text-sm font-semibold text-emerald-700 mt-0.5">
                {formatCurrency(buyer.total_paid)}
              </p>
            </div>
            <div className={cn('rounded-lg p-2.5 text-center', buyer.outstanding > 0 ? 'bg-red-50' : 'bg-slate-50')}>
              <p className={cn('text-[11px] uppercase tracking-wide', buyer.outstanding > 0 ? 'text-red-600' : 'text-text-muted')}>
                Balance
              </p>
              <p className={cn('text-sm font-semibold mt-0.5', buyer.outstanding > 0 ? 'text-red-700' : 'text-text-primary')}>
                {formatCurrency(buyer.outstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* Outstanding Balance Banner */}
        {buyer.outstanding > 0 && (
          <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-red-700">
                Outstanding: {formatCurrency(buyer.outstanding)}
              </p>
              {buyer.last_payment_at && (
                <p className="text-[11px] text-red-500">
                  Last payment {formatDate(buyer.last_payment_at)}
                </p>
              )}
            </div>
            <Button size="sm" className="h-7 text-xs" onClick={onRecordPayment}>
              Pay Now
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onRecordPayment}>
            <DollarSign className="w-3.5 h-3.5" /> Record Payment
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => navigate(`/demands/new?buyerId=${buyer.id}`)}>
            <Plus className="w-3.5 h-3.5" /> New Demand
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex px-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'demands' && (
            <div className="space-y-2">
              {demandsLoading ? (
                <p className="text-sm text-text-muted text-center py-4">Loading...</p>
              ) : demands.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No demands yet</p>
                </div>
              ) : (
                demands.map((d) => {
                  const sc = DEMAND_STATUS[d.status] || DEMAND_STATUS.draft;
                  return (
                    <div
                      key={d.id}
                      onClick={() => navigate(`/demands/${d.id}/edit`)}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary font-mono">{d.demand_code}</span>
                          <Badge className={cn('text-[10px]', sc.bgColor, sc.textColor, 'border', sc.borderColor)}>
                            {sc.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-text-muted">
                            {formatDate(d.created_at)}
                          </span>
                          {d.balance_due > 0 && (
                            <span className="text-[11px] text-red-600 font-medium">
                              Due: {formatCurrency(d.balance_due)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-text-primary ml-2">
                        {formatCurrency(d.grand_total)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-2">
              {paymentsLoading ? (
                <p className="text-sm text-text-muted text-center py-4">Loading...</p>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No payments recorded</p>
                </div>
              ) : (
                payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(p.amount)}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {getMethodLabel(p.method)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-text-muted">
                          {formatDate(p.paid_at)}
                        </span>
                        {p.reference_no && (
                          <span className="text-[11px] text-text-muted">
                            Ref: {p.reference_no}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about this buyer... (auto-saves)"
                rows={6}
                className="resize-none"
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                Notes auto-save after 1 second of inactivity
              </p>
            </div>
          )}

          {activeTab === 'activity' && buyer && (
            <EntityAuditTrail entityType="buyer" entityId={buyer.id} limit={30} />
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
          <Edit className="w-3.5 h-3.5" /> Edit
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 hover:bg-amber-50" onClick={handleArchive}>
          <Archive className="w-3.5 h-3.5" /> Archive
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:bg-red-50 ml-auto" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}
