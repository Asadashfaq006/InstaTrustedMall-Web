'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import usePlatformAuthStore from '@/stores/platformAuthStore';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileCheck,
  Key,
  LogOut,
  Shield,
  Loader2,
} from 'lucide-react';

const navItems = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/businesses', label: 'Businesses', icon: Building2 },
  { href: '/super-admin/admins', label: 'Admins', icon: Users },
  { href: '/super-admin/approvals', label: 'Approvals', icon: FileCheck },
  { href: '/super-admin/licenses', label: 'Licenses', icon: Key },
];

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, checkSession } = usePlatformAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const verify = async () => {
      // Optimistic fast-path: show immediately if local state looks right
      const state = usePlatformAuthStore.getState();
      const hasLocal = state.isAuthenticated && state.user?.role === 'super_admin';
      if (hasLocal) setReady(true);

      // Authoritative check — reads the sa_token cookie directly
      const valid = await checkSession('super_admin');
      const updated = usePlatformAuthStore.getState();
      if (!valid || updated.user?.role !== 'super_admin') {
        setReady(false);
        router.replace('/');
      } else {
        setReady(true);
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
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col text-white shadow-xl">
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-display text-lg tracking-tight">
                <span className="text-indigo-400 font-bold">Insta</span>
                <span className="text-white font-bold">Mall</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Super Admin</p>
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
                    ? 'bg-indigo-500/15 text-indigo-300 shadow-sm shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
              {user?.displayName?.charAt(0) || user?.display_name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || user?.display_name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-white/[0.06] transition"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
