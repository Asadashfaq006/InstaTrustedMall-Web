import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  Building2,
  BarChart3,
  ClipboardList,
  PieChart,
  Shield,
  Lock,
  HardDrive,
  Tag,
  ScanLine,
  Keyboard,
  Info,
  ShoppingCart,
  ArrowLeft,
} from 'lucide-react';
import BusinessSwitcher from '@/components/layout/BusinessSwitcher';
import SidebarUserMenu from '@/components/layout/SidebarUserMenu';
import LowStockBadge from '@/components/stock/LowStockBadge';
import OutstandingBuyersBadge from '@/components/buyers/OutstandingBuyersBadge';
import OutstandingDemandsBadge from '@/components/demands/OutstandingDemandsBadge';
import BackupStatusIndicator from '@/components/layout/BackupStatusIndicator';
import useAuthStore from '@/stores/authStore';
import useBusinessStore from '@/stores/businessStore';
import usePlatformAuthStore from '@/stores/platformAuthStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', moduleKey: 'dashboard' },
  { to: '/products', icon: Package, label: 'Products', permission: 'products:view', moduleKey: 'products' },
  { to: '/stock', icon: BarChart3, label: 'Stock Control', badge: 'stock', permission: 'stock:view', moduleKey: 'stock' },
  { to: '/buyers', icon: Users, label: 'Buyers', badge: 'buyers', permission: 'buyers:view', moduleKey: 'buyers' },
  { to: '/demands', icon: FileText, label: 'Demands', badge: 'demands', permission: 'demands:view', moduleKey: 'demands' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales', permission: 'demands:view', moduleKey: 'sales' },
  { to: '/audit', icon: ClipboardList, label: 'Audit & History', permission: 'audit:view', moduleKey: 'audit' },
  { to: '/reports', icon: PieChart, label: 'Reports', permission: 'reports:view', moduleKey: 'reports' },
  { to: '/users', icon: Shield, label: 'Users', permission: 'users:manage', moduleKey: 'users' },
  { to: '/settings/data', icon: HardDrive, label: 'Data & Backup', permission: 'backup:manage', moduleKey: 'data' },
  { to: '/labels', icon: Tag, label: 'Label Generator', permission: 'products:view', moduleKey: 'labels' },
  // { to: '/businesses', icon: Building2, label: 'Businesses', permission: 'businesses:manage', moduleKey: 'businesses' },
  { to: '/settings/scanner', icon: ScanLine, label: 'Scanner', moduleKey: 'scanner' },
  { to: '/settings/sidebar', icon: Settings, label: 'Sidebar Settings', permission: 'sidebar:manage' },
  { to: '/settings/company', icon: Settings, label: 'Settings', moduleKey: 'settings' },
  { to: '/about', icon: Info, label: 'About' },
];

export default function Sidebar({ onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();
  const can = useAuthStore((s) => s.can);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const inventoryBusinessId = usePlatformAuthStore((s) => s.inventoryBusinessId);
  const [sidebarSettings, setSidebarSettings] = useState(null);

  // Build nav link href — append ?businessId when admin is browsing a business inventory
  const buildLink = (to) => inventoryBusinessId ? `${to}?businessId=${inventoryBusinessId}` : to;

  // Load sidebar visibility settings
  useEffect(() => {
    if (!activeBusiness) return;
    const loadSettings = async () => {
      try {
        const result = await window.electronAPI.sidebar.getSettings({ businessId: activeBusiness.id });
        if (result.success && result.data) {
          const settingsMap = {};
          result.data.forEach((s) => { settingsMap[s.module_key] = s; });
          setSidebarSettings(settingsMap);
          console.log('[Sidebar] loaded settings:', Object.keys(settingsMap));
        }
      } catch { /* ignore */ }
    };
    loadSettings();
  }, [activeBusiness?.id]);

  // Filter nav items based on permissions and sidebar visibility
  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (!isAuthenticated) return true;
    if (!can(item.permission)) return false;
    // Check sidebar visibility settings (Admin always sees all)
    if (sidebarSettings && !can('sidebar:manage') && item.moduleKey) {
      const setting = sidebarSettings[item.moduleKey];
      if (setting && !setting.is_visible) return false;
    }
    return true;
  });

  return (
    <aside className="w-[260px] h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <h1 className="font-display text-xl tracking-tight flex items-baseline">
          <span className="text-indigo-400 font-bold">Insta</span>
          <span className="text-white font-bold">Mall</span>
          <span className="text-slate-500 text-[10px] font-medium ml-1.5 uppercase tracking-widest">pos</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
      {/* Back to Admin — shown when platform admin is browsing a business inventory */}
        {inventoryBusinessId && (
          <button
            onClick={() => { router.push('/admin'); }}
            className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-lg text-xs font-medium text-indigo-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            Back to Admin Panel
          </button>
        )}

        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              href={buildLink(item.to)}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-indigo-500/15 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
              {item.badge === 'stock' && <LowStockBadge className="ml-auto" />}
              {item.badge === 'buyers' && <OutstandingBuyersBadge className="ml-auto" />}
              {item.badge === 'demands' && <OutstandingDemandsBadge className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User Menu + Business Switcher */}
      <div className="px-3 pb-4 mt-auto border-t border-white/10 pt-3 space-y-2">
        {activeBusiness && can('backup:manage') && (
          <BackupStatusIndicator businessId={activeBusiness.id} />
        )}
        {(isAuthenticated || inventoryBusinessId) && <SidebarUserMenu />}
        <BusinessSwitcher />
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('shortcut:show-help'))}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Shortcuts</span>
          <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-white/10 rounded">Ctrl+/</kbd>
        </button>
      </div>
    </aside>
  );
}
