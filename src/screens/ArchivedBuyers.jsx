import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useBuyerStore from '@/stores/buyerStore';
import BuyerDetailPanel from '@/components/buyers/BuyerDetailPanel';
import RecordPaymentModal from '@/components/buyers/RecordPaymentModal';
import { getAvatarColor, getBuyerInitials, getPaymentStatusConfig, formatCurrency } from '@/utils/buyerHelpers';
import { ArrowLeft, Archive, RotateCcw, Trash2, Users } from 'lucide-react';
import { cn, parseDbDate } from '@/lib/utils';

export default function ArchivedBuyers() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const { archivedBuyers, isLoading, loadArchivedBuyers, restoreBuyer, deleteBuyer } = useBuyerStore();

  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [paymentBuyer, setPaymentBuyer] = useState(null);

  useEffect(() => {
    if (activeBusiness?.id) {
      loadArchivedBuyers(activeBusiness.id);
    }
  }, [activeBusiness?.id, loadArchivedBuyers]);

  const handleRestore = async (buyerId) => {
    const res = await restoreBuyer(buyerId, activeBusiness?.id);
    if (res.success) {
      toast({ title: 'Buyer restored' });
      setSelectedBuyer(null);
    } else {
      toast({ title: res.error || 'Failed to restore', variant: 'destructive' });
    }
  };

  const handleDelete = async (buyerId) => {
    const res = await deleteBuyer(buyerId);
    if (res.success) {
      toast({ title: 'Buyer permanently deleted' });
      setSelectedBuyer(null);
    } else if (res.error === 'has_history') {
      toast({
        title: 'Cannot delete',
        description: 'Buyer has demand/payment history.',
        variant: 'destructive',
      });
    } else {
      toast({ title: res.error || 'Failed', variant: 'destructive' });
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return formatDistanceToNow(parseDbDate(d), { addSuffix: true });
    } catch {
      return d;
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/buyers')} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Archive className="w-6 h-6 text-amber-500" />
                Archived Buyers
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                {archivedBuyers.length} archived buyer{archivedBuyers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm text-text-muted">Loading...</p>
            </div>
          ) : archivedBuyers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Archive className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-text-muted">No archived buyers</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Buyer</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Contact</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Balance</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Archived</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedBuyers.map((buyer) => {
                    const statusConfig = getPaymentStatusConfig(buyer.payment_status);
                    return (
                      <tr
                        key={buyer.id}
                        className={cn(
                          'border-b border-border last:border-b-0 transition-colors',
                          selectedBuyer?.id === buyer.id ? 'bg-accent/5' : 'hover:bg-gray-50'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center gap-2.5 cursor-pointer"
                            onClick={() => setSelectedBuyer(buyer.id === selectedBuyer?.id ? null : buyer)}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center opacity-60"
                              style={{ backgroundColor: getAvatarColor(buyer.id) }}
                            >
                              <span className="text-white text-xs font-bold">
                                {getBuyerInitials(buyer.full_name)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-secondary">{buyer.full_name}</p>
                              <p className="text-[11px] text-text-muted font-mono">{buyer.buyer_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {buyer.phone && <p className="text-sm text-text-muted">{buyer.phone}</p>}
                          {buyer.city && <p className="text-[11px] text-text-muted">{buyer.city}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-text-muted">{formatCurrency(buyer.outstanding)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-text-muted">
                            {formatDate(buyer.updated_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => handleRestore(buyer.id)}
                            >
                              <RotateCcw className="w-3 h-3" /> Restore
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(buyer.id)}
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedBuyer && (
        <BuyerDetailPanel
          buyer={selectedBuyer}
          onClose={() => setSelectedBuyer(null)}
          onEdit={() => {}}
          onRecordPayment={() => setPaymentBuyer(selectedBuyer)}
        />
      )}

      <RecordPaymentModal
        open={!!paymentBuyer}
        onOpenChange={(open) => !open && setPaymentBuyer(null)}
        buyer={paymentBuyer}
      />
    </div>
  );
}
