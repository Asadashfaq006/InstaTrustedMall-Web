import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { computeLineItem } from '@/utils/demandCalculations';
import { formatCurrency } from '@/utils/buyerHelpers';
import { Trash2, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Line item row for Demand Builder.
 * Props:
 *   item        - { id, product_id, product_name, sku, qty, price, discount_type, discount_value, tax_rate }
 *   onChange     - (updatedItem) => void
 *   onRemove     - () => void
 *   stockLevel   - current stock quantity for this product (optional)
 */
export default function LineItemRow({ item, onChange, onRemove, stockLevel }) {
  const [showTax, setShowTax] = useState(false);

  const { discountAmount, taxAmount, lineTotal } = computeLineItem(item);
  const isOverStock = stockLevel != null && item.qty > stockLevel;

  const updateField = (field, value) => {
    onChange({ ...item, [field]: value });
  };

  const incrementQty = () => updateField('qty', Math.max(1, (Number(item.qty) || 0) + 1));
  const decrementQty = () => updateField('qty', Math.max(1, (Number(item.qty) || 0) - 1));

  const toggleDiscountType = () => {
    updateField('discount_type', item.discount_type === 'percent' ? 'flat' : 'percent');
  };

  return (
    <div className={cn(
      'group border rounded-lg p-3 transition-colors',
      isOverStock ? 'border-red-300 bg-red-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
    )}>
      {/* Product info row */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{item.product_name}</p>
          {item.sku && (
            <p className="text-[11px] text-text-muted font-mono">{item.sku}</p>
          )}
        </div>
        <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
          {formatCurrency(lineTotal)}
        </span>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quantity */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={decrementQty}
            disabled={item.qty <= 1}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <Input
            type="number"
            min="1"
            value={item.qty}
            onChange={(e) => updateField('qty', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-14 h-7 text-center text-sm px-1"
          />
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={incrementQty}>
            <Plus className="w-3 h-3" />
          </Button>
          {stockLevel != null && (
            <span className={cn(
              'text-[10px] ml-1',
              isOverStock ? 'text-red-600 font-semibold' : 'text-text-muted'
            )}>
              ({stockLevel} avail)
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-text-muted">@</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-text-muted">Rs.</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.price}
              onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
              className="w-24 h-7 text-sm pl-8 pr-2"
            />
          </div>
        </div>

        {/* Discount */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-text-muted">Disc:</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={item.discount_value || ''}
            onChange={(e) => updateField('discount_value', parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-16 h-7 text-sm px-2"
          />
          <button
            onClick={toggleDiscountType}
            className="h-7 px-2 text-[11px] font-medium rounded border border-gray-200 hover:bg-gray-50 text-text-secondary"
          >
            {item.discount_type === 'percent' ? '%' : 'Rs.'}
          </button>
          {discountAmount > 0 && (
            <span className="text-[10px] text-emerald-600">-{formatCurrency(discountAmount)}</span>
          )}
        </div>

        {/* Tax toggle */}
        <button
          onClick={() => setShowTax(!showTax)}
          className="flex items-center gap-0.5 h-7 px-2 text-[11px] text-text-muted hover:text-text-primary rounded border border-gray-200 hover:bg-gray-50"
        >
          Tax {taxAmount > 0 && `(${formatCurrency(taxAmount)})`}
          {showTax ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Tax row (expandable) */}
      {showTax && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <span className="text-[11px] text-text-muted">Tax Rate:</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={item.tax_rate || ''}
            onChange={(e) => updateField('tax_rate', parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-16 h-7 text-sm px-2"
          />
          <span className="text-[11px] text-text-muted">%</span>
          {taxAmount > 0 && (
            <span className="text-[10px] text-text-secondary ml-auto">
              +{formatCurrency(taxAmount)}
            </span>
          )}
        </div>
      )}

      {/* Over-stock warning */}
      {isOverStock && (
        <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
          ⚠ Insufficient stock — need {item.qty}, only {stockLevel} available
        </p>
      )}
    </div>
  );
}
