/**
 * Module 5: Demand Constants
 */

// Demand statuses with display configuration
export const DEMAND_STATUS = {
  draft: {
    label: 'Draft',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    dotColor: 'bg-slate-400',
    hex: '#64748B',
  },
  outstanding: {
    label: 'Outstanding',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
    hex: '#DC2626',
  },
  partial: {
    label: 'Partial',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
    hex: '#D97706',
  },
  paid: {
    label: 'Paid',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    hex: '#059669',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-400',
    hex: '#9CA3AF',
  },
};

// Status tabs for DemandList
export const DEMAND_STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'partial', label: 'Partial' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
];

// Sort options for DemandList
export const DEMAND_SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Amount (High to Low)' },
  { value: 'amount_asc', label: 'Amount (Low to High)' },
  { value: 'balance_desc', label: 'Balance (High to Low)' },
];

// Discount type options
export const DISCOUNT_TYPES = [
  { value: 'flat', label: 'Rs.' },
  { value: 'percent', label: '%' },
];
