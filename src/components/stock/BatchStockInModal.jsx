import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import useStockStore from '@/stores/stockStore';
import useBusinessStore from '@/stores/businessStore';
import { STOCK_IN_REASONS } from '@/constants/stockReasons';
import { Plus, Trash2, Package } from 'lucide-react';
import { formatStockNumber, roundStockNumber, sanitizeStockDecimalInput } from '@/utils/stockNumber';

export default function BatchStockInModal({ open, onOpenChange, products = [] }) {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const batchAdjustIn = useStockStore((s) => s.batchAdjustIn);
  const fetchStockLevels = useStockStore((s) => s.fetchStockLevels);

  const [items, setItems] = useState([]);
  const [globalReason, setGlobalReason] = useState('New Purchase');
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // Load all products when modal opens
  useEffect(() => {
    if (open && activeBusiness?.id) {
      // Fetch stock levels to populate product list (includes packQty)
      fetchStockLevels(activeBusiness.id);
      // Also load products directly for the dropdown
      const loadProducts = async () => {
        try {
          const res = await window.electronAPI.products.getAll(activeBusiness.id);
          // Get stock levels for pack qty info
          const stockRes = await window.electronAPI.stock.getLevels(activeBusiness.id);
          const stockMap = {};
          if (stockRes.success) {
            stockRes.data.forEach(s => { stockMap[s.productId] = s.packQty || 1; });
          }
          if (res.success) {
            setAllProducts(res.data.map(p => ({
              productId: p.id,
              productName: p.name,
              sku: p.sku || '',
              packQty: stockMap[p.id] || 1,
            })));
          }
        } catch { /* silent */ }
      };
      loadProducts();
    }
  }, [open, activeBusiness?.id]);

  useEffect(() => {
    if (open) {
      if (products.length > 0) {
        setItems(products.map(p => ({
          productId: p.id || p.productId,
          productName: p.name || p.productName,
          sku: p.sku || '',
          packQty: p.packQty || 1,
          quantity: '',
          inputMode: 'packs',
          notes: '',
        })));
      } else {
        setItems([{ productId: '', productName: '', sku: '', packQty: 1, quantity: '', inputMode: 'packs', notes: '' }]);
      }
      setGlobalReason('New Purchase');
    }
  }, [open, products]);

  const addRow = () => {
    setItems(prev => [...prev, { productId: '', productName: '', sku: '', packQty: 1, quantity: '', inputMode: 'packs', notes: '' }]);
  };

  const removeRow = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const validItems = items.filter(item => {
    const qty = parseFloat(item.quantity);
    return item.productId && !isNaN(qty) && qty > 0;
  });

  const handleSubmit = async () => {
    if (validItems.length === 0) return;
    setSaving(true);

    const res = await batchAdjustIn({
      businessId: activeBusiness.id,
      items: validItems.map(item => {
        const rawQty = parseFloat(item.quantity);
        // Convert packs to units if in packs mode and packQty > 1
        const effectiveQty = (item.inputMode === 'packs' && item.packQty > 1)
          ? roundStockNumber(rawQty * item.packQty)
          : roundStockNumber(rawQty);
        return {
          productId: item.productId,
          quantity: effectiveQty,
          reason: globalReason,
          notes: item.notes || null,
        };
      }),
    });

    setSaving(false);

    if (res.success) {
      toast({
        title: 'Batch Stock-In Complete',
        description: `${res.data.length} products updated`,
      });
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  // Filter out already-used product IDs from dropdown
  const usedProductIds = items.map(i => i.productId).filter(Boolean);
  const availableProducts = allProducts.filter(p => !usedProductIds.includes(p.productId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            Batch Stock-In
          </DialogTitle>
          <DialogDescription>Add stock to multiple products at once</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-4">
          {/* Global reason */}
          <div className="space-y-1.5">
            <Label>Reason (applies to all)</Label>
            <Select value={globalReason} onValueChange={setGlobalReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_IN_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items table */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            <div className="grid grid-cols-[1fr_140px_1fr_40px] gap-2 text-xs text-text-muted font-medium px-1">
              <span>Product</span>
              <span>Quantity (packs)</span>
              <span>Notes</span>
              <span></span>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_140px_1fr_40px] gap-2 items-center">
                {item.productId ? (
                  <div className="text-sm truncate px-2 py-1.5 bg-gray-50 rounded-lg">
                    {item.productName}
                    {item.sku && <span className="text-text-muted ml-1">({item.sku})</span>}
                  </div>
                ) : (
                  <Select
                    value={item.productId ? String(item.productId) : undefined}
                    onValueChange={(val) => {
                      const p = allProducts.find(p => String(p.productId) === val);
                      if (p) {
                        setItems(prev => prev.map((it, i) => i === index ? {
                          ...it,
                          productId: p.productId,
                          productName: p.productName,
                          sku: p.sku || '',
                          packQty: p.packQty || 1,
                        } : it));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map(p => (
                        <SelectItem key={p.productId} value={String(p.productId)}>
                          {p.productName} {p.sku ? `(${p.sku})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    className="h-9"
                    value={item.quantity}
                    onChange={(e) => updateRow(index, 'quantity', sanitizeStockDecimalInput(e.target.value))}
                    placeholder={item.packQty > 1 ? `Packs (×${item.packQty})` : '0'}
                  />
                  {item.packQty > 1 && parseFloat(item.quantity) > 0 && (
                    <p className="text-[10px] text-text-muted mt-0.5">= {formatStockNumber(roundStockNumber(parseFloat(item.quantity) * item.packQty))} units</p>
                  )}
                </div>
                <Input
                  className="h-9"
                  value={item.notes}
                  onChange={(e) => updateRow(index, 'notes', e.target.value)}
                  placeholder="Notes..."
                />
                <button
                  onClick={() => removeRow(index)}
                  className="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                  disabled={items.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </Button>
        </div>

        <DialogFooter>
          <span className="text-sm text-text-muted">
            {validItems.length} item{validItems.length !== 1 ? 's' : ''} ready
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={validItems.length === 0 || saving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? 'Saving...' : `Stock In ${validItems.length} Item${validItems.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
