import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import useStockStore from '@/stores/stockStore';
import useBusinessStore from '@/stores/businessStore';
import { STOCK_IN_REASONS, STOCK_OUT_REASONS, SET_EXACT_REASONS, MOVEMENT_TYPE_COLORS } from '@/constants/stockReasons';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatStockNumber, roundStockNumber, sanitizeStockDecimalInput } from '@/utils/stockNumber';

const TABS = [
  { key: 'in', label: 'Stock In', icon: ArrowDownToLine, color: MOVEMENT_TYPE_COLORS.in },
  { key: 'out', label: 'Stock Out', icon: ArrowUpFromLine, color: MOVEMENT_TYPE_COLORS.out },
  { key: 'set', label: 'Set Exact', icon: RefreshCw, color: MOVEMENT_TYPE_COLORS.adjustment },
];

export default function StockAdjustModal({ open, onOpenChange, product, initialTab = 'in' }) {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const { adjustIn, adjustOut, adjustExact } = useStockStore();

  const [tab, setTab] = useState(initialTab);
  const [quantity, setQuantity] = useState('');
  const [inputMode, setInputMode] = useState('units'); // 'units' or 'packs'
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [currentStock, setCurrentStock] = useState(0);
  const [packQty, setPackQty] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && product) {
      setTab(initialTab);
      setQuantity('');
      setInputMode('units');
      setReason('');
      setNotes('');
      setPackQty(product.packQty || 1);
      // Fetch current stock level
      window.electronAPI.stock.getLevel(product.id || product.productId).then(res => {
        if (res.success) setCurrentStock(res.data.quantity);
      });
    }
  }, [open, product, initialTab]);

  const reasons = tab === 'in' ? STOCK_IN_REASONS : tab === 'out' ? STOCK_OUT_REASONS : SET_EXACT_REASONS;

  // Get effective quantity in units based on input mode
  const getEffectiveQty = () => {
    const raw = parseFloat(quantity) || 0;
    if (inputMode === 'packs' && packQty > 1) return roundStockNumber(raw * packQty);
    return roundStockNumber(raw);
  };

  const getPreview = () => {
    const qty = getEffectiveQty();
    if (tab === 'in') return roundStockNumber(currentStock + qty);
    if (tab === 'out') return roundStockNumber(Math.max(0, currentStock - qty));
    return roundStockNumber(qty); // set
  };

  const isValid = () => {
    const qty = getEffectiveQty();
    if (isNaN(qty) || qty < 0) return false;
    if (tab !== 'set' && qty === 0) return false;
    if (!reason) return false;
    if (tab === 'out' && qty > currentStock) return false;
    return true;
  };

  // Format units as packs + loose for display
  const formatPacksAndUnits = (totalUnits) => {
    if (packQty <= 1) return formatStockNumber(totalUnits);
    const packs = Math.floor(totalUnits / packQty);
    const loose = roundStockNumber(totalUnits % packQty);
    if (packs > 0 && loose > 0) return `${packs}pk + ${formatStockNumber(loose)}u`;
    if (packs > 0) return `${packs}pk`;
    return `${formatStockNumber(loose)}u`;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setSaving(true);

    const productId = product.id || product.productId;
    const qty = getEffectiveQty();
    let res;

    if (tab === 'in') {
      res = await adjustIn({ businessId: activeBusiness.id, productId, quantity: qty, reason, notes });
    } else if (tab === 'out') {
      res = await adjustOut({ businessId: activeBusiness.id, productId, quantity: qty, reason, notes });
    } else {
      res = await adjustExact({ businessId: activeBusiness.id, productId, newQuantity: qty, reason, notes });
    }

    setSaving(false);

    if (res.success) {
      toast({
        title: 'Stock Updated',
        description: `${product.name || product.productName}: ${formatPacksAndUnits(currentStock)} → ${formatPacksAndUnits(getPreview())} (${getPreview()} units)`,
      });
      onOpenChange(false);
    } else {
      if (res.error === 'insufficient_stock') {
        toast({ title: 'Insufficient Stock', description: `Only ${res.available} available`, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>{product.name || product.productName} {product.sku ? `(${product.sku})` : ''}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setReason(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all',
                    active
                      ? 'bg-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                  style={active ? { color: t.color.text } : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Current Stock Display */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div>
              <div className="text-xs text-text-muted">Current Stock</div>
              <div className="text-2xl font-bold text-text-primary">{formatPacksAndUnits(currentStock)}</div>
              {packQty > 1 && <div className="text-[11px] text-text-muted">{currentStock} total units</div>}
            </div>
            <div className="text-center">
              <div className="text-xs text-text-muted">→</div>
              <div className="text-lg text-text-muted">→</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">After</div>
              <div
                className="text-2xl font-bold"
                style={{ color: TABS.find(t => t.key === tab)?.color.text }}
              >
                {quantity ? formatPacksAndUnits(getPreview()) : '—'}
              </div>
              {packQty > 1 && quantity && <div className="text-[11px] text-text-muted">{getPreview()} total units</div>}
            </div>
          </div>

          {/* Quantity with Units/Packs toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{tab === 'set' ? 'New Quantity' : 'Quantity'}</Label>
              {packQty > 1 && (
                <div className="flex gap-1 p-0.5 bg-gray-100 rounded-md">
                  <button
                    onClick={() => { setInputMode('units'); setQuantity(''); }}
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded transition-all',
                      inputMode === 'units' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'
                    )}
                  >
                    Units
                  </button>
                  <button
                    onClick={() => { setInputMode('packs'); setQuantity(''); }}
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded transition-all',
                      inputMode === 'packs' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'
                    )}
                  >
                    Packs ({packQty}/pk)
                  </button>
                </div>
              )}
            </div>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(sanitizeStockDecimalInput(e.target.value))}
              placeholder={inputMode === 'packs' ? `Enter packs (×${packQty} units)` : tab === 'set' ? 'Enter exact quantity in units' : 'Enter quantity in units'}
              autoFocus
            />
            {inputMode === 'packs' && packQty > 1 && parseFloat(quantity) > 0 && (
              <p className="text-xs text-text-muted">= {formatStockNumber(getEffectiveQty())} units</p>
            )}
            {tab === 'out' && getEffectiveQty() > currentStock && (
              <p className="text-xs text-red-500">Cannot exceed current stock ({formatPacksAndUnits(currentStock)})</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note about this adjustment..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid() || saving}
            style={{
              backgroundColor: TABS.find(t => t.key === tab)?.color.text,
              borderColor: TABS.find(t => t.key === tab)?.color.text,
            }}
            className="text-white"
          >
            {saving ? 'Saving...' : tab === 'in' ? 'Add Stock' : tab === 'out' ? 'Remove Stock' : 'Set Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
