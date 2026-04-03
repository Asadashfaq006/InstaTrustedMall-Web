import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, Trash2, RotateCcw, AlertTriangle, Package,
} from 'lucide-react';
import useBusinessStore from '@/stores/businessStore';
import { useToast } from '@/components/ui/use-toast';

export default function RecycleBin() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { activeBusiness } = useBusinessStore();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeBusiness) loadItems();
  }, [activeBusiness]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.products.getRecycleBin(activeBusiness.id);
      if (result.success) {
        setItems(result.data);
      }
    } catch (err) {
      console.error('Failed to load recycle bin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      const result = await window.electronAPI.products.restore(id);
      if (result.success) {
        setItems((prev) => prev.filter((p) => p.id !== id));
        setSelected((prev) => prev.filter((sid) => sid !== id));
        toast({ title: 'Product restored' });
      }
    } catch (err) {
      toast({ title: 'Failed to restore', variant: 'destructive' });
    }
  };

  const handleHardDelete = async (id) => {
    try {
      const result = await window.electronAPI.products.hardDelete(id);
      if (result.success) {
        setItems((prev) => prev.filter((p) => p.id !== id));
        setSelected((prev) => prev.filter((sid) => sid !== id));
        toast({ title: 'Product permanently deleted' });
      }
    } catch (err) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleBulkRestore = async () => {
    for (const id of selected) {
      await handleRestore(id);
    }
    setSelected([]);
  };

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await handleHardDelete(id);
    }
    setSelected([]);
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const allSelected = items.length > 0 && selected.length === items.length;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/products')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-text-muted" />
              Recycle Bin
            </h1>
            <p className="text-sm text-text-muted">
              {items.length} deleted product{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="accent">{selected.length} selected</Badge>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBulkRestore}>
              <RotateCcw className="w-3.5 h-3.5" /> Restore
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Forever
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-20 text-text-muted">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-text-secondary mb-1">Recycle bin is empty</p>
            <p className="text-sm text-text-muted">Deleted products will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              <div className="w-6">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() =>
                    allSelected ? setSelected([]) : setSelected(items.map((p) => p.id))
                  }
                />
              </div>
              <div className="flex-1">Product</div>
              <div className="w-[120px]">SKU</div>
              <div className="w-[160px]">Deleted</div>
              <div className="w-[140px]">Actions</div>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors ${
                  selected.includes(item.id) ? 'bg-accent-light/30' : ''
                }`}
              >
                <div className="w-6">
                  <Checkbox
                    checked={selected.includes(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                  />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-text-primary truncate">{item.name}</span>
                </div>
                <div className="w-[120px] text-sm text-text-muted font-mono truncate">
                  {item.sku || '—'}
                </div>
                <div className="w-[160px] text-xs text-text-muted">
                  {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : '—'}
                </div>
                <div className="w-[140px] flex items-center gap-1">
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => handleRestore(item.id)}>
                    <RotateCcw className="w-3 h-3" /> Restore
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-7 px-2" onClick={() => handleHardDelete(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Warning */}
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold">Permanently deleted products cannot be recovered.</p>
                <p>Restored products will reappear in your product list with all their data intact.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
