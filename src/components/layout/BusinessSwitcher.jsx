import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Check, Plus, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import useBusinessStore from '@/stores/businessStore';
import useAuthStore from '@/stores/authStore';
import usePlatformAuthStore from '@/stores/platformAuthStore';
import { getBusinessTypeInfo } from '@/constants/businessPresets';
import { toast } from '@/components/ui/use-toast';
import { cn, localFileUrl } from '@/lib/utils';

export default function BusinessSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBusinessId = searchParams.get('businessId');
  const navigate = (path) => router.push(path);
  const { businesses, activeBusiness, loadAll, loadActive, switchBusiness } = useBusinessStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const platformUser = usePlatformAuthStore((s) => s.user);
  const platformAuth = usePlatformAuthStore((s) => s.isAuthenticated);
  const inventoryBusinessId = usePlatformAuthStore((s) => s.inventoryBusinessId);
  const [open, setOpen] = useState(false);

  // Admin viewing inventory \u2014 via fresh URL param OR persisted store (after sidebar navigation)
  const isAdminDashboardAccess = platformAuth && platformUser?.role === 'admin' && !!(urlBusinessId || inventoryBusinessId);

  // Non-admin users are scoped to their assigned business
  const isScopedUser = currentUser && currentUser.role !== 'admin';

  useEffect(() => {
    if (isScopedUser && currentUser.id) {
      loadAll(currentUser.id);
    } else {
      loadAll();
    }
    loadActive();
  }, [currentUser?.id]);

  const handleSwitch = async (id) => {
    if (activeBusiness?.id === id) {
      setOpen(false);
      return;
    }
    const result = await switchBusiness(id, isScopedUser ? currentUser.id : undefined);
    if (result) {
      toast({ title: `Switched to ${result.name}`, variant: 'info' });
    }
    setOpen(false);
  };

  if (!activeBusiness) return null;

  // Admin dashboard access — show only the targeted business, no switcher
  if (isAdminDashboardAccess) {
    const activeType = getBusinessTypeInfo(activeBusiness.type);
    return (
      <div className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        {activeBusiness.logo_path ? (
          <img src={localFileUrl(activeBusiness.logo_path)} alt={activeBusiness.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: activeType.color }}>
            {activeBusiness.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-300 truncate">{activeBusiness.name}</p>
          <p className="text-xs text-slate-500 truncate">{activeType.icon} {activeType.label}</p>
        </div>
      </div>
    );
  }

  // If scoped user has only one business, show a static label instead of a switcher
  if (isScopedUser && businesses.length <= 1) {
    const activeType = getBusinessTypeInfo(activeBusiness.type);
    return (
      <div className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        {activeBusiness.logo_path ? (
          <img src={localFileUrl(activeBusiness.logo_path)} alt={activeBusiness.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: activeType.color }}>
            {activeBusiness.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-300 truncate">{activeBusiness.name}</p>
          <p className="text-xs text-slate-500 truncate">{activeType.icon} {activeType.label} · {activeBusiness.currency}</p>
        </div>
      </div>
    );
  }

  const activeType = getBusinessTypeInfo(activeBusiness.type);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left">
          {/* Logo / Fallback */}
          {activeBusiness.logo_path ? (
            <img
              src={localFileUrl(activeBusiness.logo_path)}
              alt={activeBusiness.name}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: activeType.color }}
            >
              {activeBusiness.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-300 truncate">
              {activeBusiness.name}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {activeType.icon} {activeType.label} · {activeBusiness.currency}
            </p>
          </div>

          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" side="top" className="w-72 p-2">
        <div className="space-y-1">
          {businesses.map((biz) => {
            const typeInfo = getBusinessTypeInfo(biz.type);
            const isActive = activeBusiness?.id === biz.id;
            return (
              <button
                key={biz.id}
                onClick={() => handleSwitch(biz.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-gray-100',
                  isActive && 'border-l-2 border-indigo-500 bg-indigo-50'
                )}
              >
                {biz.logo_path ? (
                  <img
                    src={localFileUrl(biz.logo_path)}
                    alt={biz.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: typeInfo.color }}
                  >
                    {biz.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{biz.name}</p>
                  <p className="text-xs text-text-secondary">{typeInfo.icon} {typeInfo.label}</p>
                </div>
                {isActive && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {!isScopedUser && (
          <div className="mt-2 pt-2 border-t border-border space-y-1">
            <button
              onClick={() => { navigate('/businesses'); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage Businesses
            </button>
            <button
              onClick={() => { navigate('/businesses'); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-600 font-medium hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Business
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
