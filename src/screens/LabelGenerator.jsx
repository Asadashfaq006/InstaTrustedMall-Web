import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Tag, Printer, Download, Search, Camera, Check, Plus, Trash2, Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useProductStore from '@/stores/productStore';
import useStockStore from '@/stores/stockStore';
import useScannerStore from '@/stores/scannerStore';
import ScanModeButton from '@/components/scanner/ScanModeButton';
import { cn } from '@/lib/utils';

const SIZE_PRESETS = [
  { label: '50×25', w: 50, h: 25 },
  { label: '40×20', w: 40, h: 20 },
  { label: '30×15', w: 30, h: 15 },
];

const COPIES_OPTIONS = [1, 2, 3, 5, 10, 25, 50, 100];

const mmToPx = (mm) => Math.round((mm / 25.4) * 96);

function generateLabelsHTML(labelItems, template, business) {
  const labelWidthMm = template.width_mm;
  const labelHeightMm = template.height_mm;
  const usableWidthMm = 190;
  const labelsPerRow = Math.max(1, Math.floor(usableWidthMm / labelWidthMm));

  const rows = [];
  for (let i = 0; i < labelItems.length; i += labelsPerRow) {
    rows.push(labelItems.slice(i, i + labelsPerRow));
  }

  const isQR = template.code_type === 'qr';
  const codePos = template.code_position || 'right';
  const flexDir = (codePos === 'left') ? 'row-reverse'
    : (codePos === 'top') ? 'column-reverse'
    : (codePos === 'bottom') ? 'column'
    : 'row';

  return `<!DOCTYPE html>
<html><head><style>
  @page { size: A4; margin: 10mm; }
  body { margin: 10mm; font-family: Arial, sans-serif; }
  .label-row { display: flex; gap: 2mm; margin-bottom: 2mm; }
  .label {
    width: ${labelWidthMm}mm; height: ${labelHeightMm}mm;
    border: 0.5pt solid #CCC; display: flex; align-items: center;
    padding: 1mm; overflow: hidden; box-sizing: border-box;
    flex-direction: ${flexDir};
  }
  .label-info { flex: 1; overflow: hidden; }
  .label-name { font-size: ${template.font_size_name || 10}pt; font-weight: bold; }
  .label-sku { font-size: ${template.font_size_detail || 8}pt; color: #555; }
  .label-price { font-size: ${template.font_size_detail || 8}pt; font-weight: bold; }
  .label-code { flex-shrink: 0; }
  .label-code img { max-height: ${labelHeightMm - 4}mm; max-width: ${labelWidthMm / 2}mm; }
  @media print { body { margin: 10mm; } }
</style></head><body>
${rows.map(row => `<div class="label-row">${row.map(p => `<div class="label">
  <div class="label-info">
    ${template.show_product_name ? `<div class="label-name">${p.name}</div>` : ''}
    ${template.show_sku ? `<div class="label-sku">SKU: ${p.sku || ''}</div>` : ''}
    ${template.show_price && p.salePrice != null ? `<div class="label-price">₨ ${Number(p.salePrice).toLocaleString()}</div>` : ''}
    ${template.show_category && p.category ? `<div class="label-sku">${p.category}</div>` : ''}
    ${template.show_business_name && business?.name ? `<div class="label-sku">${business.name}</div>` : ''}
  </div>
  <div class="label-code"><img src="${p.codeDataUrl || ''}" /></div>
</div>`).join('')}</div>`).join('')}
</body></html>`;
}

export default function LabelGenerator() {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const { products, loadProducts, loadColumns, columns } = useProductStore();
  const { stockLevels, fetchStockLevels } = useStockStore();

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [template, setTemplate] = useState({
    name: 'Standard 50×25mm',
    width_mm: 50, height_mm: 25,
    show_product_name: true, show_sku: true, show_price: true,
    show_category: false, show_business_name: false,
    code_type: 'barcode', code_position: 'right',
    font_size_name: 10, font_size_detail: 8,
    is_default: false,
  });

  // Product selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [copies, setCopies] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Preview
  const previewCanvasRef = useRef(null);
  const previewSvgRef = useRef(null);

  // Load data
  useEffect(() => {
    if (!activeBusiness?.id) return;
    loadProducts(activeBusiness.id);
    loadColumns(activeBusiness.id);
    fetchStockLevels(activeBusiness.id);
    loadTemplates();
  }, [activeBusiness?.id]);

  const loadTemplates = async () => {
    if (!activeBusiness?.id) return;
    const res = await window.electronAPI.labels.getTemplates(activeBusiness.id);
    if (res.success) {
      setTemplates(res.data || []);
      // Select first template if exists
      if (res.data?.length > 0 && !selectedTemplateId) {
        const def = res.data.find((t) => t.is_default) || res.data[0];
        setSelectedTemplateId(def.id);
        setTemplate(def);
      }
    }
  };

  // Get categories
  const categories = useMemo(() => {
    const cats = new Set();
    products.filter(p => !p.is_deleted).forEach(p => { if (p.category) cats.add(p.category); });
    return [...cats].sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => !p.is_deleted);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      list = list.filter(p => p.category === categoryFilter);
    }
    return list;
  }, [products, searchQuery, categoryFilter]);

  // Get sale price for a product
  const getSalePrice = useCallback((productId) => {
    const salePriceCol = columns.find(c => c.name === 'Sale Price' && c.is_system);
    if (!salePriceCol) return null;
    const product = products.find(p => p.id === productId);
    if (!product?.values) return null;
    const val = product.values[salePriceCol.id];
    return val ? parseFloat(val) : null;
  }, [columns, products]);

  // Get stock for a product
  const getStock = useCallback((productId) => {
    const sl = stockLevels.find(s => s.productId === productId);
    return sl ? sl.quantity : 0;
  }, [stockLevels]);

  // Selection helpers
  const toggleProduct = (productId) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const selectAll = () => {
    const ids = new Set(filteredProducts.map(p => p.id));
    setSelectedProductIds(ids);
  };

  const deselectAll = () => setSelectedProductIds(new Set());

  const totalLabels = selectedProductIds.size * copies;

  // Template field updater
  const updateTemplate = (field, value) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!activeBusiness?.id) return;
    const res = await window.electronAPI.labels.saveTemplate({
      businessId: activeBusiness.id,
      id: selectedTemplateId,
      ...template,
    });
    if (res.success) {
      toast({ title: `Label template '${template.name}' saved.` });
      await loadTemplates();
      if (res.data?.id) setSelectedTemplateId(res.data.id);
    }
  };

  // New template
  const handleNewTemplate = () => {
    setSelectedTemplateId(null);
    setTemplate({
      name: 'New Template',
      width_mm: 50, height_mm: 25,
      show_product_name: true, show_sku: true, show_price: true,
      show_category: false, show_business_name: false,
      code_type: 'barcode', code_position: 'right',
      font_size_name: 10, font_size_detail: 8,
      is_default: false,
    });
  };

  // Generate code data URLs for selected products
  const generateCodeDataUrl = useCallback(async (product) => {
    const value = product.barcode || product.sku || '';
    if (!value) return '';

    if (template.code_type === 'qr') {
      try {
        const QRCode = (await import('qrcode')).default;
        return await QRCode.toDataURL(JSON.stringify({ productId: product.id, sku: product.sku, name: product.name }), {
          width: 200, margin: 1,
          color: { dark: '#1A202C', light: '#FFFFFF' },
        });
      } catch { return ''; }
    } else {
      try {
        // JsBarcode needs an SVG element, render to canvas via a temp element
        const JsBarcode = (await import('jsbarcode')).default;
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, value, {
          format: 'CODE128', width: 2, height: 60,
          displayValue: false, lineColor: '#1A202C', background: '#FFFFFF',
        });
        return canvas.toDataURL('image/png');
      } catch { return ''; }
    }
  }, [template.code_type]);

  // Print
  const handlePrint = async () => {
    if (selectedProductIds.size === 0) {
      toast({ title: 'Select at least one product to print labels.', variant: 'destructive' });
      return;
    }
    const selectedProds = products.filter(p => selectedProductIds.has(p.id));
    const labelItems = [];
    for (const p of selectedProds) {
      const codeDataUrl = await generateCodeDataUrl(p);
      const salePrice = getSalePrice(p.id);
      for (let c = 0; c < copies; c++) {
        labelItems.push({ ...p, salePrice, codeDataUrl });
      }
    }
    const html = generateLabelsHTML(labelItems, template, activeBusiness);
    const res = await window.electronAPI.labels.printLabels({ html });
    if (res.success) {
      toast({ title: 'Labels sent to printer.' });
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    if (selectedProductIds.size === 0) {
      toast({ title: 'Select at least one product to export labels.', variant: 'destructive' });
      return;
    }
    const selectedProds = products.filter(p => selectedProductIds.has(p.id));
    const labelItems = [];
    for (const p of selectedProds) {
      const codeDataUrl = await generateCodeDataUrl(p);
      const salePrice = getSalePrice(p.id);
      for (let c = 0; c < copies; c++) {
        labelItems.push({ ...p, salePrice, codeDataUrl });
      }
    }
    const html = generateLabelsHTML(labelItems, template, activeBusiness);
    const filename = `labels-${new Date().toISOString().split('T')[0]}.pdf`;
    const res = await window.electronAPI.labels.exportLabelsPDF({ html, filename });
    if (res.success) {
      toast({ title: `Labels saved: ${res.filePath}` });
    } else if (!res.cancelled) {
      toast({ title: 'Failed to export PDF', description: res.error, variant: 'destructive' });
    }
  };

  // Handle scan to add product
  const handleScanProduct = useCallback((code, result) => {
    if (result?.found && result.product) {
      setSelectedProductIds(prev => new Set([...prev, result.product.id]));
    } else {
      toast({ title: `Code not found: ${code}`, variant: 'destructive' });
    }
  }, [toast]);

  // Preview rendering
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const previewProduct = useMemo(() => {
    const firstId = [...selectedProductIds][0];
    if (firstId) return products.find(p => p.id === firstId);
    return filteredProducts[0];
  }, [selectedProductIds, filteredProducts, products]);

  useEffect(() => {
    if (!previewProduct) return;
    let cancelled = false;
    generateCodeDataUrl(previewProduct).then(url => {
      if (!cancelled) setPreviewDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [previewProduct, generateCodeDataUrl]);

  // Label preview dimensions
  const previewScale = 3; // px per mm for preview
  const labelPreviewW = template.width_mm * previewScale;
  const labelPreviewH = template.height_mm * previewScale;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Tag className="w-6 h-6 text-accent" />
            Label & QR Generator
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Design labels and print barcodes or QR codes for your products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Selected
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Content — 2 column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Template Editor (40%) */}
        <div className="w-[40%] border-r border-border overflow-y-auto p-5 space-y-6">
          {/* Template selector */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Label Template</h3>
            {templates.length > 0 && (
              <select
                value={selectedTemplateId || ''}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  setSelectedTemplateId(id || null);
                  const tmpl = templates.find(t => t.id === id);
                  if (tmpl) setTemplate(tmpl);
                }}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white mb-2"
              >
                <option value="">Custom</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_default ? '●' : ''}
                  </option>
                ))}
              </select>
            )}
            <Button variant="ghost" size="sm" onClick={handleNewTemplate} className="gap-1 text-xs">
              <Plus className="w-3 h-3" /> New Template
            </Button>
          </section>

          {/* Template name */}
          <section>
            <label className="text-xs text-text-muted mb-1 block">Template name</label>
            <Input
              value={template.name}
              onChange={(e) => updateTemplate('name', e.target.value)}
              className="text-sm"
              data-scanner-aware="true"
            />
          </section>

          {/* Size */}
          <section>
            <label className="text-xs text-text-muted mb-1 block">Size</label>
            <div className="flex items-center gap-2 mb-2">
              <Input
                type="number"
                min={10}
                max={200}
                value={template.width_mm}
                onChange={(e) => updateTemplate('width_mm', Number(e.target.value))}
                className="w-20 text-sm"
              />
              <span className="text-xs text-text-muted">×</span>
              <Input
                type="number"
                min={10}
                max={200}
                value={template.height_mm}
                onChange={(e) => updateTemplate('height_mm', Number(e.target.value))}
                className="w-20 text-sm"
              />
              <span className="text-xs text-text-muted">mm</span>
            </div>
            <div className="flex gap-1.5">
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    updateTemplate('width_mm', p.w);
                    updateTemplate('height_mm', p.h);
                  }}
                  className={cn(
                    'px-2 py-1 text-xs rounded border transition-colors',
                    template.width_mm === p.w && template.height_mm === p.h
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-muted hover:border-gray-300'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Code type */}
          <section>
            <label className="text-xs text-text-muted mb-2 block">Code type</label>
            <div className="flex gap-2">
              {['barcode', 'qr'].map((type) => (
                <button
                  key={type}
                  onClick={() => updateTemplate('code_type', type)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    template.code_type === type
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-muted hover:border-gray-300'
                  )}
                >
                  {type === 'barcode' ? 'Barcode' : 'QR Code'}
                </button>
              ))}
            </div>
          </section>

          {/* Code position */}
          <section>
            <label className="text-xs text-text-muted mb-2 block">Code position</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['left', 'right', 'top', 'bottom'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => updateTemplate('code_position', pos)}
                  className={cn(
                    'px-2 py-1.5 rounded text-xs font-medium border capitalize transition-colors',
                    template.code_position === pos
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-muted hover:border-gray-300'
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>
          </section>

          {/* Show on label */}
          <section>
            <label className="text-xs text-text-muted mb-2 block">Show on label</label>
            <div className="space-y-2">
              {[
                { key: 'show_product_name', label: 'Product Name' },
                { key: 'show_sku', label: 'SKU / Code' },
                { key: 'show_price', label: 'Price' },
                { key: 'show_category', label: 'Category' },
                { key: 'show_business_name', label: 'Business Name' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!template[key]}
                    onChange={(e) => updateTemplate(key, e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent"
                  />
                  <span className="text-sm text-text-primary">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Font sizes */}
          <section>
            <label className="text-xs text-text-muted mb-2 block">Font sizes</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted">Name (pt)</label>
                <Input
                  type="number"
                  min={6}
                  max={18}
                  value={template.font_size_name || 10}
                  onChange={(e) => updateTemplate('font_size_name', Number(e.target.value))}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted">Detail (pt)</label>
                <Input
                  type="number"
                  min={5}
                  max={14}
                  value={template.font_size_detail || 8}
                  onChange={(e) => updateTemplate('font_size_detail', Number(e.target.value))}
                  className="text-sm"
                />
              </div>
            </div>
          </section>

          {/* Copies */}
          <section>
            <label className="text-xs text-text-muted mb-1 block">Copies per product</label>
            <select
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              {COPIES_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </section>

          {/* Save template */}
          <Button onClick={handleSaveTemplate} className="w-full gap-1.5">
            Save Template
          </Button>
        </div>

        {/* Right panel — Product selection + preview (60%) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Product selection */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Product Selection</h3>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 text-sm"
                  data-scanner-aware="true"
                />
              </div>
              <ScanModeButton
                onScan={handleScanProduct}
                context="labels"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => selectedProductIds.size === filteredProducts.length ? deselectAll() : selectAll()}
                className="text-xs font-medium text-accent hover:underline"
              >
                {selectedProductIds.size === filteredProducts.length ? 'Deselect All' : '☑ All'}
              </button>
              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Product list */}
            <div className="border border-border rounded-lg divide-y divide-border max-h-[280px] overflow-y-auto bg-white">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-muted">No products found</div>
              ) : (
                filteredProducts.map((p) => {
                  const stock = getStock(p.id);
                  const checked = selectedProductIds.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors',
                        checked && 'bg-accent/5'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProduct(p.id)}
                        className="w-4 h-4 rounded border-border text-accent"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                      </div>
                      <span className="text-xs text-text-muted font-mono">{p.sku || '—'}</span>
                      <span className={cn(
                        'text-xs font-medium',
                        stock <= 0 ? 'text-red-500' : stock <= 5 ? 'text-amber-500' : 'text-gray-400'
                      )}>
                        {stock <= 0 ? 'OUT' : stock <= 5 ? `${stock} LOW` : `${stock} in stk`}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Selection summary */}
            <p className="text-xs text-text-muted mt-2">
              Selected: <strong>{selectedProductIds.size}</strong> products &middot;{' '}
              <strong>{totalLabels}</strong> total labels
            </p>
          </section>

          {/* Label Preview */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Label Preview</h3>
            <div className="flex items-center justify-center p-6 bg-gray-50 rounded-xl border border-dashed border-border">
              {previewProduct ? (
                <div
                  className="bg-white border border-border rounded overflow-hidden flex items-center"
                  style={{
                    width: labelPreviewW,
                    height: labelPreviewH,
                    flexDirection: template.code_position === 'left' ? 'row-reverse'
                      : template.code_position === 'top' ? 'column-reverse'
                      : template.code_position === 'bottom' ? 'column'
                      : 'row',
                    padding: '3px',
                    gap: '4px',
                  }}
                >
                  <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
                    {template.show_product_name && (
                      <p style={{ fontSize: Math.max(8, template.font_size_name * 0.9) }} className="font-bold text-text-primary leading-tight truncate">
                        {previewProduct.name}
                      </p>
                    )}
                    {template.show_sku && (
                      <p style={{ fontSize: Math.max(6, template.font_size_detail * 0.8) }} className="text-gray-500 truncate">
                        SKU: {previewProduct.sku || '—'}
                      </p>
                    )}
                    {template.show_price && getSalePrice(previewProduct.id) != null && (
                      <p style={{ fontSize: Math.max(6, template.font_size_detail * 0.8) }} className="font-bold text-text-primary">
                        ₨ {Number(getSalePrice(previewProduct.id)).toLocaleString()}
                      </p>
                    )}
                    {template.show_category && previewProduct.category && (
                      <p style={{ fontSize: Math.max(5, template.font_size_detail * 0.7) }} className="text-gray-400 truncate">{previewProduct.category}</p>
                    )}
                    {template.show_business_name && activeBusiness?.name && (
                      <p style={{ fontSize: Math.max(5, template.font_size_detail * 0.7) }} className="text-gray-400 truncate">{activeBusiness.name}</p>
                    )}
                  </div>
                  {previewDataUrl && (
                    <div className="flex-shrink-0 flex items-center justify-center">
                      <img
                        src={previewDataUrl}
                        alt="code"
                        style={{ maxHeight: labelPreviewH - 10, maxWidth: labelPreviewW / 2.5 }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Select a product to preview</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
