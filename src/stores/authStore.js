/**
 * Module 8: Auth Store (Zustand)
 * Manages authentication state, current user, and locking.
 */
import { create } from 'zustand';
import { can as canCheck, isAdmin as isAdminCheck } from '@/utils/permissions';

const useAuthStore = create((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLocked: false,
  lastActivity: Date.now(),

  /**
   * Login: store user and mark authenticated.
   * Also forces the active business to match the user's assigned business
   * to prevent cross-business data leakage.
   */
  login: async (user) => {
    set({
      currentUser: user,
      isAuthenticated: true,
      isLocked: false,
      lastActivity: Date.now(),
    });

    // Force-switch to the user's business so data is scoped correctly
    if (user.business_id) {
      try {
        const { default: useBusinessStore } = await import('@/stores/businessStore');
        const bizStore = useBusinessStore.getState();
        // Only switch if the active business doesn't match
        if (!bizStore.activeBusiness || bizStore.activeBusiness.id !== user.business_id) {
          await bizStore.switchBusiness(user.business_id, user.id);
        }
      } catch (_) { /* ignore if import fails */ }
    }
  },

  /**
   * Logout: clear user and mark unauthenticated
   */
  logout: async (businessId) => {
    const { currentUser } = get();
    if (currentUser && businessId) {
      try {
        await window.electronAPI.auth.logout({ businessId, userId: currentUser.id });
      } catch (_) { /* ignore */ }
    }
    set({
      currentUser: null,
      isAuthenticated: false,
      isLocked: false,
    });
  },

  /**
   * Lock the app (keep user, but show lock overlay)
   */
  lock: () => {
    set({ isLocked: true });
  },

  /**
   * Unlock after re-entering PIN
   */
  unlock: () => {
    set({ isLocked: false, lastActivity: Date.now() });
  },

  /**
   * Update activity timestamp (for auto-lock timer)
   */
  touch: () => {
    set({ lastActivity: Date.now() });
  },

  /**
   * Permission check for current user
   */
  can: (permission) => {
    const { currentUser } = get();
    // No auth configured / no user logged in → grant all permissions
    if (!currentUser) return true;
    return canCheck(currentUser.role, permission);
  },

  /**
   * Check if current user is admin
   */
  isAdmin: () => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return isAdminCheck(currentUser.role);
  },

  /**
   * Module access cache (loaded per session)
   */
  moduleAccess: {},

  /**
   * Load module access for current user
   */
  loadModuleAccess: async (businessId) => {
    const { currentUser } = get();
    if (!currentUser) return;
    try {
      const result = await window.electronAPI.users.getModuleAccess({ userId: currentUser.id, businessId });
      if (result.success && result.data) {
        const map = {};
        result.data.forEach((m) => { map[m.module_key] = m.has_access === 1; });
        set({ moduleAccess: map });
      }
    } catch { /* ignore */ }
  },

  /**
   * Check if current user can access a specific module
   */
  canAccessModule: (moduleKey) => {
    const { currentUser, moduleAccess } = get();
    if (!currentUser) return false;
    if (isAdminCheck(currentUser.role)) return true; // Admin always has access
    if (Object.keys(moduleAccess).length === 0) return true; // No restrictions set
    return moduleAccess[moduleKey] !== false;
  },

  /**
   * Update the current user info (after profile changes)
   */
  updateCurrentUser: (updates) => {
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
    }));
  },
}));

export default useAuthStore;
