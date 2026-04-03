import React from 'react';
import { cn } from '@/lib/utils';

const presets = [
  { label: 'Today', getRange: () => { const d = new Date().toISOString().split('T')[0]; return [d, d]; } },
  { label: 'This Week', getRange: () => {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
  }},
  { label: 'This Month', getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
  }},
  { label: 'Last Month', getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
  }},
  { label: 'Last 3M', getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return [start.toISOString().split('T')[0], now.toISOString().split('T')[0]];
  }},
  { label: 'This Year', getRange: () => {
    const y = new Date().getFullYear();
    return [`${y}-01-01`, `${y}-12-31`];
  }},
];

export default function DateRangePicker({ dateFrom, dateTo, onChange, showPresets = true }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateFrom || ''}
          onChange={(e) => onChange(e.target.value, dateTo)}
          className="h-9 rounded-md border border-input px-3 text-sm bg-white"
        />
        <span className="text-xs text-text-muted">to</span>
        <input
          type="date"
          value={dateTo || ''}
          onChange={(e) => onChange(dateFrom, e.target.value)}
          className="h-9 rounded-md border border-input px-3 text-sm bg-white"
        />
      </div>
      {showPresets && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {presets.map((p) => {
            const [pFrom, pTo] = p.getRange();
            const isActive = dateFrom === pFrom && dateTo === pTo;
            return (
              <button
                key={p.label}
                onClick={() => onChange(pFrom, pTo)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-navy text-white'
                    : 'bg-white border border-border text-text-secondary hover:bg-gray-50'
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
