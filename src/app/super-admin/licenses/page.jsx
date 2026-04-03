'use client';

import { useEffect, useState, useCallback } from 'react';
import { Key, Loader2, Building2 } from 'lucide-react';
import { useSocketEvent } from '@/providers/SocketProvider';

const API_BASE = '/api';

export default function LicensesPage() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLicenses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/licenses`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success) setLicenses(data.data);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLicenses(); }, [fetchLicenses]);

  // Real-time: refresh on approval or platform changes
  useSocketEvent('approvals:approved', fetchLicenses);
  useSocketEvent('platform:change', fetchLicenses);

  const handleToggle = async (businessId, currentStatus) => {
    const action = currentStatus === 'active' ? 'suspend' : 'activate';
    try {
      await fetch(`${API_BASE}/licenses/${businessId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchLicenses();
    } catch (err) {
      console.error(`Toggle failed:`, err);
    }
  };

  const planBadge = (plan) => {
    const styles = {
      starter: 'bg-slate-100 text-slate-700',
      professional: 'bg-indigo-100 text-indigo-700',
      enterprise: 'bg-violet-100 text-violet-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[plan] || styles.starter}`}>
        {plan?.charAt(0).toUpperCase() + plan?.slice(1)}
      </span>
    );
  };

  const statusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-amber-100 text-amber-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Licenses</h1>
        <p className="text-slate-500 mt-1">Manage business subscription licenses</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : licenses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Key className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No licenses issued yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Business</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Owner</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Plan</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Status</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Users</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Products</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Expires</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licenses.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">{l.business_name}</td>
                  <td className="px-6 py-4 text-slate-600">{l.admin_name || '—'}</td>
                  <td className="px-6 py-4">{planBadge(l.plan)}</td>
                  <td className="px-6 py-4">{statusBadge(l.status)}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{l.max_users}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{l.max_products?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggle(l.business_id, l.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        l.status === 'active'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {l.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
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
