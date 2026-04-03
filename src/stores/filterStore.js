import { create } from 'zustand';

const useFilterStore = create((set, get) => ({
  searchQuery: '',
  activeFilters: [],       // [{ columnId, operator, value }]
  sortColumn: null,        // columnId or 'name', 'sku', 'category', 'created_at'
  sortDirection: 'asc',    // 'asc' or 'desc'
  savedFilters: [],
  activeSavedFilter: null,

  // ── Search ────────────────────────────────────────────────────────
  setSearchQuery: (query) => set({ searchQuery: query }),

  // ── Sorting ───────────────────────────────────────────────────────
  setSort: (column, direction) => set({ sortColumn: column, sortDirection: direction || 'asc' }),
  toggleSort: (column) => {
    const state = get();
    if (state.sortColumn === column) {
      if (state.sortDirection === 'asc') {
        set({ sortDirection: 'desc' });
      } else {
        set({ sortColumn: null, sortDirection: 'asc' });
      }
    } else {
      set({ sortColumn: column, sortDirection: 'asc' });
    }
  },

  // ── Filters ───────────────────────────────────────────────────────
  addFilter: (filter) => {
    set((state) => ({
      activeFilters: [...state.activeFilters, filter],
    }));
  },

  removeFilter: (index) => {
    set((state) => ({
      activeFilters: state.activeFilters.filter((_, i) => i !== index),
    }));
  },

  updateFilter: (index, filter) => {
    set((state) => ({
      activeFilters: state.activeFilters.map((f, i) => (i === index ? filter : f)),
    }));
  },

  clearFilters: () => set({ activeFilters: [], activeSavedFilter: null }),

  // ── Saved Filters ─────────────────────────────────────────────────
  loadSavedFilters: async (businessId) => {
    try {
      const result = await window.electronAPI.filters.getAll(businessId);
      if (result.success) {
        set({ savedFilters: result.data });
      }
    } catch (err) {
      console.error('Failed to load saved filters:', err);
    }
  },

  saveFilter: async (businessId, name) => {
    try {
      const { activeFilters, sortColumn, sortDirection, searchQuery } = get();
      const filterJson = JSON.stringify({ activeFilters, sortColumn, sortDirection, searchQuery });
      const result = await window.electronAPI.filters.save({ businessId, name, filterJson });
      if (result.success) {
        set((state) => ({
          savedFilters: [result.data, ...state.savedFilters],
        }));
        return result.data;
      }
      return { error: result.error };
    } catch (err) {
      return { error: err.message };
    }
  },

  applySavedFilter: (filter) => {
    try {
      const parsed = JSON.parse(filter.filter_json);
      set({
        activeFilters: parsed.activeFilters || [],
        sortColumn: parsed.sortColumn || null,
        sortDirection: parsed.sortDirection || 'asc',
        searchQuery: parsed.searchQuery || '',
        activeSavedFilter: filter.id,
      });
    } catch (err) {
      console.error('Failed to apply saved filter:', err);
    }
  },

  deleteSavedFilter: async (filterId) => {
    try {
      const result = await window.electronAPI.filters.delete(filterId);
      if (result.success) {
        set((state) => ({
          savedFilters: state.savedFilters.filter((f) => f.id !== filterId),
          activeSavedFilter: state.activeSavedFilter === filterId ? null : state.activeSavedFilter,
        }));
      }
    } catch (err) {
      console.error('Failed to delete saved filter:', err);
    }
  },

  // ── Apply filters and sort to products ────────────────────────────
  getFilteredProducts: (products, columns) => {
    const { searchQuery, activeFilters, sortColumn, sortDirection } = get();
    let filtered = [...products];

    // Build column id → column map
    const colMap = {};
    for (const c of columns) colMap[c.id] = c;

    // 1. Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        // Search core fields
        if (p.name?.toLowerCase().includes(query)) return true;
        if (p.sku?.toLowerCase().includes(query)) return true;
        if (p.barcode?.toLowerCase().includes(query)) return true;
        if (p.category?.toLowerCase().includes(query)) return true;
        // Search custom column values
        if (p.values) {
          for (const val of Object.values(p.values)) {
            if (val && String(val).toLowerCase().includes(query)) return true;
          }
        }
        return false;
      });
    }

    // 2. Column filters
    for (const filter of activeFilters) {
      const { columnId, operator, value } = filter;
      filtered = filtered.filter((p) => {
        let cellValue;

        // Core columns
        if (columnId === 'name') cellValue = p.name || '';
        else if (columnId === 'sku') cellValue = p.sku || '';
        else if (columnId === 'barcode') cellValue = p.barcode || '';
        else if (columnId === 'category') cellValue = p.category || '';
        else cellValue = p.values?.[columnId] || '';

        const strVal = String(cellValue).toLowerCase();
        const filterVal = String(value).toLowerCase();

        switch (operator) {
          case 'contains': return strVal.includes(filterVal);
          case 'not_contains': return !strVal.includes(filterVal);
          case 'equals': return strVal === filterVal;
          case 'not_equals': return strVal !== filterVal;
          case 'starts_with': return strVal.startsWith(filterVal);
          case 'ends_with': return strVal.endsWith(filterVal);
          case 'is_empty': return strVal === '';
          case 'is_not_empty': return strVal !== '';
          case 'greater_than': return parseFloat(cellValue) > parseFloat(value);
          case 'less_than': return parseFloat(cellValue) < parseFloat(value);
          case 'greater_equal': return parseFloat(cellValue) >= parseFloat(value);
          case 'less_equal': return parseFloat(cellValue) <= parseFloat(value);
          default: return true;
        }
      });
    }

    // 3. Sort
    if (sortColumn) {
      filtered.sort((a, b) => {
        let valA, valB;

        if (['name', 'sku', 'barcode', 'category', 'created_at'].includes(sortColumn)) {
          valA = a[sortColumn] || '';
          valB = b[sortColumn] || '';
        } else {
          valA = a.values?.[sortColumn] || '';
          valB = b.values?.[sortColumn] || '';
        }

        // Try numeric comparison
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        // String comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        const cmp = strA.localeCompare(strB);
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return filtered;
  },

  // ── Reset ─────────────────────────────────────────────────────────
  reset: () => set({
    searchQuery: '',
    activeFilters: [],
    sortColumn: null,
    sortDirection: 'asc',
    activeSavedFilter: null,
  }),
}));

export default useFilterStore;
