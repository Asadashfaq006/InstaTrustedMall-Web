'use client';

import { useEffect, useState, useCallback } from 'react';
import { Building2, Loader2, Users, Package, Key, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useSocketEvent } from '@/providers/SocketProvider';

const API_BASE = '/api';

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/businesses`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success) setBusinesses(data.data);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  // Real-time: refresh when business approved or platform changes
  useSocketEvent('approvals:approved', fetchBusinesses);
  useSocketEvent('platform:change', fetchBusinesses);

  const toggleBusiness = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/businesses/${id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchBusinesses();
    } catch (_) {}
  };

  const deleteBusiness = async (b) => {
    if (!confirm(`Are you sure you want to delete "${b.name}"? All users, products to this business will be permanently removed.`)) return;
    try {
      const res = await fetch(`${API_BASE}/super-admin/businesses/${b.id}/delete`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchBusinesses();
      else alert(data.error || 'Failed to delete');
    } catch (_) {}
  };

  const planBadge = (plan) => {
    const styles = {
      starter: 'bg-slate-100 text-slate-700',
      professional: 'bg-indigo-100 text-indigo-700',
      enterprise: 'bg-violet-100 text-violet-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[plan] || styles.starter}`}>
        {plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'No Plan'}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">All Businesses</h1>
        <p className="text-slate-500 mt-1">Manage all registered businesses on the platform</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No businesses registered yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Business</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Owner</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Type</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Plan</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Users</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Products</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Status</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{b.name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {b.admin_name || '—'}
                    {b.admin_email && <div className="text-xs text-slate-400">{b.admin_email}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{b.type}</td>
                  <td className="px-6 py-4">{planBadge(b.plan)}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{b.user_count || 0}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{b.product_count || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleBusiness(b.id)}
                        title={b.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg transition ${b.is_active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      >
                        {b.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => deleteBusiness(b)}
                        title="Delete business"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
