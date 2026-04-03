import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PermissionGate from '@/components/auth/PermissionGate';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useDemandStore from '@/stores/demandStore';
import DemandDetailPanel from '@/components/demands/DemandDetailPanel';
import DemandPaymentModal from '@/components/demands/DemandPaymentModal';
import BillPreview from '@/components/demands/BillPreview';
import { DEMAND_STATUS, DEMAND_STATUS_TABS, DEMAND_SORT_OPTIONS } from '@/constants/demandConstants';
import { formatCurrency } from '@/utils/buyerHelpers';
import { getAvatarColor, getBuyerInitials } from '@/utils/buyerHelpers';
import {
  Plus, Search, FileText, ArrowUpDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn, parseDbDate } from '@/lib/utils';

export default function DemandList() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const {
    demands, totalDemands, statusCounts, isLoading, loadDemands,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    page, setPage, pageSize,
    selectedDemandId, setSelectedDemandId,
    clearSelection,
  } = useDemandStore();

  const [paymentDemand, setPaymentDemand] = useState(null);
  const [billDemand, setBillDemand] = useState(null);

  // Load demands when filters or business change
  useEffect(() => {
    if (activeBusiness?.id) {
      loadDemands(activeBusiness.id);
    }
  }, [activeBusiness?.id, searchQuery, statusFilter, sortBy, page, loadDemands]);

  const totalPages = Math.max(1, Math.ceil(totalDemands / pageSize));

  const handleRefresh = useCallback(() => {
    if (activeBusiness?.id) loadDemands(activeBusiness.id);
  }, [activeBusiness?.id, loadDemands]);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return formatDistanceToNow(parseDbDate(d), { addSuffix: true }); }
    catch { return d; }
  };

  const handleRowClick = (demand) => {
    setSelectedDemandId(demand.id === selectedDemandId ? null : demand.id);
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <FileText className="w-6 h-6 text-accent" />
                Demands
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                {totalDemands} demand{totalDemands !== 1 ? 's' : ''}
              </p>
            </div>
            <PermissionGate permission="demands:create">
              <Button className="gap-2" onClick={() => navigate('/demands/new')}>
                <Plus className="w-4 h-4" /> New Demand
              </Button>
            </PermissionGate>
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search demands by code or buyer..."
                className="pl-9"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {DEMAND_SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DEMAND_SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={sortBy === opt.value ? 'bg-accent/10 text-accent' : ''}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1">
            {DEMAND_STATUS_TABS.map((tab) => {
              const count = statusCounts[tab.key] ?? 0;
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                    isActive
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'ml-1.5 text-[11px]',
                    isActive ? 'text-white/80' : 'text-text-muted'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Demand Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-text-muted">Loading demands...</p>
            </div>
          ) : demands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-text-muted">No demands found</p>
              <Button variant="outline" className="mt-3 gap-2" onClick={() => navigate('/demands/new')}>
                <Plus className="w-4 h-4" /> Create First Demand
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Code</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Buyer</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Paid</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Balance</th>
                  <th className="text-right px-6 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((d) => {
                  const statusConfig = DEMAND_STATUS[d.status] || DEMAND_STATUS.draft;
                  const isSelected = selectedDemandId === d.id;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => handleRowClick(d)}
                      className={cn(
                        'border-b border-gray-50 cursor-pointer transition-colors',
                        isSelected ? 'bg-accent/5 border-accent/20' : 'hover:bg-gray-50'
                      )}
                    >
                      <td className="px-6 py-3">
                        <span className="text-sm font-semibold text-text-primary font-mono">{d.demand_code}</span>
                        {d.serial_number && (
                          <p className="text-[10px] text-indigo-600 font-semibold font-mono">{d.serial_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {d.buyer_name ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: getAvatarColor(d.buyer_id) }}
                            >
                              <span className="text-white text-[9px] font-bold">{getBuyerInitials(d.buyer_name)}</span>
                            </div>
                            <span className="text-sm text-text-primary truncate max-w-[150px]">{d.buyer_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-[11px]', statusConfig.bgColor, statusConfig.textColor, 'border', statusConfig.borderColor)}>
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-text-primary">{formatCurrency(d.grand_total)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-emerald-600">{formatCurrency(d.amount_paid)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn('text-sm font-medium', d.balance_due > 0 ? 'text-red-600' : 'text-text-muted')}>
                          {d.balance_due > 0 ? formatCurrency(d.balance_due) : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="text-xs text-text-muted">{formatDate(d.created_at)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Page {page} of {totalPages} ({totalDemands} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedDemandId && (
        <DemandDetailPanel
          demandId={selectedDemandId}
          onClose={() => clearSelection()}
          onRefresh={handleRefresh}
          onRecordPayment={(demand) => setPaymentDemand(demand)}
        />
      )}

      {/* Payment Modal */}
      <DemandPaymentModal
        open={!!paymentDemand}
        onOpenChange={(open) => !open && setPaymentDemand(null)}
        demand={paymentDemand}
        onSuccess={() => {
          handleRefresh();
          if (selectedDemandId) useDemandStore.getState().loadDemandDetail(selectedDemandId);
        }}
      />

      {/* Bill Preview */}
      <BillPreview
        open={!!billDemand}
        onOpenChange={(open) => !open && setBillDemand(null)}
        demand={billDemand}
      />
    </div>
  );
}
