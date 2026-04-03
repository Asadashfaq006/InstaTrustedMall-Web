/**
 * Module 5: Demand Calculation Utilities
 * Pure functions for line item and demand total computation.
 * Mirrors the server-side logic in db.js for live frontend preview.
 */

/**
 * Round to 2 decimal places.
 */
export function round2(v) {
  return Math.round(v * 100) / 100;
}

/**
 * Compute a single line item's discount, tax, and total.
 * Accepts both frontend field names (qty, price, tax_rate) and backend names (quantity, unit_price, tax_value).
 * @param {Object} item
 * @returns {{ discountAmount: number, taxAmount: number, lineTotal: number }}
 */
export function calcLineItem(item) {
  const qty = Number(item.qty ?? item.quantity) || 0;
  const price = Number(item.price ?? item.unit_price) || 0;
  const gross = round2(qty * price);

  let discountAmount = 0;
  if (item.discount_type === 'percent') {
    discountAmount = round2(gross * ((Number(item.discount_value) || 0) / 100));
  } else if (item.discount_type === 'flat') {
    discountAmount = round2(Number(item.discount_value) || 0);
  }

  const afterDiscount = round2(gross - discountAmount);
  const taxRate = Number(item.tax_rate ?? item.tax_value) || 0;
  const taxType = item.tax_type || 'percent';
  let taxAmount = 0;
  if (taxType === 'percent') {
    taxAmount = round2(afterDiscount * (taxRate / 100));
  } else if (taxType === 'flat') {
    taxAmount = round2(taxRate);
  }

  const lineTotal = round2(afterDiscount + taxAmount);
  return { discountAmount, taxAmount, lineTotal };
}

/**
 * Compute demand-level totals from an array of line items.
 * Supports optional overall discount and tax toggle.
 * @param {Array} items - Array of line item objects
 * @param {Object} [options] - { overallDiscountType:'percent'|'flat', overallDiscountValue:number, applyTax:boolean, taxRate:number }
 * @returns {{ subtotal, total_discount, total_tax, grand_total, overall_discount_amount }}
 */
export function calcDemandTotals(items, options = {}) {
  let subtotal = 0;
  let total_discount = 0;
  let total_tax = 0;
  let lineGrandTotal = 0;

  for (const item of items) {
    const qty = Number(item.qty ?? item.quantity) || 0;
    const price = Number(item.price ?? item.unit_price) || 0;
    const { discountAmount, taxAmount, lineTotal } = calcLineItem(item);
    subtotal += round2(qty * price);
    total_discount += discountAmount;
    total_tax += taxAmount;
    lineGrandTotal += lineTotal;
  }

  subtotal = round2(subtotal);
  total_discount = round2(total_discount);
  total_tax = round2(total_tax);
  lineGrandTotal = round2(lineGrandTotal);

  // Apply overall discount
  let overall_discount_amount = 0;
  const odType = options.overallDiscountType || 'percent';
  const odValue = Number(options.overallDiscountValue) || 0;
  if (odValue > 0) {
    if (odType === 'percent') {
      overall_discount_amount = round2(lineGrandTotal * (odValue / 100));
    } else {
      overall_discount_amount = round2(odValue);
    }
  }

  let afterOverallDiscount = round2(lineGrandTotal - overall_discount_amount);

  // Apply tax on final total if toggled
  let overallTax = 0;
  if (options.applyTax && options.taxRate > 0) {
    overallTax = round2(afterOverallDiscount * (options.taxRate / 100));
  }

  const grand_total = round2(afterOverallDiscount + overallTax);

  return {
    subtotal,
    total_discount: round2(total_discount + overall_discount_amount),
    total_tax: round2(total_tax + overallTax),
    grand_total,
    overall_discount_amount,
  };
}

// Backward-compatible aliases
export const computeLineItem = calcLineItem;
export const computeDemandTotals = calcDemandTotals;
