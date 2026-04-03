import React, { useEffect, useState } from 'react';
import useStockStore from '@/stores/stockStore';
import useBusinessStore from '@/stores/businessStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StockAdjustModal from '@/components/stock/StockAdjustModal';
import { AlertTriangle, XCircle, ArrowDownToLine, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatStockNumber } from '@/utils/stockNumber';

export default function LowStockPanel() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const {
    lowStockProducts, outOfStockProducts,
    fetchLowStockProducts, fetchOutOfStockProducts,
  } = useStockStore();

  const [view, setView] = useState('low'); // 'low' | 'out'
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchLowStockProducts(activeBusiness.id);
      fetchOutOfStockProducts(activeBusiness.id);
    }
  }, [activeBusiness?.id, fetchLowStockProducts, fetchOutOfStockProducts]);

  const openRestock = (product) => {
    setAdjustProduct(product);
    setAdjustOpen(true);
  };

  const items = view === 'low' ? lowStockProducts : outOfStockProducts;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setView('low')}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl border transition-all text-left',
            view === 'low'
              ? 'border-amber-300 bg-amber-50 shadow-sm'
              : 'border-border bg-white hover:bg-gray-50'
          )}
        >
          <div className="p-2 rounded-lg bg-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{lowStockProducts.length}</div>
            <div className="text-sm text-text-muted">Low Stock Items</div>
            <div className="text-xs text-amber-600 mt-0.5">At or below reorder level</div>
          </div>
        </button>

        <button
          onClick={() => setView('out')}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl border transition-all text-left',
            view === 'out'
              ? 'border-red-300 bg-red-50 shadow-sm'
              : 'border-border bg-white hover:bg-gray-50'
          )}
        >
          <div className="p-2 rounded-lg bg-red-100">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{outOfStockProducts.length}</div>
            <div className="text-sm text-text-muted">Out of Stock Items</div>
            <div className="text-xs text-red-600 mt-0.5">Zero quantity</div>
          </div>
        </button>
      </div>

      {/* List */}
      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 bg-gray-50 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            {view === 'low' ? 'Low Stock Products' : 'Out of Stock Products'}
          </span>
          <Badge variant={view === 'low' ? 'warning' : 'destructive'}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Package className="w-8 h-8 mb-2 opacity-40" />
            <span>{view === 'low' ? 'No low stock items' : 'No out of stock items'}</span>
            <span className="text-xs mt-1">All products are well stocked</span>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-380px)] overflow-y-auto divide-y divide-border">
            {items.map((item) => (
              <div
                key={item.productId}
                className={cn(
                  'flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors',
                  view === 'out' && 'bg-red-50/30'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">{item.productName}</span>
                    {item.sku && <span className="text-xs text-text-muted">({item.sku})</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                    <span>
                      Current: <span className={cn(
                        'font-semibold',
                        item.quantity === 0 ? 'text-red-600' : 'text-amber-600'
                      )}>{formatStockNumber(item.quantity)}</span>
                    </span>
                    {item.reorderAt > 0 && (
                      <span>Reorder at: <span className="font-medium">{formatStockNumber(item.reorderAt)}</span></span>
                    )}
                    {item.reorderQty && (
                      <span>Reorder qty: <span className="font-medium">{formatStockNumber(item.reorderQty)}</span></span>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openRestock(item)}
                  className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Restock
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <StockAdjustModal
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        product={adjustProduct}
        initialTab="in"
      />
    </div>
  );
}
