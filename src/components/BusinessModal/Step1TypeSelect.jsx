import React from 'react';
import { BUSINESS_TYPES, COLUMN_PRESETS } from '@/constants/businessPresets';
import { cn } from '@/lib/utils';

export default function Step1TypeSelect({ selectedType, onSelect, error }) {
  const presets = selectedType ? COLUMN_PRESETS[selectedType] || [] : [];

  return (
    <div className="space-y-5">
      {/* Type Grid */}
      <div className="grid grid-cols-2 gap-3">
        {BUSINESS_TYPES.map((type) => {
          const isSelected = selectedType === type.key;
          return (
            <button
              key={type.key}
              onClick={() => onSelect(type.key)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 hover:shadow-sm',
                isSelected
                  ? 'border-accent bg-accent-light shadow-sm'
                  : 'border-border bg-white hover:border-gray-300',
                type.key === 'custom' && 'col-span-2',
                error && !selectedType && 'border-error/50'
              )}
            >
              <span className="text-[28px] leading-none mt-0.5">{type.icon}</span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-text-primary leading-tight">
                  {type.label}
                </p>
                <p className="text-[13px] text-text-secondary mt-0.5 leading-snug">
                  {type.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {/* Preset Columns Preview */}
      {selectedType && selectedType !== 'custom' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">
            Pre-configured columns for this type:
          </p>
          {/* Core fields always present */}
          <div className="flex flex-wrap gap-2">
            {['Product Name', 'SKU', 'Stock'].map((name) => (
              <span key={name} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border bg-slate-100 text-slate-500 border-slate-200">
                {name}
              </span>
            ))}
            {presets.map((col, idx) => (
              <span
                key={idx}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border',
                  col.type === 'formula'
                    ? 'bg-blue-50 text-accent border-accent/20'
                    : col.type === 'currency'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-50 text-gray-600 border-border'
                )}
              >
                {col.type === 'formula' && (
                  <span className="text-accent font-medium">ƒ</span>
                )}
                {col.type === 'currency' && (
                  <span className="text-emerald-500 font-medium">$</span>
                )}
                {col.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedType === 'custom' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">
            Start with core fields only:
          </p>
          <div className="flex flex-wrap gap-2">
            {['Product Name', 'SKU', 'Stock'].map((name) => (
              <span key={name} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border bg-slate-100 text-slate-500 border-slate-200">
                {name}
              </span>
            ))}
          </div>
          <p className="text-xs text-text-muted">You can add custom columns later.</p>
        </div>
      )}
    </div>
  );
}
