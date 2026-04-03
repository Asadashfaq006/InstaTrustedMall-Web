import React, { useEffect, useState } from 'react';
import useBusinessStore from '@/stores/businessStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, AlertTriangle, XCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExpiryPanel() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [daysAhead, setDaysAhead] = useState(30);
  const [view, setView] = useState('all'); // 'all' | 'expired' | 'expiring'

  const loadExpiry = async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.stock.getExpiryProducts({
        businessId: activeBusiness.id,
        daysAhead,
      });
      if (res.success) {
        setProducts(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load expiry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpiry();
  }, [activeBusiness?.id, daysAhead]);

  const expired = products.filter((p) => p.expiryStatus === 'expired');
  const expiringSoon = products.filter((p) => p.expiryStatus === 'expiring_soon');

  const displayProducts =
    view === 'expired' ? expired :
    view === 'expiring' ? expiringSoon :
    products;

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return d; }
  };

  const daysUntil = (d) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
    return diff;
  };

  if (products.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <Clock className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No expiry data found</p>
        <p className="text-xs mt-1">
          Products with an &quot;Expiry Date&quot; column will appear here when approaching expiry.
        </p>
        <p className="text-xs mt-1 text-text-muted/60">
          Ensure your business has the Expiry Date column (common in Pharmacy type).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setView('all')}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl border transition-all text-left',
            view === 'all'
              ? 'border-blue-300 bg-blue-50 shadow-sm'
              : 'border-border bg-white hover:bg-gray-50'
          )}
        >
          <div className="p-2 rounded-lg bg-blue-100">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{products.length}</div>
            <div className="text-sm text-text-muted">Total Tracked</div>
          </div>
        </button>

        <button
          onClick={() => setView('expired')}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl border transition-all text-left',
            view === 'expired'
              ? 'border-red-300 bg-red-50 shadow-sm'
              : 'border-border bg-white hover:bg-gray-50'
          )}
        >
          <div className="p-2 rounded-lg bg-red-100">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{expired.length}</div>
            <div className="text-sm text-text-muted">Expired</div>
            <div className="text-xs text-red-600 mt-0.5">Past expiry date</div>
          </div>
        </button>

        <button
          onClick={() => setView('expiring')}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl border transition-all text-left',
            view === 'expiring'
              ? 'border-amber-300 bg-amber-50 shadow-sm'
              : 'border-border bg-white hover:bg-gray-50'
          )}
        >
          <div className="p-2 rounded-lg bg-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{expiringSoon.length}</div>
            <div className="text-sm text-text-muted">Expiring Soon</div>
            <div className="text-xs text-amber-600 mt-0.5">Within {daysAhead} days</div>
          </div>
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">Show products expiring within</span>
        <Input
          type="number"
          min="1"
          max="365"
          value={daysAhead}
          onChange={(e) => setDaysAhead(parseInt(e.target.value) || 30)}
          className="w-20 h-8 text-sm text-center"
        />
        <span className="text-sm text-text-secondary">days</span>
        <Button variant="outline" size="sm" onClick={loadExpiry} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Product List */}
      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 bg-gray-50 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            {view === 'expired' ? 'Expired Products' : view === 'expiring' ? 'Expiring Soon' : 'All Expiry Products'}
          </span>
          <Badge variant={view === 'expired' ? 'destructive' : view === 'expiring' ? 'warning' : 'secondary'}>
            {displayProducts.length} item{displayProducts.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Package className="w-8 h-8 mb-2 opacity-40" />
            <span>No {view === 'expired' ? 'expired' : view === 'expiring' ? 'expiring' : ''} products</span>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-440px)] overflow-y-auto divide-y divide-border">
            {displayProducts.map((item) => {
              const days = daysUntil(item.expiryDate);
              const isExpired = item.expiryStatus === 'expired';
              return (
                <div
                  key={item.productId}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 hover:bg-gray-50',
                    isExpired && 'bg-red-50/50'
                  )}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    isExpired ? 'bg-red-500' : 'bg-amber-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{item.productName}</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {item.sku && <span className="font-mono">{item.sku}</span>}
                      {item.category && <span>{item.category}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      'text-sm font-medium',
                      isExpired ? 'text-red-600' : 'text-amber-600'
                    )}>
                      {fmtDate(item.expiryDate)}
                    </p>
                    <p className={cn(
                      'text-xs',
                      isExpired ? 'text-red-500' : 'text-amber-500'
                    )}>
                      {isExpired
                        ? `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`
                        : `${days} day${days !== 1 ? 's' : ''} left`
                      }
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 w-16">
                    <p className="text-sm font-mono text-text-primary">{item.quantity}</p>
                    <p className="text-[10px] text-text-muted">in stock</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
