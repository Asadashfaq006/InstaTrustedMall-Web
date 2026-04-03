import { create } from 'zustand';

const useBuyerStore = create((set, get) => ({
  // ── State ───────────────────────────
  buyers: [],
  archivedBuyers: [],
  selectedBuyerId: null,
  isLoading: false,
  error: null,

  // UI state
  searchQuery: '',
  sortBy: 'recent',
  filterStatus: 'all',
  viewMode: 'card', // 'card' | 'list'

  // ── Setters ─────────────────────────
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSortBy: (s) => set({ sortBy: s }),
  setFilterStatus: (f) => set({ filterStatus: f }),
  setViewMode: (v) => set({ viewMode: v }),
  setSelectedBuyerId: (id) => set({ selectedBuyerId: id }),

  // ── Loaders ─────────────────────────

  loadBuyers: async (businessId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.buyers.getAll(businessId);
      if (res.success) {
        set({ buyers: res.data, isLoading: false });
      } else {
        set({ error: res.error, isLoading: false });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  loadArchivedBuyers: async (businessId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.buyers.getArchived(businessId);
      if (res.success) {
        set({ archivedBuyers: res.data, isLoading: false });
      } else {
        set({ error: res.error, isLoading: false });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  // ── Actions ─────────────────────────

  createBuyer: async (data) => {
    try {
      const res = await window.electronAPI.buyers.create(data);
      if (res.success) {
        set((s) => ({ buyers: [res.data, ...s.buyers] }));
        return res;
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateBuyer: async (data) => {
    try {
      const res = await window.electronAPI.buyers.update(data);
      if (res.success) {
        set((s) => ({
          buyers: s.buyers.map(b => b.id === res.data.id ? res.data : b),
        }));
        return res;
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  archiveBuyer: async (buyerId) => {
    try {
      const res = await window.electronAPI.buyers.archive(buyerId);
      if (res.success) {
        set((s) => ({
          buyers: s.buyers.filter(b => b.id !== buyerId),
          selectedBuyerId: s.selectedBuyerId === buyerId ? null : s.selectedBuyerId,
        }));
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  restoreBuyer: async (buyerId, businessId) => {
    try {
      const res = await window.electronAPI.buyers.restore(buyerId);
      if (res.success) {
        set((s) => ({
          archivedBuyers: s.archivedBuyers.filter(b => b.id !== buyerId),
        }));
        // Reload active buyers to include restored buyer
        if (businessId) get().loadBuyers(businessId);
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deleteBuyer: async (buyerId) => {
    try {
      const res = await window.electronAPI.buyers.deleteBuyer(buyerId);
      if (res.success) {
        set((s) => ({
          buyers: s.buyers.filter(b => b.id !== buyerId),
          archivedBuyers: s.archivedBuyers.filter(b => b.id !== buyerId),
          selectedBuyerId: s.selectedBuyerId === buyerId ? null : s.selectedBuyerId,
        }));
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Payments ────────────────────────

  createPayment: async (data) => {
    try {
      const res = await window.electronAPI.payments.create(data);
      if (res.success) {
        // Refresh the buyer to get updated balance
        const buyerRes = await window.electronAPI.buyers.getById(data.buyerId);
        if (buyerRes.success) {
          set((s) => ({
            buyers: s.buyers.map(b => b.id === data.buyerId ? buyerRes.data : b),
          }));
        }
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deletePayment: async (paymentId, buyerId) => {
    try {
      const res = await window.electronAPI.payments.deletePayment(paymentId);
      if (res.success && buyerId) {
        // Refresh the buyer to get updated balance
        const buyerRes = await window.electronAPI.buyers.getById(buyerId);
        if (buyerRes.success) {
          set((s) => ({
            buyers: s.buyers.map(b => b.id === buyerId ? buyerRes.data : b),
          }));
        }
      }
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Outstanding badge count ─────────
  getOutstandingCount: () => {
    return get().buyers.filter(b =>
      b.payment_status === 'outstanding' || b.payment_status === 'partial'
    ).length;
  },
}));

export default useBuyerStore;
