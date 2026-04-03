import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import useAuditStore from '@/stores/auditStore';
import { cn, parseDbDate } from '@/lib/utils';

const ACTION_BADGE = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  SOFT_DELETE: 'bg-red-50 text-red-600',
  HARD_DELETE: 'bg-red-200 text-red-800',
  RESTORE: 'bg-teal-100 text-teal-700',
  CONFIRM: 'bg-purple-100 text-purple-700',
  CANCEL: 'bg-amber-100 text-amber-700',
  REOPEN: 'bg-indigo-100 text-indigo-700',
  PAYMENT: 'bg-emerald-100 text-emerald-700',
  STOCK_IN: 'bg-green-100 text-green-700',
  STOCK_OUT: 'bg-red-100 text-red-700',
  STOCK_ADJUST: 'bg-blue-100 text-blue-700',
  ARCHIVE: 'bg-gray-100 text-gray-600',
};

/**
 * Shows a timeline of audit events for a specific entity.
 * Props:
 *   entityType  - 'product' | 'buyer' | 'demand' | etc.
 *   entityId    - ID of the entity
 *   limit       - max records to fetch (default 30)
 *   className   - optional CSS
 */
export default function EntityAuditTrail({ entityType, entityId, limit = 30, className }) {
  const { fetchEntityAudit } = useAuditStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!entityType || !entityId) return;
    let cancel = false;
    setLoading(true);
    fetchEntityAudit(entityType, entityId, limit).then((data) => {
      if (!cancel) {
        setEvents(data || []);
        setLoading(false);
      }
    });
    return () => { cancel = true; };
  }, [entityType, entityId, limit]);

  if (loading) {
    return (
      <div className={cn('py-6 text-center text-xs text-text-muted', className)}>
        Loading activity...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={cn('py-6 text-center text-xs text-text-muted', className)}>
        <Activity className="w-5 h-5 mx-auto mb-2 opacity-40" />
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className={cn('space-y-0 relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />

      {events.map((ev, idx) => {
        const actionColor = ACTION_BADGE[ev.action] || ACTION_BADGE.UPDATE;
        let detail = null;
        try {
          if (ev.detail_json) detail = JSON.parse(ev.detail_json);
        } catch { /* ignore */ }
        const isExpanded = expanded === ev.id;

        return (
          <div key={ev.id} className="relative flex items-start gap-3 py-2 pl-1">
            {/* Dot */}
            <div className="w-[14px] h-[14px] rounded-full flex-shrink-0 mt-0.5 bg-navy/80 ring-2 ring-white" />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge className={cn('text-[10px] font-medium px-1.5 py-0', actionColor)}>
                  {ev.action}
                </Badge>
                <span className="text-[10px] text-text-muted">
                  {ev.logged_at
                    ? formatDistanceToNow(parseDbDate(ev.logged_at), { addSuffix: true })
                    : '—'}
                </span>
              </div>
              <p className="text-xs text-text-primary mt-0.5">{ev.summary}</p>

              {detail && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : ev.id)}
                  className="text-[10px] text-blue-600 hover:underline mt-0.5 flex items-center gap-0.5"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {isExpanded ? 'Hide' : 'Show'} details
                </button>
              )}

              {isExpanded && detail && (
                <pre className="mt-1 text-[10px] bg-gray-50 rounded p-2 text-text-muted overflow-auto max-h-32 font-mono">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
