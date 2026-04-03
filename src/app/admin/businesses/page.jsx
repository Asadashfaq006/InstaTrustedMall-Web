'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Building2, ArrowRight, Plus, Users, Package, Loader2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useSocketEvent } from '@/providers/SocketProvider';

const API_BASE = '/api';

export default function MyBusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin-portal/businesses`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success) setBusinesses(data.data);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  // Real-time: refresh when business approved or platform changes
  useSocketEvent('approvals:approved', fetchBusinesses);
  useSocketEvent('platform:change', fetchBusinesses);

  const toggleBusiness = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin-portal/businesses/${id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchBusinesses();
    } catch (_) {}
  };

  const deleteBusiness = async (b) => {
    if (!confirm(`Are you sure you want to delete "${b.name}"? All users, products, and data will be permanently removed.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin-portal/businesses/${b.id}/delete`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchBusinesses();
      else alert(data.error || 'Failed to delete business');
    } catch (_) {}
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Businesses</h1>
          <p className="text-slate-500 mt-1">All businesses linked to your account</p>
        </div>
        <Link
          href="/admin/new-business"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" />
          Request New Business
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">You don&apos;t have any businesses yet</p>
          <Link
            href="/admin/new-business"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Request Your First Business
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((b) => (
            <div key={b.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="mb-4">
                <h3 className="font-semibold text-lg text-slate-900">{b.name}</h3>
                <p className="text-sm text-slate-500 capitalize">{b.type}</p>
              </div>
              <div className="flex gap-4 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.user_count} users</span>
                <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{b.product_count} products</span>
                {b.plan && <span className="capitalize">{b.plan} plan</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  b.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                  b.approval_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {b.approval_status?.charAt(0).toUpperCase() + b.approval_status?.slice(1)}
                </span>
                {b.approval_status === 'approved' && (
                  <Link
                    href={`/dashboard?businessId=${b.id}`}
                    className="flex items-center gap-1 text-sm text-emerald-600 font-medium hover:underline"
                  >
                    Open <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
              {b.approval_status === 'approved' && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBusiness(b.id)}
                      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                      title={b.is_active ? 'Set Inactive' : 'Set Active'}
                    >
                      {b.is_active ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-400" />
                      )}
                      <span className="text-xs">{b.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => deleteBusiness(b)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition"
                    title="Delete business"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
