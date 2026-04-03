import React, { useEffect, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import PermissionGate from '@/components/auth/PermissionGate';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Package, Users, ShoppingCart, DollarSign,
  AlertTriangle, XCircle, TrendingUp, CreditCard,
  RefreshCw, BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import useAuditStore from '@/stores/auditStore';
import usePlatformAuthStore from '@/stores/platformAuthStore';
import useAuthStore from '@/stores/authStore';
import { getBusinessTypeInfo } from '@/constants/businessPresets';
import RecentActivityFeed from '@/components/audit/RecentActivityFeed';

function StatCard({ icon: Icon, label, value, color, bgColor, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-border p-5 text-left hover:shadow-md transition-shadow w-full"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide font-semibold mb-1">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${bgColor || 'bg-blue-50'}`}>
          <Icon className={`w-5 h-5 ${color || 'text-blue-600'}`} />
        </div>
      </div>
    </button>
  );
}

function formatCurrency(val, symbol = '₹') {
  if (val == null) return `${symbol}0`;
  const num = Number(val);
  if (num >= 100000) return `${symbol}${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${symbol}${(num / 1000).toFixed(1)}K`;
  return `${symbol}${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBusinessId = searchParams.get('businessId');
  const navigate = (path) => router.push(path);
  const { activeBusiness, switchBusiness } = useBusinessStore();
  const { dashboardStats: stats, dashboardLoading, loadDashboard, lastRefreshed } = useReportStore();
  const { recentActivity, fetchRecentActivity } = useAuditStore();
  const platformUser = usePlatformAuthStore((s) => s.user);
  const platformAuth = usePlatformAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [businessOverride, setBusinessOverride] = useState(null);

  const inventoryBusinessId = usePlatformAuthStore((s) => s.inventoryBusinessId);

  // Determine display name: admin name if admin session, otherwise PIN user name
  const isAdminViewing = platformAuth && platformUser?.role === 'admin' && !!(urlBusinessId || inventoryBusinessId);
  const displayName = isAdminViewing
    ? (platformUser.displayName || platformUser.display_name || 'Admin')
    : (currentUser?.display_name || null);

  // When businessId is in URL (e.g. admin clicking "Open Dashboard"), switch to that business.
  // Also re-runs if activeBusiness changes (guards against providers.jsx accidentally
  // switching to a stale PIN-user's business, causing a flicker).
  useEffect(() => {
    if (urlBusinessId) {
      const targetId = parseInt(urlBusinessId, 10);
      if (activeBusiness?.id !== targetId) {
        switchBusiness(targetId).then((biz) => {
          if (biz) setBusinessOverride(biz);
        }).catch(() => {
          // If switchBusiness fails (e.g. no active business yet), fetch directly
          window.electronAPI?.businesses?.getAll?.().then((res) => {
            if (res.success) {
              const match = res.data.find(b => b.id === targetId);
              if (match) setBusinessOverride(match);
            }
          });
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBusinessId, activeBusiness?.id]);

  const displayBusiness = businessOverride || activeBusiness;
  const effectiveId = urlBusinessId ? parseInt(urlBusinessId, 10) : activeBusiness?.id;

  const refresh = useCallback(() => {
    if (effectiveId) {
      loadDashboard(effectiveId);
      fetchRecentActivity(effectiveId, 15);
    }
  }, [effectiveId, loadDashboard, fetchRecentActivity]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!displayBusiness && !urlBusinessId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const typeInfo = getBusinessTypeInfo(displayBusiness?.type);
  const cur = displayBusiness?.currency_symbol || '₹';

  // Prepare chart data
  const dayData = (stats?.revenueByDay || []).map(r => ({
    name: format(parseISO(r.day), 'EEE'),
    revenue: r.revenue,
    orders: r.demand_count,
  }));

  const monthData = (stats?.revenueByMonth || []).map(r => ({
    name: format(parseISO(r.month + '-01'), 'MMM yy'),
    revenue: r.revenue,
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-text-primary">
            {greeting}{displayName ? `, ${displayName}` : ''}! 👋
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {typeInfo?.icon} {displayBusiness?.name} — {typeInfo?.label}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/reports')}
          >
            <BarChart2 className="w-4 h-4 mr-1.5" />
            All Reports
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={dashboardLoading}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${dashboardLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {lastRefreshed && (
        <p className="text-[10px] text-text-muted -mt-4">
          Updated {format(lastRefreshed, 'h:mm a')}
        </p>
      )}

      {/* Stat Cards - Row 1: Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PermissionGate permission="dashboard:viewRevenue">
          <StatCard
            icon={DollarSign}
            label="Today's Revenue"
            value={formatCurrency(stats?.todayRevenue, cur)}
            subtitle={`${stats?.todayDemandCount || 0} orders`}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
        </PermissionGate>
        <PermissionGate permission="dashboard:viewRevenue">
          <StatCard
            icon={TrendingUp}
            label="This Week"
            value={formatCurrency(stats?.weekRevenue, cur)}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
        </PermissionGate>
        <PermissionGate permission="dashboard:viewRevenue">
          <StatCard
            icon={ShoppingCart}
            label="This Month"
            value={formatCurrency(stats?.monthRevenue, cur)}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
        </PermissionGate>
        <StatCard
          icon={CreditCard}
          label="Outstanding"
          value={formatCurrency(stats?.outstandingAmount, cur)}
          subtitle={`${stats?.outstandingOrderCount || 0} orders unpaid`}
          color="text-orange-600"
          bgColor="bg-orange-50"
          onClick={() => navigate('/reports/buyer-outstanding')}
        />
      </div>

      {/* Stat Cards - Row 2: Inventory + Collection */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <PermissionGate permission="dashboard:viewRevenue">
          <StatCard
            icon={DollarSign}
            label="Total Collected"
            value={formatCurrency(stats?.totalCollected, cur)}
            subtitle="all payments"
            color="text-green-600"
            bgColor="bg-green-50"
          />
        </PermissionGate>
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats?.totalProducts ?? 0}
          color="text-navy"
          bgColor="bg-blue-50"
          onClick={() => navigate('/products')}
        />
        <StatCard
          icon={Users}
          label="Active Buyers"
          value={stats?.totalBuyerCount ?? 0}
          color="text-teal-600"
          bgColor="bg-teal-50"
          onClick={() => navigate('/buyers')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={stats?.lowStockCount ?? 0}
          color="text-amber-600"
          bgColor="bg-amber-50"
          onClick={() => navigate('/reports/low-stock')}
        />
        <StatCard
          icon={XCircle}
          label="Out of Stock"
          value={stats?.outOfStockCount ?? 0}
          color="text-red-600"
          bgColor="bg-red-50"
          onClick={() => navigate('/reports/low-stock')}
        />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* 7-Day Revenue */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Last 7 Days Revenue</h3>
            {dayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dayData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatCurrency(v, cur)} width={60} />
                  <Tooltip
                    formatter={(v) => [`${cur}${Number(v).toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-text-muted text-center py-12">No sales data for the last 7 days</p>
            )}
          </div>

          {/* 6-Month Revenue Trend */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Revenue Trend</h3>
            {monthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatCurrency(v, cur)} width={60} />
                  <Tooltip
                    formatter={(v) => [`${cur}${Number(v).toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-text-muted text-center py-10">No monthly data yet</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-border p-5 max-h-[520px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Recent Activity</h3>
          <RecentActivityFeed entries={recentActivity} maxItems={15} />
        </div>
      </div>
    </div>
  );
}
