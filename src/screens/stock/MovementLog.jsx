import React, { useEffect, useState, useCallback } from 'react';
import useStockStore from '@/stores/stockStore';
import useBusinessStore from '@/stores/businessStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Search, Download, ChevronLeft, ChevronRight, Calendar, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS, SOURCE_LABELS } from '@/constants/stockReasons';
import { cn } from '@/lib/utils';
import { formatStockNumber } from '@/utils/stockNumber';

const PAGE_SIZE = 50;

export default function MovementLog() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const { movements, movementsTotal, movementsLoading, fetchMovements, exportCSV } = useStockStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  const loadMovements = useCallback(() => {
    if (!activeBusiness?.id) return;
    fetchMovements({
      businessId: activeBusiness.id,
      type: typeFilter || undefined,
      source: sourceFilter || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
  }, [activeBusiness?.id, typeFilter, sourceFilter, search, dateFrom, dateTo, page, fetchMovements]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(0);
  }, [search, typeFilter, sourceFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(movementsTotal / PAGE_SIZE);

  const handleExport = async () => {
    const res = await exportCSV({ businessId: activeBusiness.id, includeHistory: true });
    if (res.success) {
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const TypeIcon = ({ type }) => {
    if (type === 'in' || type === 'demand_cancel_in') return <ArrowDownToLine className="w-3.5 h-3.5" />;
    if (type === 'out' || type === 'demand_out') return <ArrowUpFromLine className="w-3.5 h-3.5" />;
    return <RefreshCw className="w-3.5 h-3.5" />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product..."
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-text-muted" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px] h-9 text-xs"
          />
          <span className="text-text-muted text-xs">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px] h-9 text-xs"
          />
        </div>

        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 ml-auto">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-[1fr_100px_80px_70px_70px_120px_140px] gap-3 px-4 py-3 bg-gray-50 border-b border-border">
          <span className="text-xs font-medium text-text-muted">Product</span>
          <span className="text-xs font-medium text-text-muted">Type</span>
          <span className="text-xs font-medium text-text-muted text-right">Qty</span>
          <span className="text-xs font-medium text-text-muted text-right">Before</span>
          <span className="text-xs font-medium text-text-muted text-right">After</span>
          <span className="text-xs font-medium text-text-muted">Reason</span>
          <span className="text-xs font-medium text-text-muted text-right">Date</span>
        </div>

        {movementsLoading ? (
          <div className="flex items-center justify-center py-12 text-text-muted">Loading...</div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <RefreshCw className="w-8 h-8 mb-2 opacity-40" />
            <span>No movements found</span>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-340px)] overflow-y-auto divide-y divide-border">
            {movements.map((m) => {
              const typeColor = MOVEMENT_TYPE_COLORS[m.type] || MOVEMENT_TYPE_COLORS.adjustment;
              return (
                <div key={m.id} className="grid grid-cols-[1fr_100px_80px_70px_70px_120px_140px] gap-3 px-4 py-2.5 items-center hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{m.product_name}</div>
                    {m.product_sku && <div className="text-[11px] text-text-muted truncate">{m.product_sku}</div>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                    >
                      <TypeIcon type={m.type} />
                      {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                    </span>
                  </div>
                  <div className={cn(
                    'text-sm font-semibold text-right',
                    (m.type === 'in' || m.type === 'demand_cancel_in') ? 'text-green-600' : 'text-red-600'
                  )}>
                    {(m.type === 'in' || m.type === 'demand_cancel_in') ? '+' : '-'}{formatStockNumber(m.quantity)}
                  </div>
                  <div className="text-sm text-text-muted text-right">{formatStockNumber(m.quantity_before)}</div>
                  <div className="text-sm font-medium text-text-primary text-right">{formatStockNumber(m.quantity_after)}</div>
                  <div className="text-xs text-text-muted truncate" title={m.reason}>
                    {m.reason}
                    {m.notes && <span className="block text-[10px] text-text-muted/60 truncate">{m.notes}</span>}
                  </div>
                  <div className="text-xs text-text-muted text-right">{formatDate(m.moved_at)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, movementsTotal)} of {movementsTotal}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-text-muted px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
