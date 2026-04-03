import React, { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, Eye, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CellHistoryPopover from '@/components/audit/CellHistoryPopover';
import { cn, parseDbDate } from '@/lib/utils';

/**
 * A panel/section that shows the full column_history for a specific product.
 * Can be used standalone or embedded inside ProductDetailPanel.
 *
 * Props:
 *   productId   - the product ID to show history for
 *   productName - display name
 *   columns     - array of column definitions (for filter dropdown)
 *   onClose     - () => void (optional, to close the panel)
 */
export default function ProductHistoryPanel({ productId, productName, columns = [], onClose }) {
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [columnFilter, setColumnFilter] = useState('');
  const [limit] = useState(30);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.history.getByProduct({
        productId,
        columnId: columnFilter || undefined,
        limit,
        offset,
      });
      if (res.success) {
        setHistory(res.data.rows);
        setTotal(res.data.total);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [productId, columnFilter, limit, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-navy" />
          <h3 className="text-sm font-semibold text-text-primary truncate">
            History: {productName || 'Product'}
          </h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            ×
          </Button>
        )}
      </div>

      {/* Column filter */}
      <div className="px-4 py-2 border-b border-border">
        <select
          value={columnFilter}
          onChange={(e) => { setColumnFilter(e.target.value); setOffset(0); }}
          className="w-full h-8 rounded-md border border-input px-2 text-xs bg-white"
        >
          <option value="">All columns</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {loading && history.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">No changes recorded</p>
        ) : (
          <div className="space-y-2">
            {history.map((row) => (
              <div key={row.id} className="bg-gray-50 rounded-lg p-2.5 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {row.column_name || `Col #${row.column_id}`}
                  </Badge>
                  <CellHistoryPopover
                    productId={productId}
                    columnId={row.column_id}
                    columnName={row.column_name}
                    trigger={
                      <button className="p-0.5 hover:bg-white rounded">
                        <Eye className="w-3 h-3 text-text-muted" />
                      </button>
                    }
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-500 line-through truncate max-w-[100px]">
                    {row.old_value ?? '—'}
                  </span>
                  <span className="text-text-muted">→</span>
                  <span className="text-green-700 font-medium truncate max-w-[100px]">
                    {row.new_value ?? '—'}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  {row.changed_at
                    ? formatDistanceToNow(parseDbDate(row.changed_at), { addSuffix: true })
                    : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <span className="text-[10px] text-text-muted">
            {currentPage}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
