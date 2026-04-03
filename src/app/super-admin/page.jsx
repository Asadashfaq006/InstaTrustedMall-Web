'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Users,
  FileCheck,
  Key,
  TrendingUp,
  Activity,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useSocketEvent } from '@/providers/SocketProvider';

const API_BASE = '/api';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/super-admin/stats`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success) setStats(data.data);
      else setError(data.error || 'Failed to load stats');
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Network error. Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Re-fetch when tab becomes visible or window regains focus
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStats(); };
    const onFocus = () => fetchStats();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchStats]);

  // Real-time refresh on platform events
  useSocketEvent('approvals:new', fetchStats);
  useSocketEvent('approvals:approved', fetchStats);
  useSocketEvent('approvals:rejected', fetchStats);
  useSocketEvent('platform:change', fetchStats);

  const statCards = stats
    ? [
        { label: 'Total Businesses', value: stats.totalBusinesses, icon: Building2, color: 'bg-indigo-600' },
        { label: 'Active Businesses', value: stats.activeBusinesses, icon: TrendingUp, color: 'bg-emerald-600' },
        { label: 'Total Admins', value: stats.totalAdmins, icon: Users, color: 'bg-violet-600' },
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-sky-600' },
        { label: 'Pending Approvals', value: stats.pendingRequests, icon: FileCheck, color: 'bg-amber-500' },
        { label: 'Active Licenses', value: stats.activeLicenses, icon: Key, color: 'bg-teal-600' },
      ]
    : [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Platform Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of the InstaMall platform</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-red-100 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-700 font-medium mb-1">Could not load dashboard</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={fetchStats} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <div className={`${color} rounded-lg p-2`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/super-admin/approvals"
            className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-amber-300 hover:shadow-md transition group"
          >
            <div className="bg-amber-100 rounded-lg p-3 group-hover:bg-amber-200 transition">
              <FileCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Review Approvals</p>
              <p className="text-sm text-slate-500">
                {stats?.pendingRequests || 0} pending
              </p>
            </div>
          </a>
          <a
            href="/super-admin/businesses"
            className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-md transition group"
          >
            <div className="bg-indigo-100 rounded-lg p-3 group-hover:bg-indigo-200 transition">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Manage Businesses</p>
              <p className="text-sm text-slate-500">View all businesses</p>
            </div>
          </a>
          <a
            href="/super-admin/licenses"
            className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-teal-300 hover:shadow-md transition group"
          >
            <div className="bg-teal-100 rounded-lg p-3 group-hover:bg-teal-200 transition">
              <Key className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Manage Licenses</p>
              <p className="text-sm text-slate-500">Subscriptions &amp; plans</p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 text-slate-400">
            <Activity className="h-5 w-5" />
            <p className="text-sm">Activity feed will appear here as the platform grows.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
