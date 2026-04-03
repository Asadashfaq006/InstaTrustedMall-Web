/**
 * Platform Auth Store (Zustand)
 *
 * Manages JWT-based authentication for the multi-tier platform.
 * Roles: super_admin, admin, manager, salesperson, viewer
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || '/api';

async function apiPost(path, data = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });
  return res.json();
}

const usePlatformAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      // Tracks which business inventory the platform admin is currently viewing.
      // Persisted so page refreshes inside inventory don't lose the context.
      inventoryBusinessId: null,

      /**
       * Login with email + password
       */
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const result = await apiPost('/platform-auth/login', { email, password });
          if (result.success) {
            set({
              user: result.data.user,
              token: result.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return { success: true, user: result.data.user };
          }
          set({ isLoading: false, error: result.error });
          return { success: false, error: result.error };
        } catch (err) {
          set({ isLoading: false, error: err.message });
          return { success: false, error: err.message };
        }
      },

      /**
       * Logout
       */
      logout: async () => {
        try {
          await apiPost('/platform-auth/logout');
        } catch (_) { /* ignore */ }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          inventoryBusinessId: null,
        });
      },

      /**
       * Check session (fetch /me)
       * @param {string} [expectedRole] — e.g. 'super_admin' or 'admin'.
       *   When provided the backend reads that role's cookie directly,
       *   which allows two roles to coexist in the same browser.
       */
      checkSession: async (expectedRole) => {
        const { token } = get();
        // If no stored token and no role hint, definitely not logged in
        if (!token && !expectedRole) return false;
        try {
          const roleParam = expectedRole ? `?role=${encodeURIComponent(expectedRole)}` : '';
          const result = await apiGet(`/platform-auth/me${roleParam}`);
          if (result.success) {
            set({ user: result.data, isAuthenticated: true, token: token || 'session' });
            return true;
          }
          // Only clear persisted state for a generic (no-role) check so
          // one tab's check doesn't wipe the other tab's session.
          if (!expectedRole) {
            set({ user: null, token: null, isAuthenticated: false });
          }
          return false;
        } catch {
          return false;
        }
      },

      /**
       * Get the user's role
       */
      getRole: () => {
        return get().user?.role || null;
      },

      /**
       * Check if user has a specific role
       */
      hasRole: (...roles) => {
        const role = get().user?.role;
        return role ? roles.includes(role) : false;
      },

      /**
       * Clear error
       */
      clearError: () => set({ error: null }),

      /**
       * Set the business the admin is viewing in inventory.
       * Called when the admin enters a business dashboard via "Open Dashboard".
       */
      setInventoryBusiness: (id) => set({ inventoryBusinessId: id ? parseInt(id, 10) : null }),

      /**
       * Clear inventory business context.
       * Called when the admin navigates back to the admin panel.
       */
      clearInventoryBusiness: () => set({ inventoryBusinessId: null }),
    }),
    {
      name: 'instamall-platform-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        inventoryBusinessId: state.inventoryBusinessId,
      }),
    }
  )
);

export default usePlatformAuthStore;
