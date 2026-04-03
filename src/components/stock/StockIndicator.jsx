import React from 'react';
import { cn } from '@/lib/utils';
import { formatStockNumber, roundStockNumber } from '@/utils/stockNumber';

/**
 * Visual stock indicator for product rows in the grid.
 * Shows quantity with color coding based on status.
 * If packQty > 1, shows "X packs + Y units" format.
 */
export default function StockIndicator({ quantity, reorderAt, status: statusProp, packQty = 1, onClick, className }) {
  const status = statusProp || (
    quantity === 0 ? 'out' :
    (reorderAt > 0 && quantity <= reorderAt) ? 'low' : 'ok'
  );

  const styles = {
    ok: 'text-text-primary',
    low: 'text-amber-600 font-medium',
    out: 'text-red-600 font-semibold',
  };

  const labels = {
    ok: null,
    low: 'Low',
    out: 'Out',
  };

  // Format stock display
  const effectivePackQty = packQty > 1 ? packQty : 0;
  const packs = effectivePackQty > 0 ? Math.floor(quantity / effectivePackQty) : 0;
  const loose = effectivePackQty > 0 ? roundStockNumber(quantity % effectivePackQty) : 0;

  const displayText = effectivePackQty > 0
    ? (packs > 0 && loose > 0
        ? `${packs}pk + ${formatStockNumber(loose)}u`
        : packs > 0
          ? `${packs}pk`
          : `${formatStockNumber(loose)}u`)
    : `${formatStockNumber(quantity)}`;

  const titleText = effectivePackQty > 0
    ? `${formatStockNumber(quantity)} total units (${packs} pack${packs !== 1 ? 's' : ''} × ${effectivePackQty} + ${formatStockNumber(loose)} loose)`
    : `${formatStockNumber(quantity)} units`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm transition-colors hover:bg-gray-100',
        styles[status],
        className
      )}
      title={status === 'out' ? 'Out of Stock' : status === 'low' ? `Low Stock (reorder at ${reorderAt})` : titleText}
    >
      <span>{displayText}</span>
      {labels[status] && (
        <span className={cn(
          'text-[10px] uppercase tracking-wider px-1 py-px rounded-sm font-bold',
          status === 'low' && 'bg-amber-100 text-amber-700',
          status === 'out' && 'bg-red-100 text-red-700',
        )}>
          {labels[status]}
        </span>
      )}
    </button>
  );
}
