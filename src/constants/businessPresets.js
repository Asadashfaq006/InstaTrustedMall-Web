export const BUSINESS_TYPES = [
  {
    key: 'retail',
    icon: '🛒',
    label: 'Retail / General Store',
    description: 'Products, prices, stock quantity, categories',
    color: '#2E86AB',
  },
  {
    key: 'wholesale',
    icon: '🏭',
    label: 'Wholesale',
    description: 'Bulk pricing, min order qty, trade clients',
    color: '#1E3A5F',
  },
  {
    key: 'pharmacy',
    icon: '💊',
    label: 'Pharmacy',
    description: 'Batch numbers, expiry dates, generic names',
    color: '#27AE60',
  },
  {
    key: 'restaurant',
    icon: '🍽',
    label: 'Restaurant / Food',
    description: 'Menu items, portions, daily availability',
    color: '#E67E22',
  },
  {
    key: 'warehouse',
    icon: '🏗',
    label: 'Warehouse / Logistics',
    description: 'Location codes, weight, volume tracking',
    color: '#8B5CF6',
  },
  {
    key: 'electronics',
    icon: '💻',
    label: 'Electronics / Repair',
    description: 'Model numbers, brands, warranty tracking',
    color: '#0EA5E9',
  },
  {
    key: 'clothes',
    icon: '👗',
    label: 'Clothes / Fashion',
    description: 'Sizes, colors, brands, seasonal stock',
    color: '#EC4899',
  },
  {
    key: 'tailor',
    icon: '🧵',
    label: 'Tailor / Stitching',
    description: 'Fabric types, measurements, due dates',
    color: '#EAB308',
  },
  {
    key: 'custom',
    icon: '⚙️',
    label: 'Custom (Blank)',
    description: 'Start completely from scratch',
    color: '#64748B',
  },
];

export const COLUMN_PRESETS = {
  retail: [
    { name: 'Purchase Price', type: 'currency', required: true },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Retail Price', type: 'formula', required: false, formula: '{Purchase Price} * (1 - {Company Discount %} / 100)' },
    { name: 'Sale Price', type: 'currency', required: true },
    { name: 'Category', type: 'dropdown', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
    { name: 'Stock Value', type: 'formula', required: false, formula: '{Sale Price} * {Stock Quantity}' },
  ],
  wholesale: [
    { name: 'Purchase Price', type: 'currency', required: true },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Retail Price', type: 'formula', required: false, formula: '{Purchase Price} * (1 - {Company Discount %} / 100)' },
    { name: 'Bulk Sale Price', type: 'currency', required: true },
    { name: 'Unit', type: 'dropdown', required: false },
    { name: 'Min Order Qty', type: 'number', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
  ],
  pharmacy: [
    { name: 'Generic Name', type: 'text', required: false },
    { name: 'Batch Number', type: 'text', required: false },
    { name: 'Expiry Date', type: 'date', required: false },
    { name: 'Purchase Price', type: 'currency', required: true },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'MRP', type: 'currency', required: true },
    { name: 'Rack Location', type: 'text', required: false },
    { name: 'Profit', type: 'formula', required: false, formula: '{MRP} - {Purchase Price}' },
  ],
  restaurant: [
    { name: 'Category', type: 'dropdown', required: false },
    { name: 'Portion Size', type: 'text', required: false },
    { name: 'Recipe Cost', type: 'currency', required: false },
    { name: 'Selling Price', type: 'currency', required: true },
    { name: 'Available Today', type: 'checkbox', required: false },
    { name: 'Prep Time (mins)', type: 'number', required: false },
    { name: 'Margin %', type: 'formula', required: false, formula: '({Selling Price} - {Recipe Cost}) / {Selling Price} * 100' },
  ],
  warehouse: [
    { name: 'Location Code', type: 'text', required: false },
    { name: 'Weight (kg)', type: 'number', required: false },
    { name: 'Volume (cbm)', type: 'number', required: false },
    { name: 'Purchase Price', type: 'currency', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
  ],
  electronics: [
    { name: 'Model Number', type: 'text', required: false },
    { name: 'Brand', type: 'text', required: false },
    { name: 'Purchase Price', type: 'currency', required: true },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Retail Price', type: 'formula', required: false, formula: '{Purchase Price} * (1 - {Company Discount %} / 100)' },
    { name: 'Sale Price', type: 'currency', required: true },
    { name: 'Warranty (months)', type: 'number', required: false },
    { name: 'Profit', type: 'formula', required: false, formula: '{Sale Price} - {Purchase Price}' },
  ],
  clothes: [
    { name: 'Brand', type: 'text', required: false },
    { name: 'Size', type: 'dropdown', required: false },
    { name: 'Color', type: 'dropdown', required: false },
    { name: 'Material', type: 'text', required: false },
    { name: 'Purchase Price', type: 'currency', required: true },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Retail Price', type: 'formula', required: false, formula: '{Purchase Price} * (1 - {Company Discount %} / 100)' },
    { name: 'Sale Price', type: 'currency', required: true },
  ],
  tailor: [
    { name: 'Fabric Type', type: 'text', required: false },
    { name: 'Measurement Set', type: 'text', required: false },
    { name: 'Stitching Cost', type: 'currency', required: false },
    { name: 'Material Cost', type: 'currency', required: false },
    { name: 'Sale Price', type: 'currency', required: true },
    { name: 'Due Date', type: 'date', required: false },
    { name: 'Profit', type: 'formula', required: false, formula: '{Sale Price} - {Stitching Cost} - {Material Cost}' },
  ],
  custom: [],
};

export const CURRENCIES = [
  { code: 'PKR', symbol: '₨', label: 'PKR (₨)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ)' },
  { code: 'SAR', symbol: '﷼', label: 'SAR (﷼)' },
];

export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export function getBusinessTypeInfo(typeKey) {
  return BUSINESS_TYPES.find((t) => t.key === typeKey) || BUSINESS_TYPES[6];
}
