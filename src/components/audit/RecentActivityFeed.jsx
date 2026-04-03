import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn, parseDbDate } from '@/lib/utils';

const ACTION_ICON_COLORS = {
  CREATE: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
  SOFT_DELETE: 'bg-red-400',
  HARD_DELETE: 'bg-red-600',
  RESTORE: 'bg-teal-500',
  CONFIRM: 'bg-purple-500',
  CANCEL: 'bg-amber-500',
  REOPEN: 'bg-indigo-500',
  PAYMENT: 'bg-emerald-500',
  SET_ACTIVE: 'bg-cyan-500',
  STOCK_IN: 'bg-green-500',
  STOCK_OUT: 'bg-red-500',
  STOCK_ADJUST: 'bg-blue-500',
  BATCH_STOCK_IN: 'bg-green-400',
  IMPORT_CSV: 'bg-gray-500',
  DUPLICATE: 'bg-sky-500',
  ARCHIVE: 'bg-gray-400',
};

const ENTITY_COLORS = {
  product: 'text-blue-600',
  stock: 'text-orange-600',
  demand: 'text-purple-600',
  buyer: 'text-green-600',
  payment: 'text-emerald-600',
  column: 'text-cyan-600',
  business: 'text-navy',
};

export default function RecentActivityFeed({ entries = [], maxItems = 15 }) {
  const visible = entries.slice(0, maxItems);

  if (visible.length === 0) {
    return (
      <p className="text-xs text-text-muted text-center py-6">
        No recent activity
      </p>
    );
  }

  return (
    <div className="space-y-0 relative">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />

      {visible.map((entry, idx) => {
        const dotColor = ACTION_ICON_COLORS[entry.action] || 'bg-gray-400';
        const entityColor = ENTITY_COLORS[entry.entity_type] || 'text-gray-600';

        return (
          <div key={entry.id || idx} className="relative flex items-start gap-3 py-2 pl-1">
            {/* Dot */}
            <div className={cn('w-[14px] h-[14px] rounded-full flex-shrink-0 mt-0.5 ring-2 ring-white', dotColor)} />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary leading-snug">
                <span className={cn('font-medium uppercase text-[10px] mr-1', entityColor)}>
                  {entry.entity_type}
                </span>
                {entry.summary}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {entry.logged_at
                  ? formatDistanceToNow(parseDbDate(entry.logged_at), { addSuffix: true })
                  : '—'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
