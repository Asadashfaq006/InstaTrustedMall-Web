'use client';
import '@/lib/webElectronApi';
/**
 * Client-side providers: Tooltip, Toast, Auth gate, Scanner, Shortcuts.
 * This mirrors the old App.jsx logic minus React Router.
 *
 * Auth flow:
 * 1. Platform auth (JWT) — checked via usePlatformAuthStore
 * 2. Per-business PIN auth — existing flow for business dashboard users
 */
import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import useBusinessStore from '@/stores/businessStore';
import useAuthStore from '@/stores/authStore';
import { applyBusinessTheme } from '@/constants/businessThemes';
import LoginScreen from '@/screens/LoginScreen';
import AppLockOverlay from '@/components/auth/AppLockOverlay';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import { createShortcutListener } from '@/utils/keyboardShortcuts';
import SocketProvider from '@/providers/SocketProvider';
import useSocketRefresh from '@/hooks/useSocketRefresh';
import usePlatformAuthStore from '@/stores/platformAuthStore';

function ProvidersInner({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { activeBusiness, loadAll, loadActive } = useBusinessStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLocked = useAuthStore((s) => s.isLocked);
  const currentUser = useAuthStore((s) => s.currentUser);
  const lock = useAuthStore((s) => s.lock);
  const touch = useAuthStore((s) => s.touch);
  const platformUser = usePlatformAuthStore((s) => s.user);
  const platformAuth = usePlatformAuthStore((s) => s.isAuthenticated);
  const inventoryBusinessId = usePlatformAuthStore((s) => s.inventoryBusinessId);
  const setInventoryBusiness = usePlatformAuthStore((s) => s.setInventoryBusiness);
  const clearInventoryBusiness = usePlatformAuthStore((s) => s.clearInventoryBusiness);

  // Admin accessing a business inventory — detected by URL param (fresh entry) OR
  // persisted store value (after navigating between inventory sections via sidebar).
  const urlBusinessId = searchParams.get('businessId');
  const isAdminDashboardAccess = platformAuth && platformUser?.role === 'admin' && !!(urlBusinessId || inventoryBusinessId);

  const [initialized, setInitialized] = useState(false);
  const [hasUsers, setHasUsers] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const autoLockRef = useRef(null);
  const autoLockMinutesRef = useRef(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Adapt navigate for Next.js
  const navigate = useCallback((path) => router.push(path), [router]);

  // Global keyboard shortcuts
  useEffect(() => {
    const listener = createShortcutListener(navigate);
    listener.attach();
    const handleShowHelp = () => setShowShortcutsHelp(true);
    window.addEventListener('shortcut:show-help', handleShowHelp);
    return () => {
      listener.detach();
      window.removeEventListener('shortcut:show-help', handleShowHelp);
    };
  }, [navigate]);

  // Initialize app — load businesses and active business
  useEffect(() => {
    const init = async () => {
      try {
        // When an admin opens a specific business dashboard via URL param, switch to that
        // business directly instead of calling loadActive(). loadActive() would briefly set
        // activeBusiness to whatever was last active in the DB (cause: the "flicker" where
        // the wrong business name appears for ~1 second before the dashboard corrects it).
        // Also handles refreshes inside inventory pages (no URL param but store has the id).
        const platformState = usePlatformAuthStore.getState();
        const urlBizId = searchParams.get('businessId');
        const persistedBizId = platformState.inventoryBusinessId;
        const targetBizId = urlBizId || persistedBizId;
        const isAdminDirectAccess =
          platformState.isAuthenticated &&
          platformState.user?.role === 'admin' &&
          !!targetBizId;

        if (isAdminDirectAccess) {
          // Clear any stale PIN user session so it doesn't interfere with admin's inventory view
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            authState.logout();
          }
          await useBusinessStore.getState().switchBusiness(parseInt(targetBizId, 10));
        } else {
          await Promise.all([loadAll(), loadActive()]);
        }
      } catch (_) {}
      setInitialized(true);
    };
    init();
  }, []);

  // Persist admin's inventory business context when they arrive via businessId URL param
  useEffect(() => {
    if (platformAuth && platformUser?.role === 'admin' && urlBusinessId) {
      setInventoryBusiness(urlBusinessId);
    }
  }, [urlBusinessId, platformAuth, platformUser?.role]);

  // Clear inventory context and any stale PIN session when the admin navigates back
  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
      clearInventoryBusiness();
      // Also clear stale PIN auth to prevent cross-business contamination
      if (platformAuth && platformUser?.role === 'admin') {
        const authState = useAuthStore.getState();
        if (authState.isAuthenticated) {
          authState.logout();
        }
      }
    }
  }, [pathname, platformAuth, platformUser?.role]);

  // When a PIN user logs in, force the active business to match their business_id.
  // This prevents cross-business data leakage from the global is_active flag.
  // Skip entirely when a platform admin is logged in — the admin controls the business
  // context via URL param and we must not let a stale PIN session override it.
  useEffect(() => {
    if (platformAuth && platformUser?.role === 'admin') return;
    if (currentUser?.business_id && activeBusiness && activeBusiness.id !== currentUser.business_id) {
      useBusinessStore.getState().switchBusiness(currentUser.business_id, currentUser.id);
    }
  }, [currentUser?.business_id, activeBusiness?.id, platformAuth, platformUser?.role]);

  // Check if any business has users (auth required)
  useEffect(() => {
    if (!initialized) {
      setAuthChecked(true);
      return;
    }
    const checkAuth = async () => {
      try {
        // Check if any business has users — if so, require authentication
        let anyHasUsers = false;
        const bizResult = await window.electronAPI.businesses.getAll();
        if (bizResult.success && bizResult.data.length > 0) {
          for (const biz of bizResult.data) {
            const result = await window.electronAPI.users.hasUsers(biz.id);
            if (result.success && result.data) {
              anyHasUsers = true;
              break;
            }
          }
        }
        setHasUsers(anyHasUsers);

        if (activeBusiness) {
          const settingsResult = await window.electronAPI.authSettings.get(activeBusiness.id);
          if (settingsResult.success) {
            autoLockMinutesRef.current = settingsResult.data.auto_lock_after_minutes || 0;
          }
        }
      } catch {
        setHasUsers(false);
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [initialized, activeBusiness?.id]);

  // Public pages don't need auth or business initialization
  const isPublicPage = pathname === '/' || pathname === '/welcome';
  const isPlatformPage = pathname.startsWith('/super-admin') || pathname.startsWith('/admin');

  // Navigate when business state changes
  // Don't redirect away from public pages (landing, welcome) or platform pages (super-admin, admin)
  useEffect(() => {
    if (initialized && !isPlatformPage && !isAdminDashboardAccess) {
      if (!activeBusiness && pathname !== '/welcome' && pathname !== '/') {
        router.replace('/welcome');
      }
    }
  }, [initialized, activeBusiness, pathname, router, isPlatformPage, isAdminDashboardAccess]);

  // Apply per-business-type theme
  useEffect(() => {
    if (activeBusiness?.type) {
      applyBusinessTheme(activeBusiness.type);
    }
  }, [activeBusiness?.type]);

  // Auto-lock timer
  const resetAutoLock = useCallback(() => {
    touch();
    if (autoLockRef.current) clearTimeout(autoLockRef.current);
    const minutes = autoLockMinutesRef.current;
    if (minutes > 0 && isAuthenticated && !isLocked) {
      autoLockRef.current = setTimeout(() => {
        lock();
      }, minutes * 60 * 1000);
    }
  }, [isAuthenticated, isLocked, touch, lock]);

  useEffect(() => {
    if (!isAuthenticated || isLocked) return;
    const events = ['mousedown', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetAutoLock, { passive: true }));
    resetAutoLock();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetAutoLock));
      if (autoLockRef.current) clearTimeout(autoLockRef.current);
    };
  }, [isAuthenticated, isLocked, resetAutoLock]);

  // Note: Platform auth session is checked by each layout (admin/layout, super-admin/layout).
  // Do NOT call checkSession() here — concurrent calls cause race conditions
  // where one clears the store while the other is still in-flight.

  // Loading splash (skip for public landing page and platform pages)
  if (!isPublicPage && !isPlatformPage && (!initialized || !authChecked)) {
    return (
      <TooltipProvider>
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="font-display text-3xl mb-2">
              <span className="text-accent font-bold">Insta</span>
              <span className="text-navy font-bold">Mall</span>
            </h1>
            <p className="text-text-muted text-sm">Loading...</p>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Auth gate: show login if any business has users but not authenticated
  // Skip for public pages, platform pages, admin dashboard access, AND platform-authenticated admins.
  // The platformAuth check prevents a race condition where clearing inventoryBusinessId
  // before router.push('/admin') completes would briefly show the PIN screen.
  if (hasUsers && !isAuthenticated && !isPublicPage && !isPlatformPage && !isAdminDashboardAccess && !platformAuth && pathname !== '/welcome') {
    return (
      <TooltipProvider>
        <LoginScreen />
        <Toaster />
      </TooltipProvider>
    );
  }

  // Lock overlay (skip for admin dashboard access and platform-authenticated admins)
  if (isLocked && isAuthenticated && !isAdminDashboardAccess && !platformAuth) {
    return (
      <TooltipProvider>
        <AppLockOverlay />
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <SocketProvider>
        <SocketRefreshBridge />
        {children}
      </SocketProvider>
      <Toaster />
      <KeyboardShortcutsHelp open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp} />
    </TooltipProvider>
  );
}

/** Bridge component to call the useSocketRefresh hook inside SocketProvider context */
function SocketRefreshBridge() {
  useSocketRefresh();
  return null;
}

export default function Providers({ children }) {
  return (
    <Suspense fallback={null}>
      <ProvidersInner>{children}</ProvidersInner>
    </Suspense>
  );
}
