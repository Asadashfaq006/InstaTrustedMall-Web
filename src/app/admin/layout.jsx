'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import usePlatformAuthStore from '@/stores/platformAuthStore';
import { useSocketEvent } from '@/providers/SocketProvider';
import {
  LayoutDashboard,
  Building2,
  Plus,
  Users,
  Settings,
  LogOut,
  Store,
  Loader2,
  Bell,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/businesses', label: 'My Businesses', icon: Building2 },
  { href: '/admin/new-business', label: 'New Business', icon: Plus },
  { href: '/admin/team', label: 'Team', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, checkSession } = usePlatformAuthStore();
  const [ready, setReady] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Fetch existing approval statuses on mount
  const fetchMyRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/approval/my-requests', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const recent = data.data
          .filter(r => r.status !== 'pending' && r.reviewed_at)
          .sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at))
          .slice(0, 10)
          .map(r => ({
            id: r.id,
            type: r.status,
            businessName: r.business_name,
            notes: r.review_notes,
            time: r.reviewed_at,
          }));
        setNotifications(recent);
      }
    } catch (_) {}
  }, []);

  // Socket: real-time approval notifications
  useSocketEvent('approvals:approved', useCallback(() => { fetchMyRequests(); }, [fetchMyRequests]));
  useSocketEvent('approvals:rejected', useCallback(() => { fetchMyRequests(); }, [fetchMyRequests]));

  useEffect(() => {
    const verify = async () => {
      const state = usePlatformAuthStore.getState();
      const hasLocal = state.isAuthenticated && state.user?.role === 'admin';
      if (hasLocal) setReady(true);

      const valid = await checkSession('admin');
      const updated = usePlatformAuthStore.getState();
      if (!valid || updated.user?.role !== 'admin') {
        setReady(false);
        router.replace('/');
      } else {
        setReady(true);
        fetchMyRequests();
      }
    };

    if (usePlatformAuthStore.persist.hasHydrated()) {
      verify();
    } else {
      const unsub = usePlatformAuthStore.persist.onFinishHydration(() => verify());
      return unsub;
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Store className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-display text-lg tracking-tight">
                <span className="text-emerald-600 font-bold">Insta</span>
                <span className="text-slate-800 font-bold">Mall</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Business Owner</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/5'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-emerald-500/20">
              {user?.displayName?.charAt(0) || user?.display_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.displayName || user?.display_name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Notification Panel */}
      {showNotifPanel && (
        <div className="fixed inset-0 z-50" onClick={() => setShowNotifPanel(false)}>
          <div
            className="absolute left-64 bottom-16 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Approval Updates</h3>
              <button onClick={() => setShowNotifPanel(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No updates yet</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition">
                    <div className="flex items-start gap-2.5">
                      {n.type === 'approved' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">
                          <span className="font-medium">{n.businessName}</span>{' '}
                          was <span className={n.type === 'approved' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {n.type}
                          </span>
                        </p>
                        {n.notes && (
                          <p className="text-xs text-slate-500 mt-0.5">Note: {n.notes}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">{new Date(n.time).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
