import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Trash2, Package, Search } from 'lucide-react';
import { formatCurrency } from '@/utils/buyerHelpers';
import { calcLineItem } from '@/utils/demandCalculations';
import { cn } from '@/lib/utils';
import { getDemandColumns, hasColumn } from '@/constants/demandColumns';

/**
 * DemandItemsTable
 *
 * Full keyboard-navigable demand items table with inline product search.
 * Arrow keys, Enter, and Tab navigate between editable cells.
 */
export default function DemandItemsTable({
  items = [],
  isViewOnly = false,
  packInfo = {},
  stockLevels = {},
  businessType = 'retail',
  updateItem,
  removeItem,
  products = [],
  onAddProduct,
  getDefaultPrice,
  buyerPriceHistory = {},
}) {
  const columns = getDemandColumns(businessType);
  const removeColWidth = '28px';

  // Build list of editable column keys in order for navigation
  const editableColKeys = useMemo(() =>
    columns.filter(c => c.editable).map(c => c.key),
    [columns]
  );

  // Cell refs: cellRefs[rowIndex][colKey] = ref to the input element
  const cellRefs = useRef({});
  const addRowRef = useRef(null); // ref to the add-product row's input opener

  const setCellRef = useCallback((rowIndex, colKey, el) => {
    if (!cellRefs.current[rowIndex]) cellRefs.current[rowIndex] = {};
    cellRefs.current[rowIndex][colKey] = el;
  }, []);

  // Focus a specific cell
  const focusCell = useCallback((rowIndex, colKey) => {
    const el = cellRefs.current[rowIndex]?.[colKey];
    if (el) {
      el.focus();
      if (el.select) el.select();
      return true;
    }
    return false;
  }, []);

  // Navigate from a cell in a given direction
  const navigate = useCallback((rowIndex, colKey, direction) => {
    const colIdx = editableColKeys.indexOf(colKey);
    if (colIdx === -1) return;

    let nextRow = rowIndex;
    let nextColIdx = colIdx;

    switch (direction) {
      case 'up':
        nextRow = rowIndex - 1;
        break;
      case 'down':
        nextRow = rowIndex + 1;
        break;
      case 'left':
        nextColIdx = colIdx - 1;
        break;
      case 'right':
        nextColIdx = colIdx + 1;
        break;
      case 'next-row': // Enter: move down to same column
        nextRow = rowIndex + 1;
        break;
    }

    // Clamp column
    if (nextColIdx < 0) nextColIdx = 0;
    if (nextColIdx >= editableColKeys.length) nextColIdx = editableColKeys.length - 1;

    const nextColKey = editableColKeys[nextColIdx];

    // If nextRow is within items range, focus that cell
    if (nextRow >= 0 && nextRow < items.length) {
      focusCell(nextRow, nextColKey);
    } else if (nextRow >= items.length && !isViewOnly && onAddProduct) {
      // Focus the add-product row
      if (addRowRef.current) addRowRef.current.activate();
    }
  }, [editableColKeys, items.length, focusCell, isViewOnly, onAddProduct]);

  // Cell keyboard handler factory
  const makeCellKeyHandler = useCallback((rowIndex, colKey) => (e) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigate(rowIndex, colKey, 'up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigate(rowIndex, colKey, 'down');
        break;
      case 'ArrowLeft':
        // Only navigate if cursor is at start of input
        if (e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
          e.preventDefault();
          navigate(rowIndex, colKey, 'left');
        }
        break;
      case 'ArrowRight':
        // Only navigate if cursor is at end of input
        if (e.target.selectionStart === e.target.value?.length) {
          e.preventDefault();
          navigate(rowIndex, colKey, 'right');
        }
        break;
      case 'Enter':
        e.preventDefault();
        navigate(rowIndex, colKey, 'next-row');
        break;
    }
  }, [navigate]);

  // After product is added, focus the qty cell of the new row
  const handleAddProduct = useCallback((product) => {
    onAddProduct(product);
    // The new row will be at index = items.length (current length, since items hasn't updated yet)
    // Wait for state update + render, then focus qty
    const newRowIndex = items.length;
    // Check if product already exists (qty will be incremented on existing row)
    const existingIdx = items.findIndex(it => it.product_id === product.id);
    const targetRow = existingIdx >= 0 ? existingIdx : newRowIndex;
    const targetCol = editableColKeys.includes('qty') ? 'qty' : editableColKeys[0];
    setTimeout(() => focusCell(targetRow, targetCol), 80);
  }, [onAddProduct, items, editableColKeys, focusCell]);

  return (
    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>{[
        ...columns.map((c) => c.width),
        ...(!isViewOnly ? [removeColWidth] : []),
      ].map((w, i) => w ? <col key={i} style={{ width: w }} /> : <col key={i} />)}</colgroup>

      <thead className="sticky top-0 z-10">
        <tr className="bg-gray-100 border-b border-border text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
          {columns.map((c) => (
            <th
              key={c.key}
              className={cn(
                'px-2 py-2 border-r border-border leading-tight whitespace-nowrap overflow-hidden',
                c.align === 'right' && 'text-right',
                c.align === 'center' && 'text-center',
                c.align === 'left' && 'text-left',
              )}
            >
              {c.label}
            </th>
          ))}
          {!isViewOnly && <th className="w-7" />}
        </tr>
      </thead>

      <tbody>
        {items.map((item, index) => {
          const gross = item.qty * item.price;
          const { discountAmount, lineTotal } = calcLineItem(item);
          const itemPack = packInfo[item.product_id];
          const packQty = (itemPack && itemPack.packQuantity > 1) ? itemPack.packQuantity : 1;
          const stockPacks = stockLevels[item.product_id] != null
            ? stockLevels[item.product_id]
            : null;
          const availableUnits = stockPacks != null ? Math.round(stockPacks * packQty * 1000) / 1000 : null;
          const isOverStock = availableUnits != null && item.qty > availableUnits;
          const packLabel =
            itemPack && itemPack.packQuantity > 1
              ? `${itemPack.packQuantity}×1`
              : '1×1';

          return (
            <tr
              key={item.id || index}
              className={cn(
                'border-b border-border/50 hover:bg-blue-50/30 transition-colors h-8',
                isOverStock && 'bg-red-50/50',
              )}
            >
              {columns.map((c) => {
                switch (c.key) {
                  case 'id':
                    return (
                      <td key={c.key} className="px-2 py-0 text-text-muted text-xs font-mono border-r border-border/30 overflow-hidden whitespace-nowrap">
                        <span className="block truncate" title={String(item.product_id)}>{item.product_id}</span>
                      </td>
                    );

                  case 'name':
                    return (
                      <td key={c.key} className="px-2 py-0 border-r border-border/30 overflow-hidden">
                        <p className="font-medium text-text-primary truncate text-xs leading-snug" title={item.product_name}>
                          {item.product_name}
                        </p>
                        {isOverStock && (
                          <p className="text-[10px] text-red-600 font-medium leading-none truncate">Only {availableUnits} units left</p>
                        )}
                      </td>
                    );

                  case 'pack':
                    return (
                      <td key={c.key} className="px-1 py-0 text-center text-xs font-mono border-r border-border/30 overflow-hidden whitespace-nowrap">{packLabel}</td>
                    );

                  case 'rate':
                    return (
                      <td key={c.key} className="px-1 py-0 border-r border-border/30 bg-white overflow-hidden">
                        {!isViewOnly ? (
                          <Input
                            ref={(el) => setCellRef(index, 'rate', el)}
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) => updateItem(index, { ...item, price: parseFloat(e.target.value) || 0 })}
                            onKeyDown={makeCellKeyHandler(index, 'rate')}
                            className="h-6 text-xs text-right px-1 border-0 shadow-none focus-visible:ring-1 w-full"
                          />
                        ) : (
                          <span className="block text-right font-mono text-xs px-1 truncate">{formatCurrency(item.price)}</span>
                        )}
                      </td>
                    );

                  case 'qty':
                    return (
                      <td key={c.key} className="px-1 py-0 border-r border-border/30 bg-white overflow-hidden">
                        {!isViewOnly ? (
                          <Input
                            ref={(el) => setCellRef(index, 'qty', el)}
                            type="number"
                            min="1"
                            value={item.qty === 0 ? '' : item.qty}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateItem(index, { ...item, qty: val === '' ? 0 : (parseInt(val) || 0) });
                            }}
                            onBlur={() => {
                              if (!item.qty || item.qty < 1) updateItem(index, { ...item, qty: 1 });
                            }}
                            onKeyDown={makeCellKeyHandler(index, 'qty')}
                            className="h-6 text-xs text-center px-1 border-0 shadow-none focus-visible:ring-1 w-full"
                          />
                        ) : (
                          <span className="block text-center font-mono text-xs truncate">{item.qty}</span>
                        )}
                      </td>
                    );

                  case 'gross':
                    return (
                      <td key={c.key} className="px-2 py-0 text-right font-mono text-xs border-r border-border/30 overflow-hidden whitespace-nowrap">{formatCurrency(gross)}</td>
                    );

                  case 'disc':
                    return (
                      <td key={c.key} className="px-1 py-0 border-r border-border/30 bg-white overflow-hidden">
                        {!isViewOnly ? (
                          <div className="flex items-center gap-0.5">
                            <Input
                              ref={(el) => setCellRef(index, 'disc', el)}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={item.discount_value || ''}
                              onChange={(e) =>
                                updateItem(index, {
                                  ...item,
                                  discount_value: parseFloat(e.target.value) || 0,
                                  discount_type: 'percent',
                                })
                              }
                              onKeyDown={makeCellKeyHandler(index, 'disc')}
                              placeholder="0"
                              className="h-6 text-xs text-center px-1 flex-1 min-w-0 border-0 shadow-none focus-visible:ring-1"
                            />
                            <span className="text-[10px] text-text-muted font-semibold shrink-0">%</span>
                          </div>
                        ) : (
                          <span className="block text-center font-mono text-xs truncate">
                            {item.discount_value > 0 ? `${item.discount_value}%` : '—'}
                          </span>
                        )}
                      </td>
                    );

                  case 'discVal':
                    return (
                      <td key={c.key} className="px-2 py-0 text-right font-mono text-xs border-r border-border/30 overflow-hidden whitespace-nowrap">
                        {discountAmount > 0 ? formatCurrency(discountAmount) : '—'}
                      </td>
                    );

                  case 'total':
                    return (
                      <td key={c.key} className="px-2 py-0 text-right font-semibold text-text-primary font-mono text-xs overflow-hidden whitespace-nowrap">
                        {formatCurrency(lineTotal)}
                      </td>
                    );

                  default:
                    return <td key={c.key} />;
                }
              })}

              {!isViewOnly && (
                <td className="px-0.5 py-0">
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              )}
            </tr>
          );
        })}

        {/* Empty "Add Product" row */}
        {!isViewOnly && onAddProduct && (
          <AddProductRow
            ref={addRowRef}
            columns={columns}
            products={products}
            packInfo={packInfo}
            stockLevels={stockLevels}
            buyerPriceHistory={buyerPriceHistory}
            getDefaultPrice={getDefaultPrice}
            onAddProduct={handleAddProduct}
          />
        )}
      </tbody>
    </table>
  );
}

/**
 * AddProductRow — An empty row at the bottom of the table.
 * Clicking/tabbing/Enter into the name cell opens an inline product search dropdown.
 */
const AddProductRow = React.forwardRef(function AddProductRow(
  { columns, products, packInfo, stockLevels, buyerPriceHistory, getDefaultPrice, onAddProduct },
  ref
) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const rowRef = useRef(null);
  const triggerRef = useRef(null);

  // Expose activate method so parent can focus this row
  React.useImperativeHandle(ref, () => ({
    activate: () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
  }));

  const filtered = useMemo(() => {
    if (!isOpen) return [];
    const q = search.toLowerCase().trim();
    const list = q
      ? products.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q)
        )
      : products;
    return list.slice(0, 12);
  }, [products, search, isOpen]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length, search]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        rowRef.current && !rowRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const selectProduct = useCallback((product) => {
    onAddProduct(product);
    setSearch('');
    setIsOpen(false);
  }, [onAddProduct]);

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault();
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        selectProduct(filtered[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;
    const el = dropdownRef.current.children[highlightIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, isOpen]);

  return (
    <>
      <tr ref={rowRef} className="border-b border-border/50 h-8 bg-gray-50/40 hover:bg-blue-50/20 transition-colors group">
        {columns.map((c) => {
          if (c.key === 'name') {
            return (
              <td key={c.key} className="px-1 py-0 border-r border-border/30 relative" colSpan={1}>
                {isOpen ? (
                  <div className="flex items-center gap-1">
                    <Search className="w-3 h-3 text-text-muted flex-shrink-0 ml-1" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type to search products..."
                      autoFocus
                      className="h-6 w-full text-xs bg-transparent outline-none placeholder:text-text-muted/60"
                    />
                  </div>
                ) : (
                  <button
                    ref={triggerRef}
                    onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
                    onFocus={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
                    onKeyDown={handleKeyDown}
                    className="w-full h-6 text-left text-xs text-text-muted/50 px-2 flex items-center gap-1.5 cursor-text"
                    tabIndex={0}
                  >
                    <Search className="w-3 h-3" />
                    <span>Tab to add product...</span>
                  </button>
                )}
              </td>
            );
          }
          return (
            <td key={c.key} className="px-1 py-0 border-r border-border/30">
              <span className="block h-6" />
            </td>
          );
        })}
        <td className="px-0.5 py-0"><span className="block h-6" /></td>
      </tr>

      {isOpen && filtered.length > 0 && (
        <tr>
          <td colSpan={columns.length + 1} className="p-0 relative">
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-0 z-50 bg-white rounded-b-lg border border-t-0 border-border shadow-lg max-h-[280px] overflow-y-auto"
            >
              {filtered.map((p, i) => {
                const basePrice = getDefaultPrice ? getDefaultPrice(p) : 0;
                const pPack = packInfo[p.id];
                const displayPrice = (pPack && pPack.unitPrice > 0) ? pPack.unitPrice : basePrice;
                const stock = stockLevels[p.id];
                const buyerHistory = buyerPriceHistory[p.id];
                const hasBuyerPrice = buyerHistory && buyerHistory.price > 0;
                const pPackQty = (pPack && pPack.packQuantity > 1) ? pPack.packQuantity : 1;
                const stockUnits = stock != null ? Math.round(stock * pPackQty * 1000) / 1000 : null;

                return (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 transition-colors text-left',
                      i === highlightIndex ? 'bg-accent/10' : 'hover:bg-gray-50',
                    )}
                  >
                    <Package className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-text-primary truncate">{p.name}</p>
                        {pPack && pPack.packQuantity > 1 && (
                          <span className="shrink-0 text-[9px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                            {pPack.packQuantity}×1
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted">
                        {p.sku && <span className="font-mono">{p.sku}</span>}
                        {p.category && <span className="ml-2">{p.category}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {hasBuyerPrice ? (
                        <>
                          <p className="text-xs font-medium text-emerald-700">{formatCurrency(buyerHistory.price)}</p>
                          <p className="text-[9px] text-emerald-600 font-medium">Last price</p>
                        </>
                      ) : displayPrice > 0 ? (
                        <p className="text-xs font-medium text-text-primary">{formatCurrency(displayPrice)}</p>
                      ) : null}
                      {stockUnits != null && (
                        <p className={cn('text-[10px]', stockUnits <= 0 ? 'text-red-500' : 'text-text-muted')}>
                          Stock: {stockUnits}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});
