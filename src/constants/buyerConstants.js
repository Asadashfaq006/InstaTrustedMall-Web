/**
 * Module 4: Buyer Management Constants
 */

// Payment status display configuration
export const PAYMENT_STATUS = {
  paid: {
    label: 'Paid',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    hex: '#059669',
  },
  partial: {
    label: 'Partial',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
    hex: '#D97706',
  },
  outstanding: {
    label: 'Outstanding',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
    hex: '#DC2626',
  },
  none: {
    label: 'No Demands',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-500',
    borderColor: 'border-slate-200',
    dotColor: 'bg-slate-400',
    hex: '#64748B',
  },
};

// Avatar fallback color cycle (8 colors)
export const AVATAR_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// Payment methods
export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: '💵' },
  { key: 'bank', label: 'Bank Transfer', icon: '🏦' },
  { key: 'cheque', label: 'Cheque', icon: '📝' },
  { key: 'online', label: 'Online', icon: '🌐' },
  { key: 'other', label: 'Other', icon: '📋' },
];

// Sort options for buyer directory
export const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'outstanding_desc', label: 'Outstanding (High to Low)' },
  { value: 'outstanding_asc', label: 'Outstanding (Low to High)' },
];

// Filter status tabs
export const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'partial', label: 'Partial' },
  { key: 'paid', label: 'Paid' },
  { key: 'none', label: 'No Demands' },
];
