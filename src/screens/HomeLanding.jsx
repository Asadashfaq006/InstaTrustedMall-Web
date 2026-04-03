/**
 * Home Landing Screen
 * Shown after login as the main entry point to the inventory system.
 * Provides quick navigation tiles to all major modules.
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import useBusinessStore from '@/stores/businessStore';

const MODULES = [
  {
    title: 'Dashboard',
    desc: 'Sales overview & key metrics',
    icon: LayoutDashboard,
    path: '/dashboard',
    accent: '#3B82F6',
    bg: '#EFF6FF',
  },
  {
    title: 'Inventory',
    desc: 'Products, stock & categories',
    icon: Package,
    path: '/products',
    accent: '#10B981',
    bg: '#ECFDF5',
  },
  {
    title: 'Buyers',
    desc: 'Customer directory & ledger',
    icon: Users,
    path: '/buyers',
    accent: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    title: 'Orders',
    desc: 'Demand builder & order history',
    icon: ShoppingCart,
    path: '/demands',
    accent: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    title: 'Reports',
    desc: 'Profit, stock & sales reports',
    icon: BarChart3,
    path: '/reports',
    accent: '#EF4444',
    bg: '#FEF2F2',
  },
  {
    title: 'Settings',
    desc: 'Company, security & integrations',
    icon: Settings,
    path: '/settings/company',
    accent: '#6B7280',
    bg: '#F9FAFB',
  },
];

export default function HomeLanding() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { currentUser, logout } = useAuthStore();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);

  const handleLogout = async () => {
    await logout(activeBusiness?.id);
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at top, #eef2ff 0%, #F8FAFC 60%)' }}
    >
      {/* Logo & greeting */}
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl tracking-tight mb-2">
          <span className="text-indigo-600 font-bold">Insta</span>
          <span className="text-slate-900 font-bold">Mall</span>
        </h1>
        {activeBusiness && (
          <p className="text-sm font-medium text-text-secondary mb-0.5">
            {activeBusiness.name}
          </p>
        )}
        {currentUser ? (
          <p className="text-text-muted text-sm">
            {greeting},{' '}
            <span className="font-semibold text-text-primary">
              {currentUser.display_name}
            </span>{' '}
            👋
          </p>
        ) : (
          <p className="text-text-muted text-sm">{greeting}!</p>
        )}
      </div>

      {/* Module tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
        {MODULES.map(({ title, desc, icon: Icon, path, accent, bg }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: bg }}
            >
              <Icon className="w-5 h-5" style={{ color: accent }} />
            </div>
            <h3 className="font-semibold text-text-primary text-sm leading-tight mb-0.5">
              {title}
            </h3>
            <p className="text-text-muted text-xs leading-snug">{desc}</p>
            <ChevronRight
              className="w-3.5 h-3.5 text-text-muted mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-text-muted text-sm hover:text-text-primary transition-colors focus:outline-none"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}
