'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, X, Eye, EyeOff, Loader2, ToggleLeft, ToggleRight, Trash2, Shield, ChevronDown, ChevronUp, Save } from 'lucide-react';

const API_BASE = '/api';

const MODULE_LIST = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Products / Inventory' },
  { key: 'stock', label: 'Stock Control' },
  { key: 'buyers', label: 'Buyers' },
  { key: 'demands', label: 'Demands / Orders' },
  { key: 'sales', label: 'Sales' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'reports', label: 'Reports' },
  { key: 'labels', label: 'Labels / Scanner' },
  { key: 'scanner', label: 'Scanner' },
  { key: 'settings', label: 'Settings' },
];

export default function TeamPage() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'salesperson', pin: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const [moduleAccess, setModuleAccess] = useState({});
  const [savingModules, setSavingModules] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: '', role: '', password: '', pin: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch businesses
  useEffect(() => {
    async function fetchBusinesses() {
      try {
        const res = await fetch(`${API_BASE}/admin-portal/businesses`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setBusinesses(data.data);
          setSelectedBiz(data.data[0].id);
        }
      } catch (_) {}
      setLoading(false);
    }
    fetchBusinesses();
  }, []);

  // Fetch users for selected business
  useEffect(() => {
    if (!selectedBiz) return;
    fetchUsers();
  }, [selectedBiz]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin-portal/users/${selectedBiz}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (_) {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch(`${API_BASE}/admin-portal/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, businessId: selectedBiz }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ email: '', password: '', displayName: '', role: 'salesperson', pin: '' });
        fetchUsers();
      } else {
        setCreateError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleUser = async (userId, isActive) => {
    const action = isActive ? 'deactivate' : 'reactivate';
    try {
      const res = await fetch(`${API_BASE}/admin-portal/users/${userId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch (_) {}
  };

  const deleteUser = async (userId, name) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin-portal/users/${userId}/delete`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch (_) {}
  };

  const toggleModuleAccess = async (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);
    try {
      const res = await fetch(`${API_BASE}/admin-portal/users/${userId}/modules`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setModuleAccess(data.data || {});
      }
    } catch (_) {}
  };

  const saveModuleAccess = async (userId) => {
    setSavingModules(true);
    try {
      const res = await fetch(`${API_BASE}/admin-portal/users/${userId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ modules: moduleAccess }),
      });
      const data = await res.json();
      if (data.success) setExpandedUser(null);
    } catch (_) {}
    setSavingModules(false);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setEditForm({ displayName: user.display_name, role: user.role, password: '', pin: '' });
    setEditError('');
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const body = { displayName: editForm.displayName, role: editForm.role };
      if (editForm.password) body.password = editForm.password;
      if (editForm.pin) body.pin = editForm.pin;
      const res = await fetch(`${API_BASE}/admin-portal/users/${editingUser.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchUsers();
      } else {
        setEditError(data.error || 'Failed to update');
      }
    } catch (err) {
      setEditError(err.message);
    }
    setSaving(false);
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500 mt-1">Manage team members across your businesses</p>
        </div>
        {selectedBiz && (
          <button
            onClick={() => { setShowCreate(true); setCreateError(''); }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Team Member
          </button>
        )}
      </div>

      {/* Business Selector */}
      {businesses.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Business</label>
          <select
            value={selectedBiz || ''}
            onChange={(e) => setSelectedBiz(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Users Table */}
      {businesses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No businesses yet. Request a business first to add team members.</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-3">No team members yet</p>
          <button
            onClick={() => { setShowCreate(true); setCreateError(''); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add First Member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Email</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Role</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Last Login</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Status</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <React.Fragment key={u.id}>
                <tr className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: u.avatar_color || '#2E86AB' }}
                      >
                        {u.display_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{u.display_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.email || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditUser(u)}
                        className="text-slate-400 hover:text-blue-600 transition p-1"
                        title="Edit user"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => toggleModuleAccess(u.id)}
                        className={`transition p-1 ${expandedUser === u.id ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
                        title="Module access"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleUser(u.id, u.is_active)}
                        className="text-slate-400 hover:text-slate-700 transition p-1"
                        title={u.is_active ? 'Disable user' : 'Enable user'}
                      >
                        {u.is_active ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-slate-400" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteUser(u.id, u.display_name)}
                        className="text-slate-400 hover:text-red-600 transition p-1"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedUser === u.id && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 bg-slate-50/80">
                      <div className="max-w-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-4 w-4 text-emerald-600" />
                          <h4 className="text-sm font-semibold text-slate-700">Module Access for {u.display_name}</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {MODULE_LIST.map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={moduleAccess[key] !== false}
                                onChange={(e) => setModuleAccess({ ...moduleAccess, [key]: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                              />
                              <span className="text-sm text-slate-600 group-hover:text-slate-800">{label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => saveModuleAccess(u.id)}
                            disabled={savingModules}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {savingModules ? 'Saving...' : 'Save Access'}
                          </button>
                          <button
                            onClick={() => setExpandedUser(null)}
                            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Add Team Member</h2>
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="Team member name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                >
                  <option value="manager">Manager</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="viewer">Viewer</option>
                </select>
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inventory PIN <span className="text-slate-400 font-normal">(for POS login)</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="4-6 digit PIN"
                />
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
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  {creating ? 'Creating...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit {editingUser.display_name}</h2>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{editError}</div>
            )}

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                >
                  <option value="manager">Manager</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password <span className="text-slate-400 font-normal">(leave blank to keep)</span></label>
                <input
                  type="password"
                  minLength={8}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inventory PIN <span className="text-slate-400 font-normal">(leave blank to keep)</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={editForm.pin}
                  onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="4-6 digit PIN"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
