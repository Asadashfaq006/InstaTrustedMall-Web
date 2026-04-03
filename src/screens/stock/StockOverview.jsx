import React, { useEffect, useState, useMemo } from 'react';
import useStockStore from '@/stores/stockStore';
import useBusinessStore from '@/stores/businessStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StockIndicator from '@/components/stock/StockIndicator';
import StockAdjustModal from '@/components/stock/StockAdjustModal';
import { Search, ArrowUpDown, ArrowDownToLine, ArrowUpFromLine, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STOCK_STATUS_COLORS } from '@/constants/stockReasons';

export default function StockOverview() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const { stockLevels, loading, fetchStockLevels } = useStockStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'ok' | 'low' | 'out'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'quantity' | 'status'
  const [sortDir, setSortDir] = useState('asc');

  // Adjust modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustTab, setAdjustTab] = useState('in');

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchStockLevels(activeBusiness.id);
    }
  }, [activeBusiness?.id, fetchStockLevels]);

  const filtered = useMemo(() => {
    let result = [...stockLevels];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.productName?.toLowerCase().includes(q) ||
        r.sku?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.productName || '').localeCompare(b.productName || '');
      else if (sortBy === 'quantity') cmp = a.quantity - b.quantity;
      else if (sortBy === 'status') {
        const order = { out: 0, low: 1, ok: 2 };
        cmp = (order[a.status] ?? 2) - (order[b.status] ?? 2);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [stockLevels, search, statusFilter, sortBy, sortDir]);

  const counts = useMemo(() => {
    const c = { all: stockLevels.length, ok: 0, low: 0, out: 0 };
    stockLevels.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [stockLevels]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };

  const openAdjust = (product, tab = 'in') => {
    setAdjustProduct(product);
    setAdjustTab(tab);
    setAdjustOpen(true);
  };

  const SortButton = ({ label, field }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
    >
      {label}
      {sortBy === field && <ArrowUpDown className="w-3 h-3" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {[
            { key: 'all', label: 'All' },
            { key: 'ok', label: 'In Stock', color: 'text-green-600' },
            { key: 'low', label: 'Low', color: 'text-amber-600' },
            { key: 'out', label: 'Out', color: 'text-red-600' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                statusFilter === f.key ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'
              )}
            >
              {f.label}
              <span className="ml-1 text-text-muted">({counts[f.key]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-white">
        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_120px_100px_120px] gap-4 px-4 py-3 bg-gray-50 border-b border-border">
          <SortButton label="Product" field="name" />
          <span className="text-xs font-medium text-text-muted">SKU</span>
          <SortButton label="Stock" field="quantity" />
          <SortButton label="Status" field="status" />
          <span className="text-xs font-medium text-text-muted text-right">Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Filter className="w-8 h-8 mb-2 opacity-40" />
            <span>No products found</span>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-border">
            {filtered.map((item) => {
              const statusColor = STOCK_STATUS_COLORS[item.status] || STOCK_STATUS_COLORS.ok;
              return (
                <div
                  key={item.productId}
                  className="grid grid-cols-[1fr_100px_120px_100px_120px] gap-4 px-4 py-3 items-center hover:bg-gray-50/50 transition-colors"
                  style={{
                    backgroundColor: statusColor.bg !== 'transparent' ? statusColor.bg : undefined,
                    borderLeft: statusColor.border !== 'transparent' ? `3px solid ${statusColor.border}` : undefined,
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{item.productName}</div>
                    {item.category && <div className="text-xs text-text-muted truncate">{item.category}</div>}
                  </div>
                  <div className="text-sm text-text-muted truncate">{item.sku || '—'}</div>
                  <StockIndicator
                    quantity={item.quantity}
                    reorderAt={item.reorderAt}
                    status={item.status}
                    packQty={item.packQty}
                    onClick={() => openAdjust(item)}
                  />
                  <Badge
                    variant={item.status === 'ok' ? 'success' : item.status === 'low' ? 'warning' : 'destructive'}
                    className="w-fit text-[10px]"
                  >
                    {item.status === 'ok' ? 'In Stock' : item.status === 'low' ? 'Low' : 'Out'}
                  </Badge>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openAdjust(item, 'in')}
                      className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                      title="Stock In"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openAdjust(item, 'out')}
                      className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                      title="Stock Out"
                    >
                      <ArrowUpFromLine className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adjust modal */}
      <StockAdjustModal
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        product={adjustProduct}
        initialTab={adjustTab}
      />
    </div>
  );
}
