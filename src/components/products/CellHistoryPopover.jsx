import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ArrowRight, Clock } from 'lucide-react';

export default function CellHistoryPopover({ open, onOpenChange, data }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && data) {
      loadHistory();
    }
  }, [open, data]);

  const loadHistory = async () => {
    if (!data?.productId || !data?.columnId) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.products.getCellHistory({
        productId: data.productId,
        columnId: data.columnId,
      });
      if (result.success) {
        setHistory(result.data);
      }
    } catch (err) {
      console.error('Failed to load cell history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" />
            Change History — {data?.columnName || 'Column'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-6 text-text-muted text-sm">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm">
              No changes recorded yet
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted line-through truncate max-w-[120px]">
                        {entry.old_value || '(empty)'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                      <span className="font-medium text-text-primary truncate max-w-[120px]">
                        {entry.new_value || '(empty)'}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {new Date(entry.changed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
