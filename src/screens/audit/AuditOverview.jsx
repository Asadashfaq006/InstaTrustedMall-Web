import React, { useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Package, BarChart3, FileText, TrendingUp } from 'lucide-react';
import useBusinessStore from '@/stores/businessStore';
import useAuditStore from '@/stores/auditStore';
import RecentActivityFeed from '@/components/audit/RecentActivityFeed';

const ACTION_COLORS = {
  CREATE: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
  UPDATE: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  DELETE: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  CONFIRM: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
  CANCEL: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  PAYMENT: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
};

export default function AuditOverview() {
  const { activeBusiness } = useBusinessStore();
  const { stats, statsLoading, recentActivity, fetchStats, fetchRecentActivity } = useAuditStore();

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchStats(activeBusiness.id);
      fetchRecentActivity(activeBusiness.id, 25);
    }
  }, [activeBusiness?.id]);

  const statCards = [
    {
      label: 'Total Events',
      value: stats?.total ?? 0,
      icon: Activity,
      color: 'text-navy',
      bgColor: 'bg-navy/10',
    },
    {
      label: 'Product Edits',
      value: stats?.byEntity?.product ?? 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Stock Changes',
      value: stats?.byEntity?.stock ?? 0,
      icon: BarChart3,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Demand Events',
      value: stats?.byEntity?.demand ?? 0,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  // Build action breakdown from stats
  const actionBreakdown = stats?.byAction
    ? Object.entries(stats.byAction).sort((a, b) => b[1] - a[1])
    : [];
  const maxActionCount = actionBreakdown.length > 0 ? actionBreakdown[0][1] : 1;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-border p-4 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}
            >
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {statsLoading ? '–' : card.value.toLocaleString()}
              </p>
              <p className="text-xs text-text-muted">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Activity Breakdown */}
        <div className="col-span-1 bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Activity Breakdown
          </h3>
          {actionBreakdown.length === 0 ? (
            <p className="text-xs text-text-muted">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {actionBreakdown.map(([action, count]) => {
                const colors = ACTION_COLORS[action] || ACTION_COLORS.UPDATE;
                const pct = Math.round((count / maxActionCount) * 100);
                return (
                  <div key={action}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-medium ${colors.text}`}>{action}</span>
                      <span className="text-text-muted">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="col-span-2 bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Activity
          </h3>
          <RecentActivityFeed entries={recentActivity} maxItems={15} />
        </div>
      </div>

      {/* Retroactive notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
        <strong>Note:</strong> Audit logging was enabled from the moment Module 6 was installed.
        Actions taken before this point are not captured in the audit log.
      </div>
    </div>
  );
}
