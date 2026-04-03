import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X } from 'lucide-react';
import useProductStore from '@/stores/productStore';
import { localFileUrl } from '@/lib/utils';

export default function ProductModal({ open, onOpenChange, product, businessId, columns }) {
  const { createProduct, updateProductCore } = useProductStore();
  const { toast } = useToast();
  const isEdit = !!product;

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    imagePath: '',
    values: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        imagePath: product.image_path || '',
        values: product.values || {},
      });
    } else {
      setFormData({ name: '', sku: '', barcode: '', category: '', imagePath: '', values: {} });
    }
  }, [product, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleValueChange = (columnId, value) => {
    setFormData((prev) => ({
      ...prev,
      values: { ...prev.values, [columnId]: value },
    }));
  };

  const fileInputRef = useRef(null);

  const handleImagePick = () => {
    fileInputRef.current?.click();
  };

  const onImageFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploadResult = await window.electronAPI.products.uploadImage(file);
      if (uploadResult.success) {
        handleChange('imagePath', uploadResult.data);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Product name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        // Update core fields
        const result = await updateProductCore({
          productId: product.id,
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode,
          category: formData.category,
          imagePath: formData.imagePath,
          image_path: formData.imagePath,
        });

        if (result?.error) {
          toast({ title: 'Failed to update product', description: result.error, variant: 'destructive' });
          return;
        }

        // Update custom column values
        for (const [colId, value] of Object.entries(formData.values)) {
          if (product.values?.[colId] !== value) {
            await useProductStore.getState().updateCell(product.id, parseInt(colId), value);
          }
        }

        toast({ title: 'Product updated successfully' });
      } else {
        const result = await createProduct({
          businessId,
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode,
          category: formData.category,
          imagePath: formData.imagePath,
          values: formData.values,
        });

        if (result?.error) {
          toast({ title: 'Failed to create product', description: result.error, variant: 'destructive' });
          return;
        }

        toast({ title: 'Product created successfully' });
      }

      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const editableColumns = (columns || []).filter((c) => c.type !== 'formula');

  // ── Column categorization for the redesigned form ──
  const KNOWN_NAMES = ['Pack Quantity', 'Pack Price', 'MRP', 'Company Name', 'Expiry Date', 'Company Discount', 'Profit', 'Stock Quantity', 'Reorder Level'];

  const allCols = columns || [];
  const packQtyCol  = allCols.find(c => c.name === 'Pack Quantity');
  const packPriceCol = allCols.find(c => c.name === 'Pack Price');
  const mrpCol       = allCols.find(c => c.name === 'MRP');
  const companyNameCol = allCols.find(c => c.name === 'Company Name');
  const expiryCol    = allCols.find(c => c.name === 'Expiry Date');
  const companyDiscCol = allCols.find(c => c.name === 'Company Discount');
  const profitCol    = allCols.find(c => c.name === 'Profit');
  const stockQtyCol  = allCols.find(c => c.name === 'Stock Quantity' && c.type !== 'formula');

  const knownIds = new Set(
    [packQtyCol, packPriceCol, mrpCol, companyNameCol, expiryCol, companyDiscCol, profitCol, stockQtyCol]
      .filter(Boolean).map(c => c.id)
  );
  const otherEditableColumns = editableColumns.filter(c => !knownIds.has(c.id));

  // Compute auto-calculated values
  const packQtyValue = packQtyCol ? parseFloat(formData.values[packQtyCol.id]) || 0 : 0;
  const packPriceValue = packPriceCol ? parseFloat(formData.values[packPriceCol.id]) || 0 : 0;
  const computedMRP = packQtyValue > 0 && packPriceValue > 0 ? (packPriceValue / packQtyValue).toFixed(2) : '—';
  const companyDiscValue = companyDiscCol ? parseFloat(formData.values[companyDiscCol.id]) || 0 : 0;
  const computedProfit = computedMRP !== '—' ? (parseFloat(computedMRP) - companyDiscValue).toFixed(2) : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-lg">{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-3 max-h-[65vh] overflow-y-auto pr-2">

          {/* Hidden file input for image upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onImageFileSelected}
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
          />

          {/* ── Image + Name ── */}
          <div className="flex items-start gap-4">
            <div
              className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors overflow-hidden shrink-0"
              onClick={handleImagePick}
            >
              {formData.imagePath ? (
                <img src={localFileUrl(formData.imagePath)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="w-5 h-5 text-text-muted mx-auto mb-1" />
                  <span className="text-[10px] text-text-muted">Image</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              {formData.imagePath && (
                <button onClick={() => handleChange('imagePath', '')} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 mb-1">
                  <X className="w-3 h-3" /> Remove photo
                </button>
              )}
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Panadol Extra 500mg"
                className="mt-1"
              />
            </div>
          </div>

          {/* ── Stock ── */}
          {stockQtyCol && !isEdit && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/30 rounded-lg border border-blue-100">
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={formData.values[stockQtyCol.id] || ''}
                  onChange={(e) => handleValueChange(stockQtyCol.id, e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* ── Pack & Pricing ── */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pack & Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              {packQtyCol && (
                <div>
                  <Label>Pack Quantity</Label>
                  <Input
                    type="number"
                    value={formData.values[packQtyCol.id] || ''}
                    onChange={(e) => handleValueChange(packQtyCol.id, e.target.value)}
                    placeholder="e.g. 10"
                    className="mt-1"
                  />
                </div>
              )}
              {packPriceCol && (
                <div>
                  <Label>Pack Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.values[packPriceCol.id] || ''}
                    onChange={(e) => handleValueChange(packPriceCol.id, e.target.value)}
                    placeholder="e.g. 500"
                    className="mt-1"
                  />
                </div>
              )}
              {mrpCol && (
                <div>
                  <Label className="flex items-center gap-1">
                    <span className="text-[10px] text-purple-500 font-semibold">ƒ</span>
                    MRP (Unit Price)
                  </Label>
                  <div className="mt-1 h-10 flex items-center px-3 rounded-lg border border-border bg-purple-50/40 text-sm text-purple-700 font-mono">
                    {computedMRP}
                  </div>
                  {packQtyValue > 0 && packPriceValue > 0 && (
                    <p className="text-[10px] text-text-muted mt-1">= {packPriceValue} / {packQtyValue}</p>
                  )}
                </div>
              )}
              {companyDiscCol && (
                <div>
                  <Label>Company Discount (Cost Price)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.values[companyDiscCol.id] || ''}
                    onChange={(e) => handleValueChange(companyDiscCol.id, e.target.value)}
                    placeholder="e.g. 35"
                    className="mt-1"
                  />
                </div>
              )}
              {profitCol && (
                <div>
                  <Label className="flex items-center gap-1">
                    <span className="text-[10px] text-purple-500 font-semibold">ƒ</span>
                    Profit
                  </Label>
                  <div className={`mt-1 h-10 flex items-center px-3 rounded-lg border border-border text-sm font-mono ${
                    computedProfit !== '—' && parseFloat(computedProfit) > 0 ? 'bg-green-50 text-green-700 border-green-200' :
                    computedProfit !== '—' && parseFloat(computedProfit) < 0 ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-purple-50/40 text-purple-700'
                  }`}>
                    {computedProfit}
                  </div>
                  {computedProfit !== '—' && (
                    <p className="text-[10px] text-text-muted mt-1">= MRP ({computedMRP}) − Company Discount ({companyDiscValue})</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Company & Expiry ── */}
          {(companyNameCol || expiryCol) && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-orange-50/30 rounded-lg border border-orange-100">
              {companyNameCol && (
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.values[companyNameCol.id] || ''}
                    onChange={(e) => handleValueChange(companyNameCol.id, e.target.value)}
                    placeholder="e.g. GSK"
                    className="mt-1"
                  />
                </div>
              )}
              {expiryCol && (() => {
                const val = formData.values[expiryCol.id] || '';
                const isExpired = val && new Date(val) < new Date();
                const isExpiringSoon = val && !isExpired && (new Date(val) - new Date()) < 30 * 86400000;
                return (
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={val}
                      onChange={(e) => handleValueChange(expiryCol.id, e.target.value)}
                      className={`mt-1 ${
                        isExpired ? 'border-red-400 bg-red-50 text-red-700' :
                        isExpiringSoon ? 'border-amber-400 bg-amber-50 text-amber-700' : ''
                      }`}
                    />
                    {isExpired && <p className="text-xs text-red-600 mt-1 font-medium">⚠ Expired!</p>}
                    {isExpiringSoon && <p className="text-xs text-amber-600 mt-1 font-medium">⚠ Expiring soon</p>}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Other Custom Fields (if any) ── */}
          {otherEditableColumns.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Other Fields</h3>
              <div className="grid grid-cols-2 gap-4">
                {otherEditableColumns.map((col) => {
                  if (col.type === 'dropdown') {
                    return (
                      <div key={col.id}>
                        <Label>{col.name}{col.is_required ? ' *' : ''}</Label>
                        <select
                          value={formData.values[col.id] || ''}
                          onChange={(e) => handleValueChange(col.id, e.target.value)}
                          className="mt-1 flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <option value="">Select...</option>
                          {(() => {
                            try {
                              const opts = typeof col.dropdown_options === 'string' ? JSON.parse(col.dropdown_options) : col.dropdown_options || [];
                              return opts.map(o => <option key={o} value={o}>{o}</option>);
                            } catch { return null; }
                          })()}
                        </select>
                      </div>
                    );
                  }
                  if (col.type === 'boolean') {
                    return (
                      <div key={col.id}>
                        <Label>{col.name}</Label>
                        <div className="mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.values[col.id] === 'true' || formData.values[col.id] === '1'}
                              onChange={(e) => handleValueChange(col.id, e.target.checked ? 'true' : 'false')}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm text-text-secondary">Yes</span>
                          </label>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={col.id}>
                      <Label>{col.name}{col.is_required ? ' *' : ''}</Label>
                      <Input
                        type={col.type === 'number' || col.type === 'currency' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                        value={formData.values[col.id] || ''}
                        onChange={(e) => handleValueChange(col.id, e.target.value)}
                        placeholder={`Enter ${col.name.toLowerCase()}`}
                        step={col.type === 'currency' ? '0.01' : col.type === 'number' ? 'any' : undefined}
                        className="mt-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
