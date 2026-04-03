import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, HelpCircle, X, Package, ArrowRight, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Floating popup that appears top-right on scan result.
 * Auto-dismisses after 4 seconds. Hovering pauses the timer.
 */
export default function GlobalScanPopup({ result, onClose, onNavigate }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const isHovering = useRef(false);
  const startTimeRef = useRef(null);
  const remainingRef = useRef(4000);

  const found = result?.found;
  const product = result?.product;

  // Start entry animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    startDismissTimer();
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  const startDismissTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      handleClose();
    }, remainingRef.current);

    // Progress bar update
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isHovering.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, remainingRef.current - elapsed);
      setProgress((remaining / 4000) * 100);
    }, 50);
  }, []);

  const handleMouseEnter = () => {
    isHovering.current = true;
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimeout(timerRef.current);
  };

  const handleMouseLeave = () => {
    isHovering.current = false;
    startDismissTimer();
  };

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => onClose(), 150);
  }, [onClose]);

  const handleAction = (action) => {
    handleClose();
    if (action === 'view' && product) onNavigate(`/products?highlight=${product.id}`);
    if (action === 'stockIn' && product) onNavigate(`/stock?stockIn=${product.id}`);
    if (action === 'demand' && product) onNavigate(`/demands/new?addProduct=${product.id}`);
    if (action === 'create') onNavigate(`/products?createWithBarcode=${result.scannedCode}`);
  };

  const stockStatusColor = product?.stockStatus === 'out_of_stock'
    ? 'text-red-600'
    : product?.stockStatus === 'low_stock'
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'fixed top-20 right-6 w-[340px] bg-white rounded-xl shadow-2xl border-2 z-[9999] overflow-hidden transition-all',
        found ? 'border-emerald-500' : 'border-amber-500',
        visible && !exiting ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
        exiting ? 'opacity-0 translate-x-8' : ''
      )}
      style={{ transitionDuration: exiting ? '150ms' : '200ms' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {found ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            )}
            <div>
              {found ? (
                <p className="text-[15px] font-bold text-text-primary leading-tight">
                  {product?.name}
                </p>
              ) : (
                <p className="text-[15px] font-bold text-amber-700 leading-tight">
                  Code not found
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details */}
        {found ? (
          <>
            <p className="text-xs text-text-muted mb-3">
              SKU: {product?.sku || '—'} &middot; {product?.category || 'Uncategorized'}
            </p>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span className={cn('text-sm font-medium', stockStatusColor)}>
                  {product?.currentStock ?? 0} units
                </span>
              </div>
              {product?.salePrice != null && (
                <span className="text-sm font-bold text-navy">
                  ₨ {Number(product.salePrice).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleAction('view')}>
                <ArrowRight className="w-3 h-3" /> View
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleAction('stockIn')}>
                <Package className="w-3 h-3" /> Stock In
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleAction('demand')}>
                <ShoppingCart className="w-3 h-3" /> Demand
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-text-muted mb-3 font-mono">
              Scanned: {result?.scannedCode}
            </p>
            <Button size="sm" className="text-xs h-7 gap-1 bg-purple-600 hover:bg-purple-700" onClick={() => handleAction('create')}>
              <Plus className="w-3 h-3" /> Create Product with this code
            </Button>
          </>
        )}
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="h-[3px] bg-gray-100">
        <div
          className={cn('h-full transition-all ease-linear', found ? 'bg-emerald-500' : 'bg-amber-500')}
          style={{ width: `${progress}%`, transitionDuration: '50ms' }}
        />
      </div>
    </div>
  );
}
