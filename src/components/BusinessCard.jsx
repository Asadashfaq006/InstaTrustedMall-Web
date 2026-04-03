import React, { useState } from 'react';
import { Settings, Loader2, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, localFileUrl } from '@/lib/utils';
import { getBusinessTypeInfo } from '@/constants/businessPresets';

export default function BusinessCard({ business, isActive, onSwitch, onEdit, onDelete, switching }) {
  const typeInfo = getBusinessTypeInfo(business.type);
  const [gearOpen, setGearOpen] = useState(false);

  const renderLogo = () => {
    if (business.logo_path) {
      return (
        <img
          src={localFileUrl(business.logo_path)}
          alt={business.name}
          className="w-12 h-12 rounded-lg object-cover"
        />
      );
    }
    // Fallback: first letter in colored circle
    return (
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
        style={{ backgroundColor: typeInfo.color }}
      >
        {business.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md',
        isActive
          ? 'border-accent bg-blue-50/30'
          : 'border-border'
      )}
    >
      {/* Active badge */}
      {isActive && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-accent text-white text-[11px] font-bold uppercase tracking-wide">
          Active
        </span>
      )}

      {/* Switching overlay */}
      {switching && (
        <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      )}

      <div className={cn('space-y-3', isActive && 'mt-5')}>
        {/* Logo */}
        {renderLogo()}

        {/* Name */}
        <h3 className="text-base font-bold text-text-primary leading-tight truncate">
          {business.name}
        </h3>

        {/* Type */}
        <p className="text-[13px] text-text-secondary">
          {typeInfo.icon} {typeInfo.label}
        </p>

        {/* Product count (placeholder) */}
        <p className="text-xs text-text-muted">
          0 products
        </p>

        {/* Divider */}
        <div className="h-px bg-gray-100" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isActive && (
            <Button
              variant="accent-outline"
              size="sm"
              onClick={() => onSwitch(business.id)}
              disabled={switching}
            >
              Switch
            </Button>
          )}
          <Popover open={gearOpen} onOpenChange={setGearOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                <Settings className="w-4 h-4 text-text-secondary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <button
                onClick={() => { onEdit(business); setGearOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 text-text-primary"
              >
                <Edit className="w-4 h-4" />
                Edit Business
              </button>
              <button
                onClick={() => { onDelete(business); setGearOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 text-error"
              >
                <Trash2 className="w-4 h-4" />
                Delete Business
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
