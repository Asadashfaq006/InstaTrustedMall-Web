import React, { useEffect } from 'react';
import useBuyerStore from '@/stores/buyerStore';
import useBusinessStore from '@/stores/businessStore';
import { cn } from '@/lib/utils';

/**
 * Badge that shows count of buyers with outstanding/partial balance in the sidebar.
 */
export default function OutstandingBuyersBadge({ className }) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const buyers = useBuyerStore((s) => s.buyers);
  const loadBuyers = useBuyerStore((s) => s.loadBuyers);

  useEffect(() => {
    if (activeBusiness?.id) {
      loadBuyers(activeBusiness.id);
      const interval = setInterval(() => loadBuyers(activeBusiness.id), 60000);
      return () => clearInterval(interval);
    }
  }, [activeBusiness?.id, loadBuyers]);

  const count = buyers.filter(
    (b) => b.payment_status === 'outstanding' || b.payment_status === 'partial'
  ).length;

  if (!count) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-1',
        className
      )}
      title={`${count} buyer${count !== 1 ? 's' : ''} with outstanding balance`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
