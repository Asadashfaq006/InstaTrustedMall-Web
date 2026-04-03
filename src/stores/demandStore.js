import { create } from 'zustand';

const useDemandStore = create((set, get) => ({
  // ── State ──────────────────────────
  demands: [],
  totalDemands: 0,
  statusCounts: { all: 0, draft: 0, outstanding: 0, partial: 0, paid: 0, cancelled: 0 },
  selectedDemandId: null,
  selectedDemand: null, // full demand detail (with items, payments, buyer info)
  isLoading: false,
  detailLoading: false,
  error: null,

  // UI filter/search state
  searchQuery: '',
  statusFilter: 'all',
  sortBy: 'recent',
  page: 1,
  pageSize: 30,

  // ── Setters ─────────────────────────
  setSearchQuery: (q) => set({ searchQuery: q, page: 1 }),
  setStatusFilter: (f) => set({ statusFilter: f, page: 1 }),
  setSortBy: (s) => set({ sortBy: s, page: 1 }),
  setPage: (p) => set({ page: p }),
  setSelectedDemandId: (id) => set({ selectedDemandId: id }),

  // ── Loaders ─────────────────────────

  loadDemands: async (businessId) => {
    const { searchQuery, statusFilter, sortBy, page, pageSize } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.demands.getAll({
        businessId,
        search: searchQuery.trim() || null,
        status: statusFilter === 'all' ? null : statusFilter,
        sortBy,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      if (res.success) {
        set({
          demands: res.data.demands,
          totalDemands: res.data.total,
          statusCounts: res.data.statusCounts || get().statusCounts,
          isLoading: false,
        });
      } else {
        set({ error: res.error, isLoading: false });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  loadDemandDetail: async (demandId) => {
    set({ detailLoading: true });
    try {
      const res = await window.electronAPI.demands.getById(demandId);
      if (res.success) {
        set({ selectedDemand: res.data, selectedDemandId: demandId, detailLoading: false });
      } else {
        set({ detailLoading: false, error: res.error });
      }
    } catch (err) {
      set({ detailLoading: false, error: err.message });
    }
  },

  // ── Lifecycle Actions ───────────────

  createDemand: async (data) => {
    try {
      const res = await window.electronAPI.demands.create(data);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateItems: async (data) => {
    try {
      const res = await window.electronAPI.demands.updateItems(data);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateNotes: async (data) => {
    try {
      const res = await window.electronAPI.demands.updateNotes(data);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  confirmDemand: async (demandId, { paymentStatus, paidAmount } = {}) => {
    try {
      const res = await window.electronAPI.demands.confirm({
        demandId,
        paymentStatus: paymentStatus || 'outstanding',
        paidAmount: paidAmount || 0,
      });
      if (res.success) {
        // Refresh demand detail if viewing
        if (get().selectedDemandId === demandId) {
          get().loadDemandDetail(demandId);
        }
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  cancelDemand: async (demandId, reason) => {
    try {
      const res = await window.electronAPI.demands.cancel({ demandId, reason });
      if (res.success) {
        if (get().selectedDemandId === demandId) {
          get().loadDemandDetail(demandId);
        }
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deleteDemand: async (demandId) => {
    try {
      const res = await window.electronAPI.demands.deleteDemand(demandId);
      if (res.success) {
        set((s) => ({
          demands: s.demands.filter((d) => d.id !== demandId),
          selectedDemandId: s.selectedDemandId === demandId ? null : s.selectedDemandId,
          selectedDemand: s.selectedDemandId === demandId ? null : s.selectedDemand,
        }));
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  reopenDemand: async (demandId) => {
    try {
      const res = await window.electronAPI.demands.reopen(demandId);
      if (res.success) {
        if (get().selectedDemandId === demandId) {
          get().loadDemandDetail(demandId);
        }
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Payment Recording ──────────────

  recordPayment: async (data) => {
    try {
      const res = await window.electronAPI.demands.recordPayment(data);
      if (res.success) {
        if (get().selectedDemandId === data.demandId) {
          get().loadDemandDetail(data.demandId);
        }
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  loadPayments: async (demandId) => {
    try {
      const res = await window.electronAPI.demands.getPayments(demandId);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Stock Check ────────────────────

  checkStock: async (businessId, items) => {
    try {
      const res = await window.electronAPI.demands.checkStock(businessId, items);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Outstanding count (for sidebar badge) ──

  getOutstandingDemandCount: () => {
    const { statusCounts } = get();
    return (statusCounts.outstanding || 0) + (statusCounts.partial || 0);
  },

  // ── Clear selection ────────────────
  clearSelection: () => set({ selectedDemandId: null, selectedDemand: null }),
}));

export default useDemandStore;
