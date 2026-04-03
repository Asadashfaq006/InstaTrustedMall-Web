'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Loader2, Building2, ToggleLeft, ToggleRight, Plus, X, Eye, EyeOff, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useSocketEvent } from '@/providers/SocketProvider';

const API_BASE = '/api';

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [expandedAdmin, setExpandedAdmin] = useState(null);
  const [adminBusinesses, setAdminBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/admins`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success) setAdmins(data.data);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  // Real-time: refresh on platform changes
  useSocketEvent('platform:change', fetchAdmins);

  const toggleAdmin = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/admins/${id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchAdmins();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch(`${API_BASE}/super-admin/admins/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ email: '', password: '', displayName: '', phone: '' });
        fetchAdmins();
      } else {
        setCreateError(data.error || 'Failed to create admin');
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteAdmin = async (admin) => {
    if (!confirm(`Are you sure you want to delete ${admin.display_name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/super-admin/admins/${admin.id}/delete`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        fetchAdmins();
      } else {
        alert(data.error || 'Failed to delete admin');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const toggleExpand = async (adminId) => {
    if (expandedAdmin === adminId) {
      setExpandedAdmin(null);
      return;
    }
    setExpandedAdmin(adminId);
    setLoadingBusinesses(true);
    try {
      const res = await fetch(`${API_BASE}/super-admin/admins/${adminId}/businesses`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setAdminBusinesses(data.data);
    } catch (_) {}
    setLoadingBusinesses(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admins (Business Owners)</h1>
          <p className="text-slate-500 mt-1">Manage all registered business owners</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          Create Admin
        </button>
      </div>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Create New Admin</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="Admin name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="+92 300 1234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {creating ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No admins registered yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Admin</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Email</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Phone</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Businesses</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Joined</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Status</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((a) => (
                <React.Fragment key={a.id}>
                <tr className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">{a.display_name}</td>
                  <td className="px-6 py-4 text-slate-600">{a.email}</td>
                  <td className="px-6 py-4 text-slate-600">{a.phone || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleExpand(a.id)}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition"
                      title="View businesses"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {a.business_count || 0}
                      {expandedAdmin === a.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {a.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleAdmin(a.id)}
                        className="text-slate-400 hover:text-slate-700 transition"
                        title={a.is_active ? 'Disable admin' : 'Enable admin'}
                      >
                        {a.is_active ? (
                          <ToggleRight className="h-6 w-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-slate-400" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteAdmin(a)}
                        className="text-slate-400 hover:text-red-600 transition"
                        title="Delete admin"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedAdmin === a.id && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-slate-50/80">
                      {loadingBusinesses ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          <span className="text-sm text-slate-500">Loading businesses...</span>
                        </div>
                      ) : adminBusinesses.length === 0 ? (
                        <p className="text-sm text-slate-500 py-2">No businesses for this admin</p>
                      ) : (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Businesses</h4>
                          {adminBusinesses.map((b) => (
                            <div key={b.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200">
                              <div>
                                <span className="font-medium text-slate-900">{b.name}</span>
                                <span className="ml-2 text-xs text-slate-500 capitalize">{b.type}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{b.user_count} users</span>
                                <span className="flex items-center gap-1"><Package className="h-3 w-3" />{b.product_count} products</span>
                                <span className={`px-2 py-0.5 rounded-full font-medium ${
                                  b.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {b.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${
                                  b.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                                  b.approval_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {b.approval_status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
