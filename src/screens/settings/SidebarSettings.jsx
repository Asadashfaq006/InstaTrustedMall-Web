/**
 * SidebarSettings - Admin screen to toggle sidebar module visibility and manage serial number prefix.
 * Accessible via /settings/sidebar (Admin only).
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, BarChart3, Users, FileText,
  ClipboardList, PieChart, HardDrive, Tag, ScanLine, Settings,
  Eye, EyeOff, Hash, Save, ShoppingCart,
} from 'lucide-react';

const SIDEBAR_MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'stock', label: 'Stock Control', icon: BarChart3 },
  { key: 'buyers', label: 'Buyers', icon: Users },
  { key: 'demands', label: 'Demands', icon: FileText },
  { key: 'sales', label: 'Sales', icon: ShoppingCart },
  { key: 'audit', label: 'Audit & History', icon: ClipboardList },
  { key: 'reports', label: 'Reports', icon: PieChart },
  { key: 'data', label: 'Data & Backup', icon: HardDrive },
  { key: 'labels', label: 'Label Generator', icon: Tag },
  { key: 'scanner', label: 'Scanner', icon: ScanLine },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function SidebarSettings() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const can = useAuthStore((s) => s.can);
  const { toast } = useToast();

  const [modules, setModules] = useState([]);
  const [serialPrefix, setSerialPrefix] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPrefix, setSavingPrefix] = useState(false);

  useEffect(() => {
    if (!activeBusiness) return;
    const load = async () => {
      try {
        // Load sidebar settings
        const result = await window.electronAPI.sidebar.getSettings({ businessId: activeBusiness.id });
        if (result.success && result.data) {
          setModules(result.data);
        }
        // Load serial prefix
        const serialResult = await window.electronAPI.serialSettings.get(activeBusiness.id);
        if (serialResult.success) {
          setSerialPrefix(serialResult.data?.serial_prefix || 'INV');
        }
      } catch { /* ignore */ }
    };
    load();
  }, [activeBusiness?.id]);

  const toggleModule = (moduleKey) => {
    setModules((prev) =>
      prev.map((m) =>
        m.module_key === moduleKey ? { ...m, is_visible: !m.is_visible } : m
      )
    );
  };

  const handleSaveVisibility = async () => {
    setSaving(true);
    try {
      await window.electronAPI.sidebar.updateSettings({
        businessId: activeBusiness.id,
        items: modules.map((m, i) => ({
          item_key: m.module_key,
          is_visible: !!m.is_visible,
          position: m.sort_order ?? i,
        })),
      });
      toast({ title: 'Saved', description: 'Sidebar visibility updated' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrefix = async () => {
    if (!serialPrefix.trim()) return;
    setSavingPrefix(true);
    try {
      const result = await window.electronAPI.serialSettings.updatePrefix({
        businessId: activeBusiness.id,
        prefix: serialPrefix.trim().toUpperCase(),
      });
      if (result.success) {
        toast({ title: 'Saved', description: `Serial prefix updated to "${serialPrefix.trim().toUpperCase()}"` });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPrefix(false);
    }
  };

  if (!can('sidebar:manage')) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-text-muted">You don't have permission to manage sidebar settings.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-text-primary">Sidebar &amp; Serial Settings</h1>
          <p className="text-sm text-text-muted mt-1">Control which modules appear in the sidebar for non-admin users, and configure serial number prefixes.</p>
        </div>

        {/* Sidebar Visibility */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4" /> Module Visibility
          </h2>
          <p className="text-xs text-text-muted mb-4">Toggle modules on/off. Hidden modules won't appear in the sidebar for non-admin users.</p>

          <div className="space-y-1">
            {modules.map((mod) => {
              const moduleInfo = SIDEBAR_MODULES.find((m) => m.key === mod.module_key);
              const Icon = moduleInfo?.icon || Settings;
              const label = moduleInfo?.label || mod.module_key;
              const isVisible = !!mod.is_visible;

              return (
                <button
                  key={mod.module_key}
                  onClick={() => toggleModule(mod.module_key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                    isVisible
                      ? 'bg-white hover:bg-gray-50 border border-gray-200'
                      : 'bg-gray-100 hover:bg-gray-150 border border-dashed border-gray-300 opacity-60'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isVisible ? 'text-accent' : 'text-gray-400')} />
                  <span className={cn('text-sm font-medium flex-1', isVisible ? 'text-text-primary' : 'text-text-muted line-through')}>
                    {label}
                  </span>
                  {isVisible ? (
                    <Eye className="w-4 h-4 text-accent" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={handleSaveVisibility} disabled={saving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Visibility'}
            </Button>
          </div>
        </div>

        {/* Serial Number Prefix */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4" /> Serial Number Prefix
          </h2>
          <p className="text-xs text-text-muted mb-4">
            Set the prefix for auto-generated demand serial numbers. Example: "INV" will generate INV-00001, INV-00002, etc.
          </p>

          <div className="flex items-center gap-3">
            <Input
              value={serialPrefix}
              onChange={(e) => setSerialPrefix(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10))}
              placeholder="INV"
              className="w-40 uppercase font-mono"
            />
            <span className="text-sm text-text-muted">→ <span className="font-mono font-medium">{serialPrefix.toUpperCase() || 'INV'}-00001</span></span>
            <Button size="sm" onClick={handleSavePrefix} disabled={savingPrefix} className="gap-1.5 ml-auto">
              <Save className="w-3.5 h-3.5" /> {savingPrefix ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
