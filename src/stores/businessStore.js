import { create } from 'zustand';

const useBusinessStore = create((set, get) => ({
  businesses: [],
  activeBusiness: null,
  isLoading: false,
  error: null,

  /**
   * Load businesses. When a userId is provided the backend returns only the
   * business assigned to that user (scoped access for manager/salesperson/viewer).
   */
  loadAll: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const result = userId
        ? await window.electronAPI.businesses.getAllForUser(userId)
        : await window.electronAPI.businesses.getAll();
      if (result.success) {
        set({ businesses: result.data, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  loadActive: async () => {
    try {
      const result = await window.electronAPI.businesses.getActive();
      if (result.success) {
        set({ activeBusiness: result.data });
      }
    } catch (err) {
      set({ error: err.message });
    }
  },

  createBusiness: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.businesses.create(data);
      if (result.success) {
        // Reload all and set the new one as active
        await get().loadAll();
        set({ activeBusiness: result.data, isLoading: false });
        return result.data;
      } else {
        console.error('Create business failed:', result.error);
        set({ error: result.error, isLoading: false });
        return { error: result.error };
      }
    } catch (err) {
      console.error('Create business exception:', err);
      set({ error: err.message, isLoading: false });
      return { error: err.message };
    }
  },

  updateBusiness: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.businesses.update(id, data);
      if (result.success) {
        await get().loadAll();
        // If the updated business is the active one, refresh active
        const { activeBusiness } = get();
        if (activeBusiness && activeBusiness.id === id) {
          set({ activeBusiness: result.data });
        }
        set({ isLoading: false });
        return result.data;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  deleteBusiness: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.businesses.delete(id);
      if (result.success) {
        await get().loadAll();
        await get().loadActive();
        set({ isLoading: false });
        return true;
      } else {
        set({ error: result.error, isLoading: false });
        return false;
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  switchBusiness: async (id, userId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.businesses.setActive(id, userId);
      if (result.success) {
        set({ activeBusiness: result.data, isLoading: false });
        await get().loadAll(userId);
        return result.data;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },
}));

export default useBusinessStore;
