// Stock-In reasons
export const STOCK_IN_REASONS = [
  'New Purchase',
  'Supplier Delivery',
  'Return from Customer',
  'Transfer In',
  'Found / Correction',
  'Opening Balance',
  'Production Complete',
  'Gift / Donation Received',
  'Other',
];

// Stock-Out reasons
export const STOCK_OUT_REASONS = [
  'Sale',
  'Damaged / Broken',
  'Expired',
  'Lost / Stolen',
  'Transfer Out',
  'Sample / Giveaway',
  'Personal Use',
  'Write-Off',
  'Other',
];

// Set Exact reasons (used when setting quantity directly)
export const SET_EXACT_REASONS = [
  'Physical Count',
  'Inventory Audit',
  'System Correction',
  'Opening Balance',
  'Other',
];

// Movement type labels
export const MOVEMENT_TYPE_LABELS = {
  in: 'Stock In',
  out: 'Stock Out',
  adjustment: 'Adjustment',
  demand_out: 'Demand Out',
  demand_cancel_in: 'Demand Cancel',
};

// Movement type colors
export const MOVEMENT_TYPE_COLORS = {
  in: { bg: '#D1FAE5', text: '#059669' },
  out: { bg: '#FEE2E2', text: '#DC2626' },
  adjustment: { bg: '#E0F2FE', text: '#0369A1' },
  demand_out: { bg: '#EDE9FE', text: '#7C3AED' },
  demand_cancel_in: { bg: '#EDE9FE', text: '#7C3AED' },
};

// Source labels
export const SOURCE_LABELS = {
  manual: 'Manual',
  import: 'Import',
  demand: 'Demand',
  adjustment: 'Adjustment',
};

// Stock status colors
export const STOCK_STATUS_COLORS = {
  ok: { bg: 'transparent', border: 'transparent', text: 'inherit' },
  low: { bg: '#FFFBEB', border: '#D97706', text: '#92400E' },
  out: { bg: '#FFF1F2', border: '#E11D48', text: '#9F1239' },
};
