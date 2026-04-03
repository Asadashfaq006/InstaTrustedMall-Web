import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { History } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import useAuditStore from '@/stores/auditStore';
import { parseDbDate } from '@/lib/utils';

/**
 * Popover that shows the change history for a specific product column cell.
 * Props:
 *   productId   - product ID
 *   columnId    - column ID
 *   columnName  - display name
 *   trigger     - React element (button) that opens the popover
 */
export default function CellHistoryPopover({ productId, columnId, columnName, trigger }) {
  const { fetchColumnHistory } = useAuditStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && productId && columnId) {
      setLoading(true);
      fetchColumnHistory(productId, columnId, 20).then((data) => {
        setHistory(data || []);
        setLoading(false);
      });
    }
  }, [open, productId, columnId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <button className="p-1 hover:bg-gray-100 rounded" title="View cell history">
            <History className="w-3.5 h-3.5 text-text-muted" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 max-h-64 overflow-auto p-3" align="start">
        <p className="text-xs font-semibold text-text-primary mb-2">
          History: {columnName || 'Field'}
        </p>

        {loading ? (
          <p className="text-xs text-text-muted py-3 text-center">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-text-muted py-3 text-center">No changes recorded</p>
        ) : (
          <div className="space-y-2">
            {history.map((h, idx) => (
              <div key={h.id || idx} className="border-b border-border pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500 line-through max-w-[80px] truncate">
                      {h.old_value ?? '—'}
                    </span>
                    <span className="text-[10px] text-text-muted">→</span>
                    <span className="text-xs text-green-700 font-medium max-w-[80px] truncate">
                      {h.new_value ?? '—'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {h.changed_at
                    ? formatDistanceToNow(parseDbDate(h.changed_at), { addSuffix: true })
                    : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
