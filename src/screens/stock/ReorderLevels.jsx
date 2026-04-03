import React, { useEffect, useState, useMemo } from 'react';
import useStockStore from '@/stores/stockStore';
import useBusinessStore from '@/stores/businessStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Search, Save, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatStockNumber, roundStockNumber, sanitizeStockDecimalInput } from '@/utils/stockNumber';

export default function ReorderLevels() {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const { stockLevels, fetchStockLevels, setBulkReorderLevels } = useStockStore();

  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({}); // { [productId]: { reorderAt, reorderQty } }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchStockLevels(activeBusiness.id);
    }
  }, [activeBusiness?.id, fetchStockLevels]);

  // Initialize edits from current data
  useEffect(() => {
    const initial = {};
    stockLevels.forEach(item => {
      initial[item.productId] = {
        reorderAt: item.reorderAt ?? 0,
        reorderQty: item.reorderQty ?? '',
      };
    });
    setEdits(initial);
  }, [stockLevels]);

  const filtered = useMemo(() => {
    if (!search) return stockLevels;
    const q = search.toLowerCase();
    return stockLevels.filter(r =>
      r.productName?.toLowerCase().includes(q) ||
      r.sku?.toLowerCase().includes(q)
    );
  }, [stockLevels, search]);

  const hasChanges = useMemo(() => {
    return stockLevels.some(item => {
      const e = edits[item.productId];
      if (!e) return false;
      return (
        Number(e.reorderAt) !== Number(item.reorderAt ?? 0) ||
        String(e.reorderQty || '') !== String(item.reorderQty || '')
      );
    });
  }, [stockLevels, edits]);

  const updateEdit = (productId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const handleSave = async () => {
    const items = [];
    stockLevels.forEach(item => {
      const e = edits[item.productId];
      if (!e) return;
      if (
        Number(e.reorderAt) !== Number(item.reorderAt ?? 0) ||
        String(e.reorderQty || '') !== String(item.reorderQty || '')
      ) {
        items.push({
          productId: item.productId,
          reorderAt: roundStockNumber(parseFloat(e.reorderAt) || 0),
          reorderQty: e.reorderQty === '' ? null : roundStockNumber(parseFloat(e.reorderQty) || 0),
        });
      }
    });

    if (items.length === 0) return;
    setSaving(true);

    const res = await setBulkReorderLevels(items);
    setSaving(false);

    if (res.success) {
      toast({ title: 'Reorder Levels Saved', description: `${items.length} products updated` });
      fetchStockLevels(activeBusiness.id);
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Unsaved changes
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Reorder Level</strong> = the threshold below which products show as "Low Stock".
        <strong className="ml-2">Reorder Qty</strong> = suggested quantity to order when restocking.
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-[1fr_100px_100px_120px_120px] gap-4 px-4 py-3 bg-gray-50 border-b border-border">
          <span className="text-xs font-medium text-text-muted">Product</span>
          <span className="text-xs font-medium text-text-muted">SKU</span>
          <span className="text-xs font-medium text-text-muted text-right">Current Stock</span>
          <span className="text-xs font-medium text-text-muted">Reorder Level</span>
          <span className="text-xs font-medium text-text-muted">Reorder Qty</span>
        </div>

        <div className="max-h-[calc(100vh-380px)] overflow-y-auto divide-y divide-border">
          {filtered.map((item) => {
            const e = edits[item.productId] || { reorderAt: 0, reorderQty: '' };
            const reorderAtValue = parseFloat(e.reorderAt) || 0;
            const isLow = item.quantity <= reorderAtValue && reorderAtValue > 0;
            return (
              <div
                key={item.productId}
                className={cn(
                  'grid grid-cols-[1fr_100px_100px_120px_120px] gap-4 px-4 py-2.5 items-center hover:bg-gray-50/50 transition-colors',
                  isLow && item.quantity > 0 && 'bg-amber-50/50',
                  item.quantity === 0 && 'bg-red-50/30',
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{item.productName}</div>
                  {item.category && <div className="text-xs text-text-muted truncate">{item.category}</div>}
                </div>
                <div className="text-sm text-text-muted truncate">{item.sku || '—'}</div>
                <div className={cn(
                  'text-sm font-medium text-right',
                  item.quantity === 0 ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-text-primary'
                )}>
                  {formatStockNumber(item.quantity)}
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  className="h-8 text-sm"
                  value={e.reorderAt}
                  onChange={(ev) => updateEdit(item.productId, 'reorderAt', sanitizeStockDecimalInput(ev.target.value))}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  className="h-8 text-sm"
                  value={e.reorderQty}
                  onChange={(ev) => updateEdit(item.productId, 'reorderQty', sanitizeStockDecimalInput(ev.target.value))}
                  placeholder="—"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
