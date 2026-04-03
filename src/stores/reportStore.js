import { create } from 'zustand';

const useReportStore = create((set, get) => ({
  // Dashboard
  dashboardStats: null,
  dashboardLoading: false,
  lastRefreshed: null,

  // Report state
  reportData: [],
  reportTotal: 0,
  reportLoading: false,
  reportError: null,

  // Date range filters
  dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  dateTo: new Date().toISOString().split('T')[0],
  groupBy: 'day',

  // Loaders
  loadDashboard: async (businessId) => {
    set({ dashboardLoading: true });
    try {
      const res = await window.electronAPI.reports.getDashboardStats(businessId);
      if (res.success) {
        set({ dashboardStats: res.data, dashboardLoading: false, lastRefreshed: new Date() });
      } else {
        set({ dashboardLoading: false });
      }
    } catch {
      set({ dashboardLoading: false });
    }
  },

  // Filters
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setGroupBy: (g) => set({ groupBy: g }),

  // Export helpers
  exportCSV: async (data, filename) => {
    try {
      const res = await window.electronAPI.reports.exportCSV({ data, filename });
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  exportExcel: async (data, sheetName, filename) => {
    try {
      const res = await window.electronAPI.reports.exportExcel({ data, sheetName, filename });
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  exportPDF: async ({ filename, title, headers, rows, summary, currency }) => {
    try {
      const res = await window.electronAPI.reports.exportPDF({ filename, title, headers, rows, summary, currency });
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
}));

export default useReportStore;
