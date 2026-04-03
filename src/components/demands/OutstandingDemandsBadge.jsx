import React, { useEffect } from 'react';
import useDemandStore from '@/stores/demandStore';
import useBusinessStore from '@/stores/businessStore';
import { cn } from '@/lib/utils';

/**
 * Badge that shows count of outstanding + partial demands in the sidebar.
 */
export default function OutstandingDemandsBadge({ className }) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const statusCounts = useDemandStore((s) => s.statusCounts);
  const loadDemands = useDemandStore((s) => s.loadDemands);

  useEffect(() => {
    if (activeBusiness?.id) {
      loadDemands(activeBusiness.id);
      const interval = setInterval(() => loadDemands(activeBusiness.id), 60000);
      return () => clearInterval(interval);
    }
  }, [activeBusiness?.id, loadDemands]);

  const count = (statusCounts.outstanding || 0) + (statusCounts.partial || 0);

  if (!count) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1',
        className
      )}
      title={`${count} outstanding demand${count !== 1 ? 's' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
