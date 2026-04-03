import React, { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, X, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import useBusinessStore from '@/stores/businessStore';
import useAuditStore from '@/stores/auditStore';
import { cn, parseDbDate } from '@/lib/utils';

const ACTION_BADGE = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  SOFT_DELETE: 'bg-red-50 text-red-600 border-red-200',
  HARD_DELETE: 'bg-red-200 text-red-800 border-red-300',
  RESTORE: 'bg-teal-100 text-teal-700 border-teal-200',
  CONFIRM: 'bg-purple-100 text-purple-700 border-purple-200',
  CANCEL: 'bg-amber-100 text-amber-700 border-amber-200',
  REOPEN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  PAYMENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  SET_ACTIVE: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  STOCK_IN: 'bg-green-100 text-green-700 border-green-200',
  STOCK_OUT: 'bg-red-100 text-red-700 border-red-200',
  STOCK_ADJUST: 'bg-blue-100 text-blue-700 border-blue-200',
  BATCH_STOCK_IN: 'bg-green-50 text-green-600 border-green-200',
  IMPORT_CSV: 'bg-gray-100 text-gray-700 border-gray-200',
  DUPLICATE: 'bg-sky-100 text-sky-700 border-sky-200',
  ARCHIVE: 'bg-gray-100 text-gray-600 border-gray-200',
};

const ENTITY_COLORS = {
  product: 'text-blue-600',
  stock: 'text-orange-600',
  demand: 'text-purple-600',
  buyer: 'text-green-600',
  payment: 'text-emerald-600',
  column: 'text-cyan-600',
  business: 'text-navy',
};

export default function SystemAuditLog() {
  const { activeBusiness } = useBusinessStore();
  const { entries, total, loading, filters, fetchAuditLog, setFilter, resetFilters } = useAuditStore();

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchAuditLog(activeBusiness.id);
    }
  }, [activeBusiness?.id, filters]);

  // Debounced search
  const [searchInput, setSearchInput] = useState(filters.search || '');
  useEffect(() => {
    const t = setTimeout(() => {
      setFilter('search', searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(total / filters.limit);
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;

  // Active filter chips
  const activeFilters = [];
  if (filters.action) activeFilters.push({ key: 'action', label: `Action: ${filters.action}` });
  if (filters.entityType) activeFilters.push({ key: 'entityType', label: `Entity: ${filters.entityType}` });
  if (filters.dateFrom) activeFilters.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` });
  if (filters.dateTo) activeFilters.push({ key: 'dateTo', label: `To: ${filters.dateTo}` });

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search events..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <select
          value={filters.action}
          onChange={(e) => setFilter('action', e.target.value)}
          className="h-9 rounded-md border border-input px-3 text-sm bg-white"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="SOFT_DELETE">Soft Delete</option>
          <option value="HARD_DELETE">Hard Delete</option>
          <option value="RESTORE">Restore</option>
          <option value="CONFIRM">Confirm</option>
          <option value="CANCEL">Cancel</option>
          <option value="REOPEN">Reopen</option>
          <option value="PAYMENT">Payment</option>
          <option value="STOCK_IN">Stock In</option>
          <option value="STOCK_OUT">Stock Out</option>
          <option value="STOCK_ADJUST">Stock Adjust</option>
          <option value="IMPORT_CSV">Import CSV</option>
          <option value="DUPLICATE">Duplicate</option>
        </select>

        <select
          value={filters.entityType}
          onChange={(e) => setFilter('entityType', e.target.value)}
          className="h-9 rounded-md border border-input px-3 text-sm bg-white"
        >
          <option value="">All Entities</option>
          <option value="product">Product</option>
          <option value="stock">Stock</option>
          <option value="demand">Demand</option>
          <option value="buyer">Buyer</option>
          <option value="payment">Payment</option>
          <option value="column">Column</option>
          <option value="business">Business</option>
        </select>

        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
          className="h-9 rounded-md border border-input px-3 text-sm bg-white"
          placeholder="From date"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
          className="h-9 rounded-md border border-input px-3 text-sm bg-white"
          placeholder="To date"
        />

        <span className="text-xs text-text-muted ml-auto">
          {total} events
        </span>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map((f) => (
            <Badge
              key={f.key}
              variant="secondary"
              className="text-xs gap-1 cursor-pointer hover:bg-gray-200"
              onClick={() => setFilter(f.key, '')}
            >
              {f.label}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          <button
            className="text-xs text-text-muted hover:text-text-primary"
            onClick={resetFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Action</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Entity</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Summary</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">When</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-text-muted text-sm">
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-text-muted text-sm">
                  No audit events found
                </td>
              </tr>
            ) : (
              entries.map((row) => {
                const actionColor = ACTION_BADGE[row.action] || ACTION_BADGE.UPDATE;
                const entityColor = ENTITY_COLORS[row.entity_type] || 'text-gray-600';
                let detailData = null;
                try {
                  if (row.detail_json) detailData = JSON.parse(row.detail_json);
                } catch { /* ignore */ }

                return (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <Badge className={cn('text-xs font-medium border', actionColor)}>
                        {row.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-xs font-medium uppercase', entityColor)}>
                          {row.entity_type}
                        </span>
                        {row.entity_label && (
                          <span className="text-text-primary text-xs truncate max-w-[120px]">
                            {row.entity_label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted max-w-[280px] truncate">
                      {row.summary}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted text-xs whitespace-nowrap">
                      {row.logged_at
                        ? formatDistanceToNow(parseDbDate(row.logged_at), { addSuffix: true })
                        : '—'}
                    </td>
                    <td className="px-2 py-2.5">
                      {detailData && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-1 hover:bg-gray-100 rounded">
                              <Info className="w-3.5 h-3.5 text-text-muted" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 max-h-60 overflow-auto">
                            <p className="text-xs font-semibold mb-2">Detail</p>
                            <pre className="text-xs text-text-muted whitespace-pre-wrap break-words font-mono">
                              {JSON.stringify(detailData, null, 2)}
                            </pre>
                          </PopoverContent>
                        </Popover>
                      )}
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
              disabled={filters.offset === 0}
              onClick={() => setFilter('offset', Math.max(0, filters.offset - filters.limit))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.offset + filters.limit >= total}
              onClick={() => setFilter('offset', filters.offset + filters.limit)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
