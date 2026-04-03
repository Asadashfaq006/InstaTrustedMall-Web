import { create } from 'zustand';

const useStockStore = create((set, get) => ({
  // ── State ──────────────────────────
  stockLevels: [],          // Array of { productId, productName, sku, category, quantity, reorderAt, reorderQty, lastMovedAt, status }
  movements: [],            // Array of movement records for current view
  movementsTotal: 0,        // Total count of movements (for pagination)
  lowStockProducts: [],
  outOfStockProducts: [],
  lowStockCount: 0,
  outOfStockCount: 0,
  loading: false,
  movementsLoading: false,
  error: null,

  // ── Loaders ────────────────────────

  fetchStockLevels: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const res = await window.electronAPI.stock.getLevels(businessId);
      if (res.success) {
        set({ stockLevels: res.data, loading: false });
      } else {
        set({ error: res.error, loading: false });
      }
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchMovements: async (params) => {
    set({ movementsLoading: true, error: null });
    try {
      const res = await window.electronAPI.stock.getMovements(params);
      if (res.success) {
        set({ movements: res.data.movements, movementsTotal: res.data.total, movementsLoading: false });
      } else {
        set({ error: res.error, movementsLoading: false });
      }
    } catch (err) {
      set({ error: err.message, movementsLoading: false });
    }
  },

  fetchMovementsByProduct: async (productId, limit = 50, offset = 0) => {
    set({ movementsLoading: true });
    try {
      const res = await window.electronAPI.stock.getMovementsByProduct({ productId, limit, offset });
      if (res.success) {
        set({ movements: res.data, movementsLoading: false });
      } else {
        set({ error: res.error, movementsLoading: false });
      }
    } catch (err) {
      set({ error: err.message, movementsLoading: false });
    }
  },

  fetchLowStockProducts: async (businessId) => {
    try {
      const res = await window.electronAPI.stock.getLowStockProducts(businessId);
      if (res.success) set({ lowStockProducts: res.data });
    } catch (err) { /* silent */ }
  },

  fetchOutOfStockProducts: async (businessId) => {
    try {
      const res = await window.electronAPI.stock.getOutOfStockProducts(businessId);
      if (res.success) set({ outOfStockProducts: res.data });
    } catch (err) { /* silent */ }
  },

  fetchLowStockCount: async (businessId) => {
    try {
      const res = await window.electronAPI.stock.getLowStockCount(businessId);
      if (res.success) {
        set({ lowStockCount: res.data.lowCount, outOfStockCount: res.data.outCount });
      }
    } catch (err) { /* silent */ }
  },

  // ── Actions ────────────────────────

  adjustIn: async (data) => {
    try {
      const res = await window.electronAPI.stock.adjustIn(data);
      if (res.success) {
        get().refreshAfterAdjustment(data.businessId);
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  adjustOut: async (data) => {
    try {
      const res = await window.electronAPI.stock.adjustOut(data);
      if (res.success) {
        get().refreshAfterAdjustment(data.businessId);
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  adjustExact: async (data) => {
    try {
      const res = await window.electronAPI.stock.adjust(data);
      if (res.success) {
        get().refreshAfterAdjustment(data.businessId);
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  batchAdjustIn: async (data) => {
    try {
      const res = await window.electronAPI.stock.batchAdjustIn(data);
      if (res.success) {
        get().refreshAfterAdjustment(data.businessId);
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  setReorderLevel: async (data) => {
    try {
      const res = await window.electronAPI.stock.setReorderLevel(data);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  setBulkReorderLevels: async (items) => {
    try {
      const res = await window.electronAPI.stock.setBulkReorderLevels(items);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  importCSV: async (data) => {
    try {
      const res = await window.electronAPI.stock.importCSV(data);
      if (res.success) {
        get().refreshAfterAdjustment(data.businessId);
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  exportCSV: async (data) => {
    try {
      const res = await window.electronAPI.stock.exportCSV(data);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Helpers ────────────────────────

  refreshAfterAdjustment: async (businessId) => {
    // Refresh stock levels and alerts after any stock change
    get().fetchStockLevels(businessId);
    get().fetchLowStockCount(businessId);
  },

  getStockForProduct: (productId) => {
    const levels = get().stockLevels;
    return levels.find(l => l.productId === productId) || null;
  },

  reset: () => set({
    stockLevels: [],
    movements: [],
    movementsTotal: 0,
    lowStockProducts: [],
    outOfStockProducts: [],
    lowStockCount: 0,
    outOfStockCount: 0,
    loading: false,
    movementsLoading: false,
    error: null,
  }),
}));

export default useStockStore;
