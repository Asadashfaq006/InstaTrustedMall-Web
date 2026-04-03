import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, Copy, Trash2, Image as ImageIcon,
  History, ExternalLink, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import useProductStore from '@/stores/productStore';
import { useToast } from '@/components/ui/use-toast';
import StockAdjustModal from '@/components/stock/StockAdjustModal';
import { localFileUrl, parseDbDate } from '@/lib/utils';

export default function ProductDetailPanel({ product, columns, onClose, onEdit, onOpenHistory }) {
  const { softDelete, duplicateProduct } = useProductStore();
  const { toast } = useToast();
  const [stockAdjustOpen, setStockAdjustOpen] = useState(false);
  const [stockAdjustTab, setStockAdjustTab] = useState('in');
  const [stockInfo, setStockInfo] = useState({ quantity: 0, last_moved_at: null });

  useEffect(() => {
    if (product?.id) {
      window.electronAPI.stock.getLevel(product.id).then(res => {
        if (res.success) setStockInfo(res.data);
      });
    }
  }, [product?.id, stockAdjustOpen]);

  if (!product) return null;

  const visibleColumns = columns.filter((c) => c.is_visible);

  const handleDelete = async () => {
    const ok = await softDelete(product.id);
    if (ok) {
      toast({ title: 'Product moved to recycle bin' });
      onClose();
    }
  };

  const handleDuplicate = async () => {
    const result = await duplicateProduct(product.id);
    if (result && !result.error) {
      toast({ title: 'Product duplicated' });
    }
  };

  return (
    <div className="w-[380px] border-l border-border bg-white flex flex-col h-full animate-in slide-in-from-right-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary truncate flex-1">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => onEdit(product)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-accent"
            title="Edit"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Image */}
        {product.image_path ? (
          <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 border border-border">
            <img src={localFileUrl(product.image_path)} alt={product.name} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-full aspect-square rounded-xl bg-gray-50 border border-border flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Core Fields */}
        <div className="space-y-3">
          <DetailField label="Product Name" value={product.name} />
          <DetailField label="SKU" value={product.sku} mono />
          <DetailField label="Barcode" value={product.barcode} mono />
          <DetailField label="Category" value={product.category}>
            {product.category && <Badge variant="secondary">{product.category}</Badge>}
          </DetailField>
        </div>

        {/* Stock Info */}
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Stock
          </h4>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Current Stock</span>
              <span className={`text-lg font-bold ${stockInfo.quantity === 0 ? 'text-red-600' : 'text-text-primary'}`}>
                {stockInfo.quantity}
              </span>
            </div>
            {stockInfo.last_moved_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Last Movement</span>
                <span className="text-xs text-text-secondary">{parseDbDate(stockInfo.last_moved_at)?.toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => { setStockAdjustTab('in'); setStockAdjustOpen(true); }}
              >
                <ArrowDownToLine className="w-3 h-3" />
                Stock In
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => { setStockAdjustTab('out'); setStockAdjustOpen(true); }}
              >
                <ArrowUpFromLine className="w-3 h-3" />
                Stock Out
              </Button>
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        {visibleColumns.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Custom Fields
            </h4>
            <div className="space-y-2">
              {visibleColumns.map((col) => {
                const value = product.values?.[col.id] || '';
                return (
                  <div
                    key={col.id}
                    className="flex items-center justify-between py-1.5 group"
                  >
                    <span className="text-xs text-text-muted">
                      {col.name}
                      {col.type === 'formula' && <span className="ml-1 text-purple-500">ƒx</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm ${col.type === 'formula' ? 'text-purple-600 font-mono' : col.type === 'currency' || col.type === 'number' ? 'font-mono' : ''}`}>
                        {value || '—'}
                      </span>
                      <button
                        onClick={() => onOpenHistory?.({ productId: product.id, columnId: col.id, columnName: col.name })}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-50 hover:!opacity-100 text-text-muted"
                        title="View history"
                      >
                        <History className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Info</h4>
          <div className="space-y-1 text-xs text-text-muted">
            <p>Created: {parseDbDate(product.created_at)?.toLocaleString()}</p>
            <p>Updated: {parseDbDate(product.updated_at)?.toLocaleString()}</p>
            <p>ID: {product.id}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleDuplicate}>
          <Copy className="w-3.5 h-3.5" /> Duplicate
        </Button>
        <Button variant="destructive" size="sm" className="flex-1 gap-1.5" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        open={stockAdjustOpen}
        onOpenChange={setStockAdjustOpen}
        product={product}
        initialTab={stockAdjustTab}
      />
    </div>
  );
}

function DetailField({ label, value, mono, children }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-text-muted">{label}</span>
      {children || (
        <span className={`text-sm text-text-primary ${mono ? 'font-mono' : ''}`}>
          {value || '—'}
        </span>
      )}
    </div>
  );
}
