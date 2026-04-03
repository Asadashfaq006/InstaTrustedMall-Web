import React, { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useBusinessStore from '@/stores/businessStore';
import useAuditStore from '@/stores/auditStore';
import { cn, parseDbDate } from '@/lib/utils';

const TYPE_COLORS = {
  IN: 'bg-green-100 text-green-700',
  OUT: 'bg-red-100 text-red-700',
  ADJUSTMENT: 'bg-blue-100 text-blue-700',
  DEMAND_OUT: 'bg-purple-100 text-purple-700',
  DEMAND_CANCEL_IN: 'bg-amber-100 text-amber-700',
};

export default function StockLog() {
  const { activeBusiness } = useBusinessStore();
  const { stockLog, stockLogTotal, loading, fetchStockLog } = useAuditStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const load = useCallback(() => {
    if (!activeBusiness?.id) return;
    fetchStockLog(activeBusiness.id, {
      search: search || undefined,
      type: typeFilter || undefined,
      limit,
      offset,
    });
  }, [activeBusiness?.id, search, typeFilter, limit, offset]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Summary strip
  const totalIn = stockLog.reduce((s, m) => s + (m.quantity > 0 ? m.quantity : 0), 0);
  const totalOut = stockLog.reduce((s, m) => s + (m.quantity < 0 ? Math.abs(m.quantity) : 0), 0);
  const netChange = totalIn - totalOut;

  const totalPages = Math.ceil(stockLogTotal / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="p-6 space-y-4">
      {/* Summary strip */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <ArrowDownToLine className="w-4 h-4 text-green-600" />
          <div>
            <p className="text-xs text-green-700 font-medium">Total In</p>
            <p className="text-lg font-bold text-green-800">{totalIn}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <ArrowUpFromLine className="w-4 h-4 text-red-600" />
          <div>
            <p className="text-xs text-red-700 font-medium">Total Out</p>
            <p className="text-lg font-bold text-red-800">{totalOut}</p>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-2 border rounded-lg px-3 py-2',
          netChange >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
        )}>
          <RefreshCw className={cn('w-4 h-4', netChange >= 0 ? 'text-blue-600' : 'text-amber-600')} />
          <div>
            <p className={cn('text-xs font-medium', netChange >= 0 ? 'text-blue-700' : 'text-amber-700')}>Net Change</p>
            <p className={cn('text-lg font-bold', netChange >= 0 ? 'text-blue-800' : 'text-amber-800')}>
              {netChange >= 0 ? '+' : ''}{netChange}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search product name..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}
          className="h-9 rounded-md border border-input px-3 text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="IN">Stock In</option>
          <option value="OUT">Stock Out</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="DEMAND_OUT">Demand Out</option>
          <option value="DEMAND_CANCEL_IN">Demand Cancel</option>
        </select>

        <span className="text-xs text-text-muted ml-auto">
          {stockLogTotal} movements
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Product</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Type</th>
              <th className="text-right px-4 py-2.5 font-medium text-text-muted">Qty</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Reason</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Reference</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && stockLog.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-text-muted text-sm">
                  Loading...
                </td>
              </tr>
            ) : stockLog.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-text-muted text-sm">
                  No stock movements found
                </td>
              </tr>
            ) : (
              stockLog.map((row) => {
                const typeColor = TYPE_COLORS[row.type] || TYPE_COLORS.ADJUSTMENT;
                return (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-text-primary truncate max-w-[200px]">
                      {row.product_name || `Product #${row.product_id}`}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={cn('text-xs font-medium', typeColor)}>
                        {row.type?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className={cn(
                      'px-4 py-2.5 text-right font-mono font-medium',
                      row.quantity > 0 ? 'text-green-700' : 'text-red-600'
                    )}>
                      {row.quantity > 0 ? '+' : ''}{row.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted max-w-[180px] truncate">
                      {row.reason || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted text-xs max-w-[120px] truncate">
                      {row.reference || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted text-xs">
                      {row.created_at
                        ? formatDistanceToNow(parseDbDate(row.created_at), { addSuffix: true })
                        : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + limit >= stockLogTotal}
              onClick={() => setOffset(offset + limit)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
