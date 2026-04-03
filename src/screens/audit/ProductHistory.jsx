import React, { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useBusinessStore from '@/stores/businessStore';
import useAuditStore from '@/stores/auditStore';
import useProductStore from '@/stores/productStore';
import CellHistoryPopover from '@/components/audit/CellHistoryPopover';
import { cn, parseDbDate } from '@/lib/utils';

export default function ProductHistory() {
  const { activeBusiness } = useBusinessStore();
  const { productHistory, productHistoryTotal, loading, fetchProductHistory } = useAuditStore();
  const { columns, loadColumns } = useProductStore();

  const [search, setSearch] = useState('');
  const [columnFilter, setColumnFilter] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const load = useCallback(() => {
    if (!activeBusiness?.id) return;
    fetchProductHistory(activeBusiness.id, {
      search: search || undefined,
      columnId: columnFilter || undefined,
      limit,
      offset,
    });
  }, [activeBusiness?.id, search, columnFilter, limit, offset]);

  useEffect(() => {
    if (activeBusiness?.id) loadColumns(activeBusiness.id);
  }, [activeBusiness?.id]);

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

  const totalPages = Math.ceil(productHistoryTotal / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="p-6 space-y-4">
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
          value={columnFilter}
          onChange={(e) => { setColumnFilter(e.target.value); setOffset(0); }}
          className="h-9 rounded-md border border-input px-3 text-sm bg-white"
        >
          <option value="">All Columns</option>
          {(columns || []).map((col) => (
            <option key={col.id} value={col.id}>{col.name}</option>
          ))}
        </select>

        <span className="text-xs text-text-muted ml-auto">
          {productHistoryTotal} records
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Product</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Column</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Old Value</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">New Value</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-muted">Changed</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && productHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-text-muted text-sm">
                  Loading...
                </td>
              </tr>
            ) : productHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-text-muted text-sm">
                  No product history found
                </td>
              </tr>
            ) : (
              productHistory.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-text-primary truncate max-w-[180px]">
                    {row.product_name || `Product #${row.product_id}`}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-xs font-normal">
                      {row.column_name || `Col #${row.column_id}`}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-red-600 max-w-[150px] truncate">
                    {row.old_value ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-green-700 max-w-[150px] truncate">
                    {row.new_value ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted text-xs">
                    {row.changed_at
                      ? formatDistanceToNow(parseDbDate(row.changed_at), { addSuffix: true })
                      : '—'}
                  </td>
                  <td className="px-2 py-2.5">
                    <CellHistoryPopover
                      productId={row.product_id}
                      columnId={row.column_id}
                      columnName={row.column_name}
                      trigger={
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Eye className="w-3.5 h-3.5 text-text-muted" />
                        </button>
                      }
                    />
                  </td>
                </tr>
              ))
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
              disabled={offset + limit >= productHistoryTotal}
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
