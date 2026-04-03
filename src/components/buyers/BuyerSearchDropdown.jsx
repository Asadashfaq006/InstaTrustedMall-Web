import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import useBusinessStore from '@/stores/businessStore';
import { getAvatarColor, getBuyerInitials, getPaymentStatusConfig } from '@/utils/buyerHelpers';
import { Search, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reusable buyer search dropdown for M5 demand linking.
 * Searches buyers by name/phone/code and allows selection.
 * Also supports free-text custom names (for counter sales or walk-in customers).
 *
 * Props:
 *   value          - selected buyer object or null
 *   onChange        - callback(buyer) when buyer is selected (buyer object or null)
 *   customName     - free-text customer name string
 *   onCustomNameChange - callback(name) when custom name changes
 *   onCreateNew    - callback() to open BuyerModal (optional)
 *   placeholder    - input placeholder text
 *   className      - additional classes for wrapper
 */
export default function BuyerSearchDropdown({
  value = null,
  onChange,
  customName = '',
  onCustomNameChange,
  onCreateNew,
  placeholder = 'Counter Sale',
  className,
}) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || !activeBusiness) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await window.electronAPI.buyers.search({
          businessId: activeBusiness.id,
          query: query.trim(),
        });
        if (res.success) {
          setResults(res.data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeBusiness?.id]);

  const handleSelect = (buyer) => {
    onChange(buyer);
    setQuery('');
    onCustomNameChange?.('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    onCustomNameChange?.('');
    setQuery('');
    inputRef.current?.focus();
  };

  // Handle input change: update query for search AND custom name
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    // If a buyer was selected, clear it since user is typing a new name
    if (value) {
      onChange(null);
    }
    onCustomNameChange?.(val);
  };

  // If a buyer is selected, show the mini card
  if (value) {
    const statusConfig = getPaymentStatusConfig(value.payment_status);
    return (
      <div className={cn('flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg border border-gray-200', className)}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: getAvatarColor(value.id) }}
        >
          <span className="text-white text-xs font-bold">{getBuyerInitials(value.full_name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{value.full_name}</p>
          <p className="text-[11px] text-text-muted font-mono">{value.buyer_code}</p>
        </div>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusConfig.bgColor, statusConfig.textColor)}>
          {statusConfig.label}
        </span>
        <button onClick={handleClear} className="text-text-muted hover:text-text-primary text-xs">
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          ref={inputRef}
          value={query || customName}
          onChange={handleInputChange}
          onFocus={() => (query.trim() || customName.trim()) && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {isOpen && ((query.trim() && results.length > 0) || loading || onCreateNew) && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-border shadow-lg max-h-[240px] overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-text-muted">Searching...</div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div className="px-3 py-3 text-sm text-text-muted text-center">
              No buyers found
            </div>
          )}

          {results.map((buyer) => {
            const statusConfig = getPaymentStatusConfig(buyer.payment_status);
            return (
              <button
                key={buyer.id}
                onClick={() => handleSelect(buyer)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(buyer.id) }}
                >
                  <span className="text-white text-[10px] font-bold">{getBuyerInitials(buyer.full_name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{buyer.full_name}</p>
                  <p className="text-[11px] text-text-muted">{buyer.buyer_code} {buyer.phone ? `• ${buyer.phone}` : ''}</p>
                </div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', statusConfig.bgColor, statusConfig.textColor)}>
                  {statusConfig.label}
                </span>
              </button>
            );
          })}

          {onCreateNew && (
            <>
              {results.length > 0 && <div className="border-t border-border" />}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateNew();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-accent hover:bg-accent/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create new buyer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
