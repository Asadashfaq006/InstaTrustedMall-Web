import React from 'react';
import { cn } from '@/lib/utils';

export default function ReportStatCard({ label, value, icon: Icon, color, bgColor, subtitle, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-border p-5 flex items-center gap-4 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      {Icon && (
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-text-primary leading-tight">
          {value ?? '–'}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
        {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
