import { create } from 'zustand';

const useSalesStore = create((set, get) => ({
  // ── State ──────────────────────────
  sales: [],
  totalSales: 0,
  summary: { total_sales: 0, total_revenue: 0, total_collected: 0, total_outstanding: 0 },
  userBreakdown: [],
  topProducts: [],
  isLoading: false,
  error: null,

  // UI state
  searchQuery: '',
  startDate: '',
  endDate: '',
  selectedUserId: null,
  sortBy: 'recent',
  page: 1,
  pageSize: 50,

  // ── Setters ──────────────────────────
  setSearchQuery: (q) => set({ searchQuery: q, page: 1 }),
  setDateRange: (start, end) => set({ startDate: start, endDate: end, page: 1 }),
  setSelectedUserId: (id) => set({ selectedUserId: id, page: 1 }),
  setSortBy: (s) => set({ sortBy: s, page: 1 }),
  setPage: (p) => set({ page: p }),

  // ── Loaders ──────────────────────────
  loadSales: async (businessId) => {
    const { searchQuery, startDate, endDate, selectedUserId, sortBy, page, pageSize } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.sales.getAll({
        businessId,
        search: searchQuery.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        userId: selectedUserId || null,
        sortBy,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      if (res.success) {
        set({ sales: res.data.sales, totalSales: res.data.total, isLoading: false });
      } else {
        set({ error: res.error, isLoading: false });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  loadSummary: async (businessId) => {
    try {
      const { startDate, endDate } = get();
      const res = await window.electronAPI.sales.getSummary({
        businessId,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      if (res.success) set({ summary: res.data });
    } catch {}
  },

  loadUserBreakdown: async (businessId) => {
    try {
      const { startDate, endDate } = get();
      const res = await window.electronAPI.sales.getByUser({
        businessId,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      if (res.success) set({ userBreakdown: res.data });
    } catch {}
  },

  loadTopProducts: async (businessId) => {
    try {
      const { startDate, endDate } = get();
      const res = await window.electronAPI.sales.getTopProducts({
        businessId,
        startDate: startDate || null,
        endDate: endDate || null,
        limit: 15,
      });
      if (res.success) set({ topProducts: res.data });
    } catch {}
  },

  loadAll: async (businessId) => {
    const { loadSales, loadSummary, loadUserBreakdown, loadTopProducts } = get();
    await Promise.all([
      loadSales(businessId),
      loadSummary(businessId),
      loadUserBreakdown(businessId),
      loadTopProducts(businessId),
    ]);
  },
}));

export default useSalesStore;
