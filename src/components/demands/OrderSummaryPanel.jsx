import React from 'react';
import { calcDemandTotals } from '@/utils/demandCalculations';
import { formatCurrency } from '@/utils/buyerHelpers';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Order summary panel for Demand Builder (right sidebar).
 * Shows live computed totals, overall discount controls, and total due.
 * Props:
 *   items                  - array of line item objects
 *   buyerBalance           - buyer's current outstanding balance
 *   overallDiscountType    - 'percent' | 'flat'
 *   overallDiscountValue   - number
 *   applyTax               - boolean
 *   taxRate                - number (business tax rate)
 *   onOverallDiscountTypeChange  - (type) => void
 *   onOverallDiscountValueChange - (value) => void
 *   onApplyTaxChange       - (checked) => void
 *   readOnly               - boolean (for view-only mode)
 *   className              - additional classes
 */
export default function OrderSummaryPanel({
  items = [],
  buyerBalance = 0,
  overallDiscountType = 'percent',
  overallDiscountValue = 0,
  applyTax = false,
  taxRate = 0,
  onOverallDiscountTypeChange,
  onOverallDiscountValueChange,
  onApplyTaxChange,
  readOnly = false,
  className,
  packInfo = {},
}) {
  const { subtotal, total_discount, total_tax, grand_total, overall_discount_amount } = calcDemandTotals(items, {
    overallDiscountType,
    overallDiscountValue,
    applyTax,
    taxRate,
  });
  const totalDue = grand_total + buyerBalance;
  const hasItems = items.length > 0;

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5', className)}>
      <h3 className="text-sm font-semibold text-text-primary mb-4">Order Summary</h3>

      <div className="space-y-2.5">
        {/* Items count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Items ({items.length})</span>
        </div>

        {/* Pack breakdown */}
        {Object.keys(packInfo).length > 0 && items.some(i => packInfo[i.product_id]?.packQuantity > 1) && (
          <div className="bg-indigo-50/50 rounded-lg px-3 py-2 space-y-1">
            <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Pack Breakdown</p>
            {items.filter(i => packInfo[i.product_id]?.packQuantity > 1).map((item, idx) => {
              const pi = packInfo[item.product_id];
              const packs = Math.floor(item.qty / pi.packQuantity);
              const rem = item.qty % pi.packQuantity;
              return (
                <div key={item.id || idx} className="flex justify-between text-[11px] text-indigo-700">
                  <span className="truncate max-w-[120px]">{item.product_name}</span>
                  <span className="font-medium">
                    {packs > 0 && `${packs}pk`}{packs > 0 && rem > 0 && '+'}{rem > 0 && `${rem}u`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Subtotal</span>
          <span className="font-medium text-text-primary">{formatCurrency(subtotal)}</span>
        </div>

        {/* Line-level discount */}
        {total_discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-600">Discount</span>
            <span className="font-medium text-emerald-600">-{formatCurrency(total_discount)}</span>
          </div>
        )}

        {/* Tax */}
        {total_tax > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Tax</span>
            <span className="font-medium text-text-primary">+{formatCurrency(total_tax)}</span>
          </div>
        )}

        {/* Overall Discount Controls */}
        {!readOnly && hasItems && (
          <div className="border-t border-dashed border-gray-200 pt-2.5 space-y-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Overall Discount</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overallDiscountValue || ''}
                onChange={(e) => onOverallDiscountValueChange?.(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="flex-1 h-8 text-sm px-2"
              />
              <button
                onClick={() => onOverallDiscountTypeChange?.(overallDiscountType === 'percent' ? 'flat' : 'percent')}
                className="h-8 px-2.5 text-xs font-medium rounded border border-gray-200 hover:bg-gray-50 text-text-secondary"
              >
                {overallDiscountType === 'percent' ? '%' : 'Rs.'}
              </button>
            </div>
            {overall_discount_amount > 0 && (
              <p className="text-xs text-emerald-600">Saves {formatCurrency(overall_discount_amount)}</p>
            )}

            {/* Tax toggle */}
            {taxRate > 0 && (
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={applyTax}
                  onChange={(e) => onApplyTaxChange?.(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-text-secondary">Apply {taxRate}% Tax</span>
              </label>
            )}
          </div>
        )}

        {/* Grand Total */}
        <div className="border-t border-gray-200 pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Grand Total</span>
            <span className="text-lg font-bold text-text-primary">{formatCurrency(grand_total)}</span>
          </div>
        </div>

        {/* Previous balance */}
        {buyerBalance > 0 && (
          <>
            <div className="border-t border-dashed border-gray-200 pt-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600">Previous Balance</span>
                <span className="font-medium text-red-600">{formatCurrency(buyerBalance)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">Total Due</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(totalDue)}</span>
            </div>
          </>
        )}
      </div>

      {/* Empty state */}
      {!hasItems && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-text-muted">Add products to see totals</p>
        </div>
      )}
    </div>
  );
}
