'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import usePlatformAuthStore from '@/stores/platformAuthStore';
import { Building2, Plus, Users, Package, TrendingUp, ArrowRight, ShoppingCart, DollarSign, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useSocketEvent } from '@/providers/SocketProvider';

const API_BASE = '/api';

export default function AdminDashboard() {
  const { user } = usePlatformAuthStore();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setError(null);
    let hasError = false;

    try {
      const statsRes = await fetch(`${API_BASE}/admin-portal/stats`, { credentials: 'include', cache: 'no-store' });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.data);
        else hasError = true;
      } else { hasError = true; }
    } catch (_) { hasError = true; }

    try {
      const reqRes = await fetch(`${API_BASE}/approval/my-requests`, { credentials: 'include', cache: 'no-store' });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        if (reqData.success) setRequests(reqData.data);
      }
    } catch (_) {}

    if (hasError) setError('Could not load dashboard data. Please try again.');
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-fetch when tab becomes visible or window regains focus
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData(); };
    const onFocus = () => fetchData();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchData]);

  // Real-time: refresh when approvals change
  useSocketEvent('approvals:new', fetchData);
  useSocketEvent('approvals:approved', fetchData);
  useSocketEvent('approvals:rejected', fetchData);
  useSocketEvent('platform:change', fetchData);

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-red-100 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-700 font-medium mb-1">Could not load dashboard</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.displayName || user?.display_name || 'Admin'}
        </h1>
        <p className="text-slate-500 mt-1">Manage your businesses and team</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">My Businesses</span>
            <div className="bg-emerald-600 rounded-lg p-2"><Building2 className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.totalBusinesses || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">Team Members</span>
            <div className="bg-violet-600 rounded-lg p-2"><Users className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">Total Products</span>
            <div className="bg-sky-600 rounded-lg p-2"><Package className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.totalProducts || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">Revenue</span>
            <div className="bg-amber-500 rounded-lg p-2"><DollarSign className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-3xl font-bold text-slate-900">₨{(stats?.totalRevenue || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* My Businesses */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">My Businesses</h2>
          <Link
            href="/admin/new-business"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            New Business
          </Link>
        </div>

        {(stats?.businesses || []).length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No businesses yet. Request a new business to get started.</p>
            <Link
              href="/admin/new-business"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              Request New Business
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.businesses.map((b) => (
              <div key={b.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-md transition group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{b.name}</h3>
                    <p className="text-sm text-slate-500 capitalize">{b.type}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.users} users</span>
                  <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{b.products} products</span>
                  <span className="flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5" />{b.demands} demands</span>
                </div>
                <Link
                  href={`/dashboard?businessId=${b.id}`}
                  className="flex items-center gap-1 text-sm text-emerald-600 font-medium group-hover:underline"
                >
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Requests</h2>
          <div className="space-y-3">
            {pendingRequests.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-5 shadow-sm border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">{r.business_name}</h3>
                    <p className="text-sm text-slate-500">
                      {r.business_type} &middot; Submitted {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Pending Review
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
