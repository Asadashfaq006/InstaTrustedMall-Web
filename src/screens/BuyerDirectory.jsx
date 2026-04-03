import React, { useEffect, useState, useMemo } from 'react';
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
import useBuyerStore from '@/stores/buyerStore';
import BuyerModal from '@/components/buyers/BuyerModal';
import BuyerDetailPanel from '@/components/buyers/BuyerDetailPanel';
import RecordPaymentModal from '@/components/buyers/RecordPaymentModal';
import {
  getAvatarColor, getBuyerInitials, getPaymentStatusConfig, formatCurrency,
  sortBuyers, filterBuyersByStatus, searchBuyers,
} from '@/utils/buyerHelpers';
import { SORT_OPTIONS, STATUS_TABS } from '@/constants/buyerConstants';
import {
  Plus, Search, Users, LayoutGrid, List, ArrowUpDown,
  Archive, Phone, Building2, MapPin,
} from 'lucide-react';
import { cn, parseDbDate } from '@/lib/utils';

export default function BuyerDirectory() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const {
    buyers, isLoading, loadBuyers,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    filterStatus, setFilterStatus,
    viewMode, setViewMode,
    selectedBuyerId, setSelectedBuyerId,
  } = useBuyerStore();

  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [paymentBuyer, setPaymentBuyer] = useState(null);

  useEffect(() => {
    if (activeBusiness?.id) {
      loadBuyers(activeBusiness.id);
    }
  }, [activeBusiness?.id, loadBuyers]);

  // Derived: filtered & sorted buyers
  const processedBuyers = useMemo(() => {
    let result = [...buyers];
    result = searchBuyers(result, searchQuery);
    result = filterBuyersByStatus(result, filterStatus);
    result = sortBuyers(result, sortBy);
    return result;
  }, [buyers, searchQuery, filterStatus, sortBy]);

  // Status counts for tabs
  const statusCounts = useMemo(() => {
    const searched = searchBuyers(buyers, searchQuery);
    return {
      all: searched.length,
      outstanding: searched.filter((b) => b.payment_status === 'outstanding').length,
      partial: searched.filter((b) => b.payment_status === 'partial').length,
      paid: searched.filter((b) => b.payment_status === 'paid').length,
      none: searched.filter((b) => b.payment_status === 'none').length,
    };
  }, [buyers, searchQuery]);

  const selectedBuyer = buyers.find((b) => b.id === selectedBuyerId) || null;

  const handleEditBuyer = (buyer) => {
    setEditingBuyer(buyer);
    setShowBuyerModal(true);
  };

  const handleNewBuyer = () => {
    setEditingBuyer(null);
    setShowBuyerModal(true);
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
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Users className="w-6 h-6 text-accent" />
              Buyers
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Manage buyer profiles, track balances, and record payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/buyers/archived')}
              className="gap-1.5"
            >
              <Archive className="w-4 h-4" />
              Archived
            </Button>
            <PermissionGate permission="buyers:create">
            <Button size="sm" onClick={handleNewBuyer} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Buyer
            </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Search + Controls Bar */}
        <div className="px-6 py-3 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, code..."
                className="pl-9"
              />
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowUpDown className="w-4 h-4" />
                  {SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={sortBy === opt.value ? 'bg-accent/10' : ''}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  'p-1.5 transition-colors',
                  viewMode === 'card' ? 'bg-accent text-white' : 'text-text-muted hover:bg-gray-100'
                )}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 transition-colors',
                  viewMode === 'list' ? 'bg-accent text-white' : 'text-text-muted hover:bg-gray-100'
                )}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 mt-3">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filterStatus === tab.key
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                )}
              >
                {tab.label}
                <span className="ml-1 opacity-70">({statusCounts[tab.key] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm text-text-muted">Loading buyers...</p>
            </div>
          ) : processedBuyers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Users className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-text-muted text-sm">
                {buyers.length === 0
                  ? 'No buyers yet. Click "Add Buyer" to create one.'
                  : 'No buyers match your search or filter.'}
              </p>
            </div>
          ) : viewMode === 'card' ? (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {processedBuyers.map((buyer) => (
                <BuyerCard
                  key={buyer.id}
                  buyer={buyer}
                  isSelected={selectedBuyerId === buyer.id}
                  onClick={() => setSelectedBuyerId(buyer.id === selectedBuyerId ? null : buyer.id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Buyer</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Contact</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Outstanding</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Total Paid</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {processedBuyers.map((buyer) => {
                    const statusConfig = getPaymentStatusConfig(buyer.payment_status);
                    return (
                      <tr
                        key={buyer.id}
                        onClick={() => setSelectedBuyerId(buyer.id === selectedBuyerId ? null : buyer.id)}
                        className={cn(
                          'border-b border-border last:border-b-0 cursor-pointer transition-colors',
                          selectedBuyerId === buyer.id
                            ? 'bg-accent/5'
                            : 'hover:bg-gray-50'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {buyer.photo_path ? (
                              <img
                                src={`local-file://${buyer.photo_path}`}
                                alt={buyer.full_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: getAvatarColor(buyer.id) }}
                              >
                                <span className="text-white text-xs font-bold">
                                  {getBuyerInitials(buyer.full_name)}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-text-primary">{buyer.full_name}</p>
                              <p className="text-[11px] text-text-muted font-mono">{buyer.buyer_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {buyer.phone && <p className="text-sm text-text-secondary">{buyer.phone}</p>}
                          {buyer.city && <p className="text-[11px] text-text-muted">{buyer.city}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn('text-sm font-semibold', buyer.outstanding > 0 ? 'text-red-600' : 'text-text-primary')}>
                            {formatCurrency(buyer.outstanding)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-emerald-600">
                            {formatCurrency(buyer.total_paid)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={cn('text-[11px]', statusConfig.bgColor, statusConfig.textColor, 'border', statusConfig.borderColor)}>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-text-muted">
                            {formatDate(buyer.last_activity_at || buyer.created_at)}
                          </span>
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
          onClose={() => setSelectedBuyerId(null)}
          onEdit={() => handleEditBuyer(selectedBuyer)}
          onRecordPayment={() => setPaymentBuyer(selectedBuyer)}
        />
      )}

      {/* Modals */}
      <BuyerModal
        open={showBuyerModal}
        onOpenChange={setShowBuyerModal}
        buyer={editingBuyer}
      />

      <RecordPaymentModal
        open={!!paymentBuyer}
        onOpenChange={(open) => !open && setPaymentBuyer(null)}
        buyer={paymentBuyer}
      />
    </div>
  );
}

/* ── Buyer Card Component ─────────────────────────────────────────── */

function BuyerCard({ buyer, isSelected, onClick, formatDate }) {
  const statusConfig = getPaymentStatusConfig(buyer.payment_status);
  const avatarColor = getAvatarColor(buyer.id);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md',
        isSelected
          ? 'border-accent ring-1 ring-accent/20 shadow-sm'
          : 'border-border hover:border-gray-300'
      )}
    >
      {/* Top: Avatar + Name + Status */}
      <div className="flex items-start gap-3">
        {buyer.photo_path ? (
          <img
            src={`local-file://${buyer.photo_path}`}
            alt={buyer.full_name}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-border flex-shrink-0"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            <span className="text-white font-bold text-sm">
              {getBuyerInitials(buyer.full_name)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary truncate">{buyer.full_name}</h4>
          <p className="text-[11px] text-text-muted font-mono">{buyer.buyer_code}</p>
          {buyer.business_name && (
            <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5 truncate">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              {buyer.business_name}
            </p>
          )}
        </div>
        <Badge className={cn('text-[10px] flex-shrink-0', statusConfig.bgColor, statusConfig.textColor, 'border', statusConfig.borderColor)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Contact Info */}
      <div className="mt-3 space-y-1">
        {buyer.phone && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <Phone className="w-3 h-3 text-text-muted" />
            {buyer.phone}
          </div>
        )}
        {buyer.city && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <MapPin className="w-3 h-3 text-text-muted" />
            {buyer.city}
          </div>
        )}
      </div>

      {/* Financial Summary Bar */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] text-text-muted uppercase">Outstanding</p>
          <p className={cn('text-sm font-semibold', buyer.outstanding > 0 ? 'text-red-600' : 'text-text-primary')}>
            {formatCurrency(buyer.outstanding)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-muted uppercase">Paid</p>
          <p className="text-sm font-semibold text-emerald-600">{formatCurrency(buyer.total_paid)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-muted uppercase">Activity</p>
          <p className="text-[11px] text-text-muted">
            {formatDate(buyer.last_activity_at || buyer.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
