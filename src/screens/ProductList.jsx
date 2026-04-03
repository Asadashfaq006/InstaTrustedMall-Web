import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PermissionGate from '@/components/auth/PermissionGate';
import {
  Plus, Search, SlidersHorizontal, Download, Upload,
  Columns3, Trash2, X, Save, Filter, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useProductStore from '@/stores/productStore';
import useFilterStore from '@/stores/filterStore';
import useStockStore from '@/stores/stockStore';
import useScannerStore from '@/stores/scannerStore';
import ProductGrid from '@/components/products/ProductGrid';
import ProductModal from '@/components/products/ProductModal';
import AddProductModal from '@/components/products/AddProductModal';
import ProductDetailPanel from '@/components/products/ProductDetailPanel';
import ColumnManager from '@/components/products/ColumnManager';
import CellHistoryPopover from '@/components/products/CellHistoryPopover';
import ImportWizard from '@/components/products/ImportWizard';
import ScanModeButton from '@/components/scanner/ScanModeButton';

function ProductListInner() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const searchParams = useSearchParams();
  const { activeBusiness } = useBusinessStore();
  const {
    products, columns, categories, isLoading,
    loadProducts, loadColumns, loadCategories, seedColumns,
    selectedProducts, clearSelection, softDeleteBulk,
  } = useProductStore();
  const {
    searchQuery, setSearchQuery, activeFilters, addFilter,
    removeFilter, clearFilters, getFilteredProducts,
    savedFilters, loadSavedFilters, saveFilter, applySavedFilter,
    deleteSavedFilter,
  } = useFilterStore();
  const { toast } = useToast();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [scanFlashProductId, setScanFlashProductId] = useState(null);

  // Handle scan results in product list context
  const handleProductScan = useCallback((code, result) => {
    if (result?.found && result.product) {
      // Found — highlight product row + open detail
      setSelectedProduct(result.product);
      setScanFlashProductId(result.product.id);
      setTimeout(() => setScanFlashProductId(null), 1500);
      toast({ title: `\u2713 ${result.product.name}`, description: 'Product found' });
    } else {
      // Not found — offer to create
      toast({
        title: 'Code not found',
        description: `Create a new product with code "${code}"?`,
        action: (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              setShowAddModal(true);
              // The barcode will be handled via searchParams below
            }}
          >
            + Create
          </Button>
        ),
      });
    }
  }, [toast]);

  // Check URL params for scanner-initiated actions
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    const createWithBarcode = searchParams.get('createWithBarcode');
    if (highlight) {
      const product = products.find(p => p.id === parseInt(highlight));
      if (product) {
        setSelectedProduct(product);
        setScanFlashProductId(product.id);
        setTimeout(() => setScanFlashProductId(null), 1500);
      }
    }
    if (createWithBarcode) {
      setShowAddModal(true);
    }
  }, [searchParams, products]);

  // Load data when business changes
  useEffect(() => {
    if (activeBusiness) {
      const init = async () => {
        await seedColumns(activeBusiness.id, activeBusiness.type);
        await loadColumns(activeBusiness.id);
        await loadProducts(activeBusiness.id);
        await loadCategories(activeBusiness.id);
        await loadSavedFilters(activeBusiness.id);
        // M3: Fetch stock levels for the product grid stock column
        useStockStore.getState().fetchStockLevels(activeBusiness.id);
        useStockStore.getState().fetchLowStockCount(activeBusiness.id);
      };
      init();
    }
  }, [activeBusiness?.id]);

  const filteredProducts = getFilteredProducts(products, columns);

  const handleRowClick = useCallback((product) => {
    setSelectedProduct(product);
  }, []);

  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  }, []);

  const handleAddProduct = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleExportCSV = async () => {
    try {
      const result = await window.electronAPI.products.exportCSV({ businessId: activeBusiness.id });
      if (result.success) {
        // Save to clipboard or file
        await navigator.clipboard.writeText(result.data);
        toast({ title: 'CSV copied to clipboard', description: `${products.length} products exported` });
      }
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    const ok = await softDeleteBulk(selectedProducts);
    if (ok) {
      toast({ title: `${selectedProducts.length} products moved to recycle bin` });
    }
  };

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) return;
    const result = await saveFilter(activeBusiness.id, saveFilterName);
    if (result && !result.error) {
      toast({ title: 'Filter saved' });
      setSaveFilterName('');
      setShowSaveFilter(false);
    }
  };

  // Quick filter for a column
  const handleAddQuickFilter = () => {
    addFilter({ columnId: 'name', operator: 'contains', value: '' });
    setShowFilterPanel(true);
  };

  if (!activeBusiness) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-text-secondary">No business selected</p>
          <p className="text-sm text-text-muted">Select or create a business first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-border space-y-3">
        {/* Row 1: Title + Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Products</h1>
            <p className="text-sm text-text-muted">
              {filteredProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setShowImport(true)}>
                  <Upload className="w-3.5 h-3.5 mr-2" /> Import CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="w-3.5 h-3.5 mr-2" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowColumnManager(true)}>
                  <Columns3 className="w-3.5 h-3.5 mr-2" /> Manage Columns
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/products/recycle-bin')}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Recycle Bin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PermissionGate permission="products:create">
              <Button variant="accent" size="sm" className="gap-1.5" onClick={handleAddProduct}>
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </PermissionGate>
            <ScanModeButton
              onScan={handleProductScan}
              context="products"
            />
          </div>
        </div>

        {/* Row 2: Search + Filter bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-9 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            variant={showFilterPanel ? 'accent-outline' : 'outline'}
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilters.length > 0 && (
              <Badge variant="accent" className="ml-1 h-4 min-w-[16px] px-1 text-[10px]">
                {activeFilters.length}
              </Badge>
            )}
          </Button>

          {/* Saved filters dropdown */}
          {savedFilters.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Save className="w-3.5 h-3.5" /> Saved
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Saved Filters</DropdownMenuLabel>
                {savedFilters.map((f) => (
                  <DropdownMenuItem key={f.id} onClick={() => applySavedFilter(f)}>
                    {f.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {(activeFilters.length > 0 || searchQuery) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-text-muted" onClick={() => { clearFilters(); setSearchQuery(''); }}>
              Clear all
            </Button>
          )}
        </div>

        {/* Filter panel */}
        {showFilterPanel && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            {activeFilters.map((filter, index) => (
              <FilterRow
                key={index}
                filter={filter}
                columns={columns}
                onChange={(updated) => {
                  const newFilters = [...activeFilters];
                  newFilters[index] = updated;
                  useFilterStore.setState({ activeFilters: newFilters });
                }}
                onRemove={() => removeFilter(index)}
              />
            ))}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleAddQuickFilter}>
                <Plus className="w-3 h-3" /> Add filter
              </Button>
              {activeFilters.length > 0 && (
                <>
                  {showSaveFilter ? (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Input
                        value={saveFilterName}
                        onChange={(e) => setSaveFilterName(e.target.value)}
                        placeholder="Filter name..."
                        className="h-7 text-xs w-32"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                      />
                      <Button size="sm" variant="accent" className="h-7 text-xs" onClick={handleSaveFilter}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSaveFilter(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs ml-auto" onClick={() => setShowSaveFilter(true)}>
                      <Save className="w-3 h-3" /> Save filter
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-3 bg-accent-light/50 rounded-xl px-4 py-2">
            <Badge variant="accent">{selectedProducts.length} selected</Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleBulkDelete}>
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Product Grid */}
        <div className="flex-1 overflow-hidden p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-text-muted">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading products...</p>
              </div>
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              columns={columns}
              onRowClick={handleRowClick}
              onOpenHistory={setShowHistory}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedProduct && (
          <ProductDetailPanel
            product={selectedProduct}
            columns={columns}
            onClose={() => setSelectedProduct(null)}
            onEdit={handleEditProduct}
            onOpenHistory={setShowHistory}
          />
        )}
      </div>

      {/* Modals */}
      <AddProductModal
        open={showAddModal}
        onOpenChange={(v) => {
          setShowAddModal(v);
          if (!v && activeBusiness) loadProducts(activeBusiness.id);
        }}
        businessId={activeBusiness?.id}
        columns={columns}
      />

      <ProductModal
        open={showProductModal}
        onOpenChange={(v) => {
          setShowProductModal(v);
          if (!v) {
            setEditingProduct(null);
            // Refresh products after create/edit
            if (activeBusiness) loadProducts(activeBusiness.id);
          }
        }}
        product={editingProduct}
        businessId={activeBusiness?.id}
        columns={columns}
      />

      <ColumnManager
        open={showColumnManager}
        onOpenChange={setShowColumnManager}
        businessId={activeBusiness?.id}
        columns={columns}
      />

      <CellHistoryPopover
        open={!!showHistory}
        onOpenChange={(v) => !v && setShowHistory(null)}
        data={showHistory}
      />

      <ImportWizard
        open={showImport}
        onOpenChange={setShowImport}
        businessId={activeBusiness?.id}
        columns={columns}
      />
    </div>
  );
}
export default function ProductList() {
  return (
    <React.Suspense fallback={null}>
      <ProductListInner />
    </React.Suspense>
  );
}
// ── Filter Row Component ────────────────────────────────────────────
function FilterRow({ filter, columns, onChange, onRemove }) {
  const allFilterColumns = [
    { id: 'name', name: 'Product Name', type: 'text' },
    { id: 'sku', name: 'SKU', type: 'text' },
    { id: 'barcode', name: 'Barcode', type: 'text' },
    { id: 'category', name: 'Category', type: 'text' },
    ...columns.map((c) => ({ id: c.id, name: c.name, type: c.type })),
  ];

  const operators = [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_equal', label: 'Greater or equal' },
    { value: 'less_equal', label: 'Less or equal' },
  ];

  const needsValue = !['is_empty', 'is_not_empty'].includes(filter.operator);

  return (
    <div className="flex items-center gap-2">
      <select
        value={filter.columnId}
        onChange={(e) => onChange({ ...filter, columnId: e.target.value })}
        className="h-7 rounded-lg border border-border bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {allFilterColumns.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select
        value={filter.operator}
        onChange={(e) => onChange({ ...filter, operator: e.target.value })}
        className="h-7 rounded-lg border border-border bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      {needsValue && (
        <Input
          value={filter.value}
          onChange={(e) => onChange({ ...filter, value: e.target.value })}
          placeholder="Value..."
          className="h-7 text-xs w-32"
        />
      )}
      <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200 text-text-muted hover:text-red-600">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
