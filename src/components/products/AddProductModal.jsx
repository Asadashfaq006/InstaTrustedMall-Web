import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Camera, X, Loader2, Lock } from 'lucide-react';
import useProductStore from '@/stores/productStore';
import useStockStore from '@/stores/stockStore';
import useAuthStore from '@/stores/authStore';
import { localFileUrl } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function showCurrency(val) {
  if (val === null || val === undefined) return 'N/A';
  return '₨ ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showPercent(val) {
  if (val === null || val === undefined) return 'N/A';
  return val.toFixed(1) + '%';
}

function hasValue(v) {
  return v !== '' && v !== null && v !== undefined;
}

// ── Component ────────────────────────────────────────────────────────
export default function AddProductModal({ open, onOpenChange, businessId, columns, onProductAdded }) {
  const { createProduct } = useProductStore();
  const { adjustIn } = useStockStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // ── State ──
  const [imagePath, setImagePath] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const [productName, setProductName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const [packQuantity, setPackQuantity] = useState('');
  const [packPrice, setPackPrice] = useState('');

  const [mrpOverridden, setMrpOverridden] = useState(false);
  const [mrpOverride, setMrpOverride] = useState('');

  const [purchasePrice, setPurchasePrice] = useState('');
  const [companyDiscount, setCompanyDiscount] = useState('');

  const [openingStock, setOpeningStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [unitLabel, setUnitLabel] = useState('');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Calculations ──
  const calculations = useMemo(() => {
    const packQty = parseFloat(packQuantity) || null;
    const packPrc = parseFloat(packPrice) || null;
    const discPct = parseFloat(companyDiscount) || 0;
    const purchPrc = parseFloat(purchasePrice) || null;

    // MRP per unit
    const mrpAuto = (packPrc && packQty) ? round2(packPrc / packQty) : null;
    const mrpFinal = mrpOverridden ? (parseFloat(mrpOverride) || null) : mrpAuto;

    // Discount calculations
    const discPerPack = (packPrc && discPct) ? round2(packPrc * discPct / 100) : null;
    const priceAfterDisc = (packPrc !== null && discPerPack !== null)
      ? round2(packPrc - discPerPack) : packPrc;

    // Effective purchase price per unit
    const effectivePurchasePerUnit = purchPrc
      ? round2(purchPrc / (packQty || 1))
      : (priceAfterDisc && packQty)
        ? round2(priceAfterDisc / packQty)
        : null;

    // Profit
    const profitPerUnit = (mrpFinal !== null && effectivePurchasePerUnit !== null)
      ? round2(mrpFinal - effectivePurchasePerUnit) : null;
    const profitPerPack = (mrpFinal !== null && packQty !== null && effectivePurchasePerUnit !== null)
      ? round2((mrpFinal * packQty) - (effectivePurchasePerUnit * packQty)) : null;

    // Margins
    const marginPctUnit = (profitPerUnit !== null && mrpFinal)
      ? round2((profitPerUnit / mrpFinal) * 100) : null;
    const marginPctPack = (profitPerPack !== null && mrpFinal && packQty)
      ? round2((profitPerPack / (mrpFinal * packQty)) * 100) : null;

    return { mrpAuto, mrpFinal, discPerPack, priceAfterDisc, effectivePurchasePerUnit, profitPerUnit, profitPerPack, marginPctUnit, marginPctPack };
  }, [packQuantity, packPrice, companyDiscount, purchasePrice, mrpOverridden, mrpOverride]);

  // ── MRP Override ──
  const handleMrpChange = (e) => {
    setMrpOverridden(true);
    setMrpOverride(e.target.value);
  };
  const resetMrp = () => {
    setMrpOverridden(false);
    setMrpOverride('');
  };

  // ── Image Handling (web-compatible) ──
  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Show immediate preview
      setImagePreview(URL.createObjectURL(file));
      const uploadResult = await window.electronAPI.products.uploadImage(file);
      if (uploadResult.success) {
        setImagePath(uploadResult.data);
        setImagePreview(uploadResult.data);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setImagePath('');
    setImagePreview('');
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const fakeEvent = { target: { files: [file], value: '' } };
      handleImageFileSelected(fakeEvent);
    }
  }, []);

  // ── Reset form ──
  const resetForm = () => {
    setImagePath(''); setImagePreview('');
    setProductName(''); setCompanyName(''); setExpiryDate('');
    setPackQuantity(''); setPackPrice('');
    setMrpOverridden(false); setMrpOverride('');
    setPurchasePrice(''); setCompanyDiscount('');
    setOpeningStock(''); setReorderLevel(''); setUnitLabel('');
    setErrors({});
  };

  // ── Build product data payload ──
  const buildProductData = (force = false) => {
    const columnIdMap = Object.fromEntries((columns || []).map(c => [c.name, c.id]));
    const getValue = (colName, value) => {
      const id = columnIdMap[colName];
      return id && hasValue(value) ? { [id]: String(value) } : {};
    };
    const values = {
      ...getValue('Company / Supplier', companyName),
      ...getValue('Company Name', companyName),
      ...getValue('Expiry Date', expiryDate),
      ...getValue('Pack Quantity', packQuantity),
      ...getValue('Pack Price', packPrice),
      ...getValue('MRP per Unit', mrpOverridden ? mrpOverride : calculations.mrpAuto),
      ...getValue('MRP', mrpOverridden ? mrpOverride : calculations.mrpAuto),
      ...getValue('Purchase Price', purchasePrice),
      ...getValue('Company Discount %', companyDiscount),
      ...getValue('Company Discount', companyDiscount),
      ...getValue('Discount per Pack', calculations.discPerPack),
      ...getValue('Price after Discount', calculations.priceAfterDisc),
      ...getValue('Profit per Unit', calculations.profitPerUnit),
      ...getValue('Profit per Pack', calculations.profitPerPack),
      ...getValue('Reorder Level', reorderLevel || '5'),
      ...getValue('Unit', unitLabel),
    };
    return { businessId, name: productName.trim(), imagePath, values, forceDuplicate: force };
  };

  // ── Actually create the product (shared logic) ──
  const doCreate = async (force = false) => {
    setSaving(true);
    try {
      const result = await createProduct(buildProductData(force));

      // Handle duplicate name response
      if (result?.error === 'duplicate') {
        toast({
          title: '⚠️ Duplicate Product Name',
          description: result.message || `"${productName.trim()}" already exists.`,
          variant: 'destructive',
          duration: 8000,
          action: (
            <Button size="sm" variant="outline" className="text-xs whitespace-nowrap" onClick={() => doCreate(true)}>
              Add Anyway
            </Button>
          ),
        });
        return;
      }

      if (result?.error) {
        toast({ title: 'Failed to save product', description: result.error, variant: 'destructive' });
        return;
      }

      // Create opening stock if > 0 — store as total units (packs × units per pack)
      const stockQty = parseFloat(openingStock) || 0;
      const pqMultiplier = parseFloat(packQuantity) || 1;
      const totalUnits = stockQty * pqMultiplier;
      if (totalUnits > 0 && result?.id) {
        try {
          await adjustIn({
            businessId,
            productId: result.id,
            quantity: totalUnits,
            reason: 'Opening Stock',
            notes: `${stockQty} packs × ${pqMultiplier} units/pack = ${totalUnits} units`,
          });
        } catch (e) {
          console.warn('Stock creation failed:', e);
        }
      }

      toast({ title: `${productName.trim()} added successfully` });
      resetForm();
      onProductAdded?.(result);
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Save ──
  const handleSave = async () => {
    const newErrors = {};
    if (!productName.trim()) newErrors.productName = 'Product name is required';
    if (!packQuantity || parseFloat(packQuantity) <= 0)
      newErrors.packQuantity = 'Pack quantity must be greater than 0';
    if (!packPrice || parseFloat(packPrice) <= 0)
      newErrors.packPrice = 'Pack price is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await doCreate(false);
  };

  // ── Value display helpers ──
  const valColor = (val) => val === null ? 'text-gray-300' : val >= 0 ? 'text-green-600' : 'text-red-500';
  const marginColor = (val) => val === null ? 'text-gray-300' : val >= 0 ? 'text-green-500' : 'text-red-400';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-[640px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-lg font-bold">Add New Product</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* ── Image Upload (web-compatible) ── */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileSelected}
            accept="image/png,image/jpeg"
            className="hidden"
          />
          <div
            className="relative w-full h-[120px] rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors overflow-hidden"
            onClick={handleImageClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview.startsWith('blob:') ? imagePreview : localFileUrl(imagePreview)}
                  alt="Product"
                  className="h-full object-contain"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="text-center">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                <p className="text-sm text-gray-500">Click to upload product image</p>
                <p className="text-[10px] text-gray-400">Supported: JPG, PNG · Max 2MB</p>
              </div>
            )}
          </div>

          {/* ── Basic Info ── */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1">Basic Info</h3>
            <div>
              <Label>Product Name *</Label>
              <Input
                value={productName}
                onChange={(e) => { setProductName(e.target.value); setErrors(p => ({ ...p, productName: undefined })); }}
                placeholder="e.g. Panadol 500mg, Surf Excel 1kg"
                className={`mt-1 ${errors.productName ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              />
              {errors.productName && <span className="text-xs text-red-500 flex items-center gap-1 mt-1">⚠ {errors.productName}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Company / Supplier</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. GlaxoSmithKline, Unilever"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* ── Pack Details ── */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1">Pack Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Each Pack Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={packQuantity}
                  onChange={(e) => { setPackQuantity(e.target.value); setErrors(p => ({ ...p, packQuantity: undefined })); }}
                  placeholder="e.g. 10"
                  className={`mt-1 ${errors.packQuantity ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                />
                <p className="text-[10px] text-gray-400 mt-0.5">How many units are inside one pack?</p>
                {errors.packQuantity && <span className="text-xs text-red-500 flex items-center gap-1 mt-0.5">⚠ {errors.packQuantity}</span>}
              </div>
              <div>
                <Label>Pack Price *</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₨</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packPrice}
                    onChange={(e) => { setPackPrice(e.target.value); setErrors(p => ({ ...p, packPrice: undefined })); }}
                    placeholder="0.00"
                    className={`pl-7 ${errors.packPrice ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Total price of one full pack from company</p>
                {errors.packPrice && <span className="text-xs text-red-500 flex items-center gap-1 mt-0.5">⚠ {errors.packPrice}</span>}
              </div>
            </div>
          </div>

          {/* ── Pricing ── */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1">Pricing (auto-calculated)</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* MRP per Unit */}
              <div>
                <Label className="flex items-center gap-1.5">
                  MRP per Unit
                  {!mrpOverridden && calculations.mrpAuto !== null && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">auto</span>
                  )}
                  {mrpOverridden && (
                    <span className="text-[10px] text-amber-600 font-medium">edited ✎</span>
                  )}
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₨</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={mrpOverridden ? mrpOverride : (calculations.mrpAuto ?? '')}
                    onChange={handleMrpChange}
                    placeholder="0.00"
                    className={`pl-7 pr-16 ${mrpOverridden ? 'border-amber-400 bg-amber-50' : ''}`}
                  />
                  {mrpOverridden && (
                    <button
                      onClick={resetMrp}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-amber-600 hover:text-amber-800 underline"
                      title="Reset to auto-calculated value"
                    >
                      ↺ reset
                    </button>
                  )}
                </div>
              </div>
              {/* Purchase Price */}
              <div>
                <Label>Purchase Price</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₨</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">The actual price you paid (may differ if discounted)</p>
              </div>
            </div>
          </div>

          {/* ── Company Discount ── */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1">Company Discount</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Discount %</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={companyDiscount}
                    onChange={(e) => setCompanyDiscount(e.target.value)}
                    placeholder="0"
                    className="pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Discount from company</p>
              </div>
              {/* Discount per Pack (read-only) */}
              <div>
                <Label className="flex items-center gap-1">Discount / Pack <Lock className="w-3 h-3 text-gray-300" /></Label>
                <div className="mt-1 flex items-center justify-between px-3 py-2 rounded-lg border bg-[#F8FAFC] border-[#E2E8F0]">
                  <span className={`text-sm font-semibold ${calculations.discPerPack === null ? 'text-gray-300' : 'text-gray-900'}`}>
                    {calculations.discPerPack === null ? 'N/A' : showCurrency(calculations.discPerPack)}
                  </span>
                  <span className="text-xs text-gray-300">🔒</span>
                </div>
              </div>
              {/* Price after Discount (read-only) */}
              <div>
                <Label className="flex items-center gap-1">After Discount <Lock className="w-3 h-3 text-gray-300" /></Label>
                <div className="mt-1 flex items-center justify-between px-3 py-2 rounded-lg border bg-[#F8FAFC] border-[#E2E8F0]">
                  <span className={`text-sm font-semibold ${calculations.priceAfterDisc === null ? 'text-gray-300' : 'text-gray-900'}`}>
                    {calculations.priceAfterDisc === null ? 'N/A' : showCurrency(calculations.priceAfterDisc)}
                  </span>
                  <span className="text-xs text-gray-300">🔒</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Profit Summary ── */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Profit Summary</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              {/* Per Unit */}
              <div className="px-4 py-3">
                <div className="text-xs text-gray-400 mb-1">Per Unit (1 piece)</div>
                <div className={`text-lg font-bold ${valColor(calculations.profitPerUnit)}`}>
                  {showCurrency(calculations.profitPerUnit)}
                </div>
                <div className={`text-xs mt-0.5 font-medium ${marginColor(calculations.marginPctUnit)}`}>
                  Margin: {showPercent(calculations.marginPctUnit)}
                </div>
              </div>
              {/* Per Pack */}
              <div className="px-4 py-3">
                <div className="text-xs text-gray-400 mb-1">Per Pack (full pack)</div>
                <div className={`text-lg font-bold ${valColor(calculations.profitPerPack)}`}>
                  {showCurrency(calculations.profitPerPack)}
                </div>
                <div className={`text-xs mt-0.5 font-medium ${marginColor(calculations.marginPctPack)}`}>
                  Margin: {showPercent(calculations.marginPctPack)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Stock ── */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1">Stock</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Opening Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">How many packs in stock?</p>
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  placeholder="5"
                  className="mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Alert when stock below</p>
              </div>
              <div>
                <Label>Unit Label</Label>
                <Input
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="pcs, strip, bottle"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave} disabled={saving} className="gap-1.5 min-w-[130px]">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
