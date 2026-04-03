/**
 * demandColumns.js
 *
 * Returns the column configuration for the DemandItemsTable
 * based on the business type. Each business type can have
 * different columns, labels, and visibility.
 */

/**
 * Default columns shared by all business types.
 * Each entry: { key, label, shortLabel, width, align, editable, type }
 *   key        — internal id used in colgroup / row rendering
 *   label      — full header label
 *   shortLabel — optional abbreviated header (for two-line headers)
 *   width      — CSS width string; null means flex/remaining
 *   align      — 'left' | 'center' | 'right'
 *   editable   — boolean (input vs readonly)
 *   type       — 'id' | 'text' | 'currency' | 'number' | 'computed' | 'action'
 */
const BASE_COLUMNS = [
  { key: 'id',        label: 'ID',         width: '50px',  align: 'left',   editable: false, type: 'id' },
  { key: 'name',      label: 'Name',       width: null,    align: 'left',   editable: false, type: 'text' },
  { key: 'pack',      label: 'Pack',       width: '60px',  align: 'center', editable: false, type: 'text' },
  { key: 'rate',      label: 'Sale Rate',  width: '90px',  align: 'right',  editable: true,  type: 'currency' },
  { key: 'qty',       label: 'Units',        width: '60px',  align: 'center', editable: true,  type: 'number' },
  { key: 'gross',     label: 'Gross Amt',  width: '90px',  align: 'right',  editable: false, type: 'computed' },
  { key: 'disc',      label: 'Disc %',     width: '75px',  align: 'center', editable: true,  type: 'number' },
  { key: 'discVal',   label: 'Disc Val',   width: '85px',  align: 'right',  editable: false, type: 'computed' },
  { key: 'total',     label: 'Line Total', width: '90px',  align: 'right',  editable: false, type: 'computed' },
];

const BUSINESS_TYPE_COLUMNS = {
  pharmacy: [
    { key: 'id',        label: 'ID',          width: '44px',  align: 'left',   editable: false, type: 'id' },
    { key: 'name',      label: 'Medicine',     width: null,    align: 'left',   editable: false, type: 'text' },
    { key: 'pack',      label: 'Pack',         width: '56px',  align: 'center', editable: false, type: 'text' },
    { key: 'rate',      label: 'MRP',          width: '80px',  align: 'right',  editable: true,  type: 'currency' },
    { key: 'qty',       label: 'Units',          width: '54px',  align: 'center', editable: true,  type: 'number' },
    { key: 'gross',     label: 'Gross',        width: '84px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'disc',      label: 'Disc %',       width: '70px',  align: 'center', editable: true,  type: 'number' },
    { key: 'discVal',   label: 'Disc Val',     width: '80px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'total',     label: 'Total',        width: '86px',  align: 'right',  editable: false, type: 'computed' },
  ],

  tailor: [
    { key: 'id',        label: 'ID',            width: '44px',  align: 'left',   editable: false, type: 'id' },
    { key: 'name',      label: 'Item / Fabric',  width: null,    align: 'left',   editable: false, type: 'text' },
    { key: 'rate',      label: 'Rate',           width: '90px',  align: 'right',  editable: true,  type: 'currency' },
    { key: 'qty',       label: 'Units',            width: '54px',  align: 'center', editable: true,  type: 'number' },
    { key: 'gross',     label: 'Gross',          width: '86px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'disc',      label: 'Disc %',         width: '70px',  align: 'center', editable: true,  type: 'number' },
    { key: 'discVal',   label: 'Disc Val',       width: '80px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'total',     label: 'Total',          width: '86px',  align: 'right',  editable: false, type: 'computed' },
  ],

  restaurant: [
    { key: 'id',        label: '#',             width: '36px',  align: 'left',   editable: false, type: 'id' },
    { key: 'name',      label: 'Dish',          width: null,    align: 'left',   editable: false, type: 'text' },
    { key: 'rate',      label: 'Price',         width: '80px',  align: 'right',  editable: true,  type: 'currency' },
    { key: 'qty',       label: 'Units',           width: '50px',  align: 'center', editable: true,  type: 'number' },
    { key: 'gross',     label: 'Subtotal',      width: '90px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'disc',      label: 'Disc %',        width: '70px',  align: 'center', editable: true,  type: 'number' },
    { key: 'discVal',   label: 'Disc Val',      width: '80px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'total',     label: 'Total',         width: '86px',  align: 'right',  editable: false, type: 'computed' },
  ],

  wholesale: [
    { key: 'id',        label: 'ID',            width: '50px',  align: 'left',   editable: false, type: 'id' },
    { key: 'name',      label: 'Product',       width: null,    align: 'left',   editable: false, type: 'text' },
    { key: 'pack',      label: 'Pack',          width: '64px',  align: 'center', editable: false, type: 'text' },
    { key: 'rate',      label: 'Bulk Rate',     width: '90px',  align: 'right',  editable: true,  type: 'currency' },
    { key: 'qty',       label: 'Units',           width: '60px',  align: 'center', editable: true,  type: 'number' },
    { key: 'gross',     label: 'Gross',         width: '90px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'disc',      label: 'Disc %',        width: '75px',  align: 'center', editable: true,  type: 'number' },
    { key: 'discVal',   label: 'Disc Val',      width: '85px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'total',     label: 'Line Total',    width: '90px',  align: 'right',  editable: false, type: 'computed' },
  ],

  electronics: [
    { key: 'id',        label: 'ID',            width: '50px',  align: 'left',   editable: false, type: 'id' },
    { key: 'name',      label: 'Product',       width: null,    align: 'left',   editable: false, type: 'text' },
    { key: 'pack',      label: 'Pack',          width: '60px',  align: 'center', editable: false, type: 'text' },
    { key: 'rate',      label: 'Price',         width: '90px',  align: 'right',  editable: true,  type: 'currency' },
    { key: 'qty',       label: 'Units',           width: '56px',  align: 'center', editable: true,  type: 'number' },
    { key: 'gross',     label: 'Gross',         width: '90px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'disc',      label: 'Disc %',        width: '70px',  align: 'center', editable: true,  type: 'number' },
    { key: 'discVal',   label: 'Disc Val',      width: '80px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'total',     label: 'Total',         width: '90px',  align: 'right',  editable: false, type: 'computed' },
  ],

  clothes: [
    { key: 'id',        label: 'ID',            width: '44px',  align: 'left',   editable: false, type: 'id' },
    { key: 'name',      label: 'Item',          width: null,    align: 'left',   editable: false, type: 'text' },
    { key: 'pack',      label: 'Pack',          width: '56px',  align: 'center', editable: false, type: 'text' },
    { key: 'rate',      label: 'Price',         width: '84px',  align: 'right',  editable: true,  type: 'currency' },
    { key: 'qty',       label: 'Units',           width: '54px',  align: 'center', editable: true,  type: 'number' },
    { key: 'gross',     label: 'Gross',         width: '84px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'disc',      label: 'Disc %',        width: '70px',  align: 'center', editable: true,  type: 'number' },
    { key: 'discVal',   label: 'Disc Val',      width: '80px',  align: 'right',  editable: false, type: 'computed' },
    { key: 'total',     label: 'Total',         width: '86px',  align: 'right',  editable: false, type: 'computed' },
  ],
};

/**
 * Get demand table columns for a given business type.
 * @param {string} businessType - One of: retail, wholesale, pharmacy, restaurant, warehouse, electronics, clothes, tailor, custom
 * @returns {Array} Column config array
 */
export function getDemandColumns(businessType) {
  return BUSINESS_TYPE_COLUMNS[businessType] || BASE_COLUMNS;
}

/**
 * Convenience: check if a given column key is active for a business type.
 */
export function hasColumn(businessType, key) {
  const cols = getDemandColumns(businessType);
  return cols.some((c) => c.key === key);
}
