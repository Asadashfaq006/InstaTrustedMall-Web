import React, { useEffect } from 'react';
import useStockStore from '@/stores/stockStore';
import useBusinessStore from '@/stores/businessStore';
import { cn } from '@/lib/utils';

/**
 * Badge that shows count of low/out-of-stock products in the sidebar.
 */
export default function LowStockBadge({ className }) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const lowStockCount = useStockStore((s) => s.lowStockCount);
  const outOfStockCount = useStockStore((s) => s.outOfStockCount);
  const fetchLowStockCount = useStockStore((s) => s.fetchLowStockCount);

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchLowStockCount(activeBusiness.id);
      // Refresh every 30 seconds
      const interval = setInterval(() => fetchLowStockCount(activeBusiness.id), 30000);
      return () => clearInterval(interval);
    }
  }, [activeBusiness?.id, fetchLowStockCount]);

  const total = lowStockCount + outOfStockCount;
  if (!total) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1',
        className
      )}
      title={`${lowStockCount} low stock, ${outOfStockCount} out of stock`}
    >
      {total > 99 ? '99+' : total}
    </span>
  );
}
