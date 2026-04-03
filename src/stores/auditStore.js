import { create } from 'zustand';

const useAuditStore = create((set, get) => ({
  // ── State ──────────────────────────
  entries: [],
  total: 0,
  stats: null,
  recentActivity: [],
  productHistory: [],
  productHistoryTotal: 0,
  stockLog: [],
  stockLogTotal: 0,
  loading: false,
  statsLoading: false,
  error: null,

  // ── Filters ────────────────────────
  filters: {
    search: '',
    action: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
    limit: 50,
    offset: 0,
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value, offset: 0 } }));
  },

  resetFilters: () => {
    set({
      filters: {
        search: '',
        action: '',
        entityType: '',
        dateFrom: '',
        dateTo: '',
        limit: 50,
        offset: 0,
      },
    });
  },

  setPage: (offset) => {
    set((s) => ({ filters: { ...s.filters, offset } }));
  },

  // ── Audit Log (System Audit) ──────
  fetchAuditLog: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const res = await window.electronAPI.audit.getAll({ businessId, ...filters });
      if (res.success) {
        set({ entries: res.data.rows, total: res.data.total, loading: false });
      } else {
        set({ error: res.error, loading: false });
      }
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ── Stats (Overview) ─────────────
  fetchStats: async (businessId) => {
    set({ statsLoading: true });
    try {
      const res = await window.electronAPI.audit.getStats({ businessId });
      if (res.success) {
        set({ stats: res.data, statsLoading: false });
      } else {
        set({ statsLoading: false });
      }
    } catch (err) {
      set({ statsLoading: false });
    }
  },

  // ── Recent Activity ───────────────
  fetchRecentActivity: async (businessId, limit = 20) => {
    try {
      const res = await window.electronAPI.audit.getRecentActivity({ businessId, limit });
      if (res.success) {
        set({ recentActivity: res.data });
      }
    } catch (err) {
      // silent
    }
  },

  // ── Product Field History ─────────
  fetchProductHistory: async (businessId, params = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await window.electronAPI.history.getByProduct({
        businessId,
        ...params,
      });
      if (res.success) {
        set({
          productHistory: res.data.rows,
          productHistoryTotal: res.data.total,
          loading: false,
        });
      } else {
        set({ error: res.error, loading: false });
      }
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ── Stock Movement Log ────────────
  fetchStockLog: async (businessId, params = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await window.electronAPI.stock.getMovements({
        businessId,
        ...params,
      });
      if (res.success) {
        set({
          stockLog: res.data.movements,
          stockLogTotal: res.data.total,
          loading: false,
        });
      } else {
        set({ error: res.error, loading: false });
      }
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ── Entity-specific audit trail ───
  fetchEntityAudit: async (entityType, entityId, limit = 50) => {
    try {
      const res = await window.electronAPI.audit.getByEntity({ entityType, entityId, limit });
      if (res.success) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  // ── Column-specific history ───────
  fetchColumnHistory: async (productId, columnId, limit = 20) => {
    try {
      const res = await window.electronAPI.history.getByColumn({ productId, columnId, limit });
      if (res.success) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  // ── Export ─────────────────────────
  exportCSV: async (businessId, tab) => {
    try {
      const res = await window.electronAPI.audit.exportCSV({ businessId, tab });
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
}));

export default useAuditStore;
