import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowUpDown, ArrowUp, ArrowDown, GripVertical,
  MoreHorizontal, Image as ImageIcon, ChevronDown,
  ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import useProductStore from '@/stores/productStore';
import { localFileUrl, cn } from '@/lib/utils';
import useFilterStore from '@/stores/filterStore';
import useStockStore from '@/stores/stockStore';
import StockIndicator from '@/components/stock/StockIndicator';
import StockAdjustModal from '@/components/stock/StockAdjustModal';

// ── Inline Cell Editor ───────────────────────────────────────────────
function InlineCellEditor({ value, type, dropdownOptions, onSave, onCancel }) {
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onSave(editValue);
    }
  };

  if (type === 'dropdown') {
    let options = [];
    try {
      options = typeof dropdownOptions === 'string' ? JSON.parse(dropdownOptions) : dropdownOptions || [];
    } catch { options = []; }

    return (
      <select
        ref={inputRef}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          onSave(e.target.value);
        }}
        onBlur={() => onSave(editValue)}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2 py-1 text-sm border-2 border-accent rounded bg-white focus:outline-none"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-center h-full">
        <Checkbox
          checked={editValue === 'true' || editValue === '1'}
          onCheckedChange={(checked) => onSave(checked ? 'true' : 'false')}
        />
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type === 'number' || type === 'currency' ? 'number' : 'text'}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => onSave(editValue)}
      onKeyDown={handleKeyDown}
      step={type === 'currency' ? '0.01' : type === 'number' ? 'any' : undefined}
      className="w-full h-full px-2 py-1 text-sm border-2 border-accent rounded bg-white focus:outline-none"
    />
  );
}

// ── Cell Renderer ────────────────────────────────────────────────────
function CellValue({ value, type, column }) {
  if (!value && value !== 0) return <span className="text-text-muted">—</span>;

  switch (type) {
    case 'currency':
      return <span className="font-mono">{parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    case 'number':
      return <span className="font-mono">{value}</span>;
    case 'boolean':
      return (
        <span className={`inline-block w-2 h-2 rounded-full ${value === 'true' || value === '1' ? 'bg-green-500' : 'bg-gray-300'}`} />
      );
    case 'formula':
      return (
        <span className="font-mono text-purple-600 italic flex items-center gap-1">
          <span className="text-[10px] font-semibold text-purple-400 not-italic">ƒ</span>
          {value}
        </span>
      );
    case 'dropdown':
      return <Badge variant="secondary">{value}</Badge>;
    case 'date': {
      if (column?.name === 'Expiry Date' && value) {
        const d = new Date(value);
        const now = new Date();
        const isExpired = d < now;
        const isExpiringSoon = !isExpired && (d - now) < 30 * 86400000;
        return (
          <span className={`flex items-center gap-1 ${
            isExpired ? 'text-red-600 font-medium' :
            isExpiringSoon ? 'text-amber-600 font-medium' : ''
          }`}>
            {isExpired && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
            {isExpiringSoon && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
            {value}
          </span>
        );
      }
      return <span>{value}</span>;
    }
    default:
      return <span>{String(value)}</span>;
  }
}

// ── Sortable Column Header ──────────────────────────────────────────
function SortableColumnHeader({ column, onSort, sortColumn, sortDirection, onContextMenu }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSorted = sortColumn === column.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider select-none group w-[150px] shrink-0 border-r border-border"
      onContextMenu={(e) => onContextMenu?.(e, column)}
    >
      <button {...attributes} {...listeners} className="cursor-grab opacity-0 group-hover:opacity-50 hover:!opacity-100 -ml-1">
        <GripVertical className="w-3 h-3" />
      </button>
      <button
        className="flex items-center gap-1 flex-1 text-left hover:text-text-primary transition-colors truncate"
        onClick={() => onSort(column.id)}
      >
        <span className="truncate">{column.name}</span>
        {isSorted ? (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-accent" /> : <ArrowDown className="w-3 h-3 text-accent" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
        )}
      </button>
      {column.type === 'formula' && (
        <span className="text-[9px] text-purple-500 font-normal">ƒx</span>
      )}
    </div>
  );
}

// ── Main Product Grid ───────────────────────────────────────────────
export default function ProductGrid({ products, columns, onRowClick, onOpenHistory }) {
  const { updateCell, toggleSelect, selectAll, clearSelection, selectedProducts, editingCell, setEditingCell, clearEditingCell, reorderColumns } = useProductStore();
  const { toggleSort, sortColumn, sortDirection } = useFilterStore();
  const stockLevels = useStockStore((s) => s.stockLevels);
  const parentRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Stock adjust modal
  const [stockAdjustOpen, setStockAdjustOpen] = useState(false);
  const [stockAdjustProduct, setStockAdjustProduct] = useState(null);
  const [stockAdjustTab, setStockAdjustTab] = useState('in');

  // Pack info: find pack columns
  const packQtyCol = columns.find((c) => c.name === 'Pack Quantity' && c.type === 'number');

  const getPackQty = (product) => {
    if (!packQtyCol || !product.values) return 0;
    return parseFloat(product.values[packQtyCol.id]) || 0;
  };

  const openStockAdjust = (product, tab = 'in') => {
    setStockAdjustProduct(product);
    setStockAdjustTab(tab);
    setStockAdjustOpen(true);
  };

  const getStock = (productId) => {
    return stockLevels.find(s => s.productId === productId) || null;
  };

  const visibleColumns = columns.filter((c) => c.is_visible);

  // Virtual scrolling for rows
  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleColumns.findIndex((c) => c.id === active.id);
    const newIndex = visibleColumns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(visibleColumns, oldIndex, newIndex);
    const businessId = products[0]?.business_id;
    if (businessId) {
      const allColumnIds = newOrder.map((c) => c.id);
      // Add hidden columns at the end
      const hiddenIds = columns.filter((c) => !c.is_visible).map((c) => c.id);
      reorderColumns(businessId, [...allColumnIds, ...hiddenIds]);
    }
  }, [visibleColumns, columns, products, reorderColumns]);

  const handleCellDoubleClick = useCallback((productId, column) => {
    if (column.type === 'formula') return; // Can't edit formula cells
    setEditingCell({ productId, columnId: column.id });
  }, [setEditingCell]);

  const handleCellSave = useCallback(async (productId, columnId, value) => {
    await updateCell(productId, columnId, value);
    clearEditingCell();
  }, [updateCell, clearEditingCell]);

  const handleColumnContextMenu = useCallback((e, column) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, column });
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu) {
      const handler = () => setContextMenu(null);
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [contextMenu]);

  const allSelected = products.length > 0 && selectedProducts.length === products.length;
  const someSelected = selectedProducts.length > 0 && !allSelected;

  return (
    <div className="flex flex-col h-full border border-border rounded-xl bg-white overflow-hidden">
      {/* Grid */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {/* Header Row */}
        <div className="sticky top-0 z-10 flex bg-gray-50 border-b border-border min-w-max">
          {/* Checkbox column */}
          <div className="flex items-center justify-center w-[44px] px-2 py-2 border-r border-border shrink-0">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => allSelected ? clearSelection() : selectAll()}
            />
          </div>
          {/* Row number */}
          <div className="flex items-center w-[44px] px-2 py-2 text-xs font-semibold text-text-muted border-r border-border shrink-0">
            #
          </div>
          {/* Image column */}
          <div className="flex items-center w-[50px] px-2 py-2 text-xs text-text-muted border-r border-border shrink-0">
            <ImageIcon className="w-3 h-3" />
          </div>
          {/* Name column (fixed, not draggable) */}
          <div
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[200px] shrink-0 border-r border-border cursor-pointer hover:text-text-primary"
            onClick={() => toggleSort('name')}
          >
            <span>Name</span>
            {sortColumn === 'name' ? (
              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-accent" /> : <ArrowDown className="w-3 h-3 text-accent" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </div>
          {/* Stock column */}
          <div className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[100px] shrink-0 border-r border-border">
            <span>Stock (Items)</span>
          </div>
          {/* Dynamic columns (sortable) */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {visibleColumns.map((col) => (
                <SortableColumnHeader
                  key={col.id}
                  column={col}
                  onSort={toggleSort}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onContextMenu={handleColumnContextMenu}
                />
              ))}
            </SortableContext>
          </DndContext>
          {/* Actions column */}
          <div className="flex items-center w-[50px] px-2 py-2 text-xs text-text-muted border-r border-border shrink-0">
            <MoreHorizontal className="w-3 h-3" />
          </div>
        </div>

        {/* Virtual Rows */}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }} className="min-w-max">
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const product = products[virtualRow.index];
            const isSelected = selectedProducts.includes(product.id);

            return (
              <div
                key={product.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-center border-b border-border/50 hover:bg-accent-light/30 transition-colors ${isSelected ? 'bg-accent-light/50' : ''}`}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-center w-[44px] px-2 shrink-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(product.id)}
                  />
                </div>
                {/* Row number */}
                <div className="flex items-center w-[44px] px-2 text-xs text-text-muted shrink-0">
                  {virtualRow.index + 1}
                </div>
                {/* Image */}
                <div className="flex items-center justify-center w-[50px] px-1 shrink-0">
                  {product.image_path ? (
                    <img src={localFileUrl(product.image_path)} alt="" className="w-7 h-7 rounded object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  )}
                </div>
                {/* Name (clickable) */}
                <div
                  className="px-3 py-1 w-[200px] shrink-0 flex items-center gap-1.5 text-sm font-medium text-text-primary cursor-pointer hover:text-accent"
                  onClick={() => onRowClick?.(product)}
                >
                  <span className="truncate">{product.name || <span className="text-text-muted italic">Untitled</span>}</span>
                  {(() => {
                    const pq = getPackQty(product);
                    return pq > 1 ? (
                      <span className="shrink-0 text-[9px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full" title={`1 pack = ${pq} units`}>
                        1×{pq}
                      </span>
                    ) : null;
                  })()}
                </div>
                {/* Stock */}
                <div className="px-1 py-1 w-[100px] shrink-0 text-sm">
                  {(() => {
                    const stock = getStock(product.id);
                    return (
                      <StockIndicator
                        quantity={stock?.quantity ?? 0}
                        reorderAt={stock?.reorderAt ?? 0}
                        status={stock?.status}
                        onClick={() => openStockAdjust(product)}
                      />
                    );
                  })()}
                </div>
                {/* Dynamic columns */}
                {visibleColumns.map((col) => {
                  const isEditing = editingCell?.productId === product.id && editingCell?.columnId === col.id;
                  const cellValue = product.values?.[col.id] || '';
                  const isStockQtyCol = col.name === 'Stock Quantity' && col.type === 'number';

                  return (
                    <div
                      key={col.id}
                      className={cn(
                        'px-3 py-1 w-[150px] shrink-0 truncate text-sm border-r border-border/30',
                        col.type === 'formula' ? 'cursor-default bg-purple-50/30' : isStockQtyCol ? 'cursor-pointer hover:bg-blue-50' : 'cursor-cell'
                      )}
                      onDoubleClick={() => {
                        if (col.type === 'formula') return;
                        if (isStockQtyCol) { openStockAdjust(product); return; }
                        handleCellDoubleClick(product.id, col);
                      }}
                      onClick={() => {
                        if (isStockQtyCol) openStockAdjust(product);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onOpenHistory?.({ productId: product.id, columnId: col.id, columnName: col.name });
                      }}
                    >
                      {isEditing ? (
                        <InlineCellEditor
                          value={cellValue}
                          type={col.type}
                          dropdownOptions={col.dropdown_options}
                          onSave={(val) => handleCellSave(product.id, col.id, val)}
                          onCancel={clearEditingCell}
                        />
                      ) : (
                        <CellValue value={cellValue} type={col.type} column={col} />
                      )}
                    </div>
                  );
                })}
                {/* Actions */}
                <div className="flex items-center w-[50px] px-1 shrink-0">
                  <button
                    onClick={() => onRowClick?.(product)}
                    className="p-1 rounded hover:bg-gray-100 text-text-muted hover:text-text-primary"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ImageIcon className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-text-secondary mb-1">No products yet</p>
            <p className="text-sm">Add your first product to get started</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-border text-xs text-text-muted">
        <span>{products.length} product{products.length !== 1 ? 's' : ''}</span>
        {selectedProducts.length > 0 && (
          <span className="text-accent font-medium">{selectedProducts.length} selected</span>
        )}
        <span>{visibleColumns.length} column{visibleColumns.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Column context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] bg-white rounded-lg border border-border shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
            onClick={() => {
              toggleSort(contextMenu.column.id);
              setContextMenu(null);
            }}
          >
            Sort ascending
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
            onClick={() => {
              toggleSort(contextMenu.column.id);
              toggleSort(contextMenu.column.id);
              setContextMenu(null);
            }}
          >
            Sort descending
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
            onClick={() => setContextMenu(null)}
          >
            Hide column
          </button>
        </div>
      )}

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        open={stockAdjustOpen}
        onOpenChange={setStockAdjustOpen}
        product={stockAdjustProduct}
        initialTab={stockAdjustTab}
      />
    </div>
  );
}
