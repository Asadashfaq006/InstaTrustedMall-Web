import { create } from 'zustand';
import { evaluateFormula, getFormulaColumns } from '@/utils/formulaEngine';

const useProductStore = create((set, get) => ({
  products: [],
  columns: [],
  categories: [],
  selectedProducts: [],
  editingCell: null,
  isLoading: false,
  error: null,

  // ── Load products for current business ─────────────────────────────
  loadProducts: async (businessId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.products.getAll(businessId);
      if (result.success) {
        // Evaluate formulas after loading
        const columns = get().columns;
        const products = get().recalculateFormulas(result.data, columns);
        set({ products, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  // ── Load columns for current business ──────────────────────────────
  loadColumns: async (businessId) => {
    try {
      const result = await window.electronAPI.columns.getAll(businessId);
      if (result.success) {
        set({ columns: result.data });
        return result.data;
      }
    } catch (err) {
      set({ error: err.message });
    }
    return [];
  },

  // ── Load categories ────────────────────────────────────────────────
  loadCategories: async (businessId) => {
    try {
      const result = await window.electronAPI.categories.getAll(businessId);
      if (result.success) {
        set({ categories: result.data });
      }
    } catch (err) {
      set({ error: err.message });
    }
  },

  // ── Seed columns from presets ──────────────────────────────────────
  seedColumns: async (businessId, businessType) => {
    try {
      await window.electronAPI.columns.seedFromPresets({ businessId, businessType });
    } catch (err) {
      console.error('Failed to seed columns:', err);
    }
  },

  // ── Create product ────────────────────────────────────────────────
  createProduct: async (data) => {
    try {
      const result = await window.electronAPI.products.create(data);
      if (result.success) {
        set((state) => ({
          products: [result.data, ...state.products],
        }));
        return result.data;
      }
      // Pass through full result so caller gets error type + message
      return { error: result.error, message: result.message, existingProduct: result.existingProduct };
    } catch (err) {
      return { error: err.message };
    }
  },

  // ── Update a cell value (inline edit) ─────────────────────────────
  updateCell: async (productId, columnId, value) => {
    try {
      const result = await window.electronAPI.products.update({ productId, columnId, value });
      if (result.success) {
        set((state) => {
          const products = state.products.map((p) => {
            if (p.id === productId) {
              const newValues = { ...p.values, [columnId]: String(value) };
              return { ...p, values: newValues };
            }
            return p;
          });
          // Recalculate formulas
          return { products: get().recalculateFormulas(products, state.columns) };
        });
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  // ── Update core product fields ────────────────────────────────────
  updateProductCore: async (data) => {
    try {
      const result = await window.electronAPI.products.updateCore(data);
      if (result.success) {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === data.productId ? { ...p, ...result.data } : p
          ),
        }));
        return result.data;
      }
      return { error: result.error };
    } catch (err) {
      return { error: err.message };
    }
  },

  // ── Soft delete ───────────────────────────────────────────────────
  softDelete: async (productId) => {
    try {
      const result = await window.electronAPI.products.softDelete(productId);
      if (result.success) {
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
          selectedProducts: state.selectedProducts.filter((id) => id !== productId),
        }));
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  // ── Bulk soft delete ──────────────────────────────────────────────
  softDeleteBulk: async (productIds) => {
    try {
      const result = await window.electronAPI.products.softDeleteBulk(productIds);
      if (result.success) {
        set((state) => ({
          products: state.products.filter((p) => !productIds.includes(p.id)),
          selectedProducts: [],
        }));
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  // ── Duplicate product ─────────────────────────────────────────────
  duplicateProduct: async (productId) => {
    try {
      const result = await window.electronAPI.products.duplicate(productId);
      if (result.success) {
        set((state) => ({
          products: [result.data, ...state.products],
        }));
        return result.data;
      }
      return { error: result.error };
    } catch (err) {
      return { error: err.message };
    }
  },

  // ── Selection ─────────────────────────────────────────────────────
  toggleSelect: (productId) => {
    set((state) => {
      const isSelected = state.selectedProducts.includes(productId);
      return {
        selectedProducts: isSelected
          ? state.selectedProducts.filter((id) => id !== productId)
          : [...state.selectedProducts, productId],
      };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedProducts: state.products.map((p) => p.id),
    }));
  },

  clearSelection: () => set({ selectedProducts: [] }),

  // ── Column management ─────────────────────────────────────────────
  createColumn: async (data) => {
    try {
      const result = await window.electronAPI.columns.create(data);
      if (result.success) {
        set((state) => ({
          columns: [...state.columns, result.data].sort((a, b) => a.position - b.position),
        }));
        return result.data;
      }
      return { error: result.error };
    } catch (err) {
      return { error: err.message };
    }
  },

  updateColumn: async (data) => {
    try {
      const result = await window.electronAPI.columns.update(data);
      if (result.success) {
        set((state) => ({
          columns: state.columns.map((c) => (c.id === data.columnId ? result.data : c)),
        }));
        return result.data;
      }
      return { error: result.error };
    } catch (err) {
      return { error: err.message };
    }
  },

  deleteColumn: async (columnId) => {
    try {
      const result = await window.electronAPI.columns.delete(columnId);
      if (result.success) {
        set((state) => ({
          columns: state.columns.filter((c) => c.id !== columnId),
        }));
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  reorderColumns: async (businessId, orderedIds) => {
    try {
      const result = await window.electronAPI.columns.reorder({ businessId, orderedIds });
      if (result.success) {
        set((state) => {
          const reordered = orderedIds.map((id, i) => {
            const col = state.columns.find((c) => c.id === id);
            return col ? { ...col, position: i + 1 } : null;
          }).filter(Boolean);
          return { columns: reordered };
        });
      }
    } catch (err) {
      set({ error: err.message });
    }
  },

  toggleColumnVisibility: async (columnId, isVisible) => {
    try {
      await window.electronAPI.columns.toggleVisibility({ columnId, isVisible });
      set((state) => ({
        columns: state.columns.map((c) =>
          c.id === columnId ? { ...c, is_visible: isVisible ? 1 : 0 } : c
        ),
      }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  // ── Categories ────────────────────────────────────────────────────
  createCategory: async (data) => {
    try {
      const result = await window.electronAPI.categories.create(data);
      if (result.success) {
        set((state) => ({
          categories: [...state.categories, result.data],
        }));
        return result.data;
      }
      return { error: result.error };
    } catch (err) {
      return { error: err.message };
    }
  },

  deleteCategory: async (categoryId) => {
    try {
      const result = await window.electronAPI.categories.delete(categoryId);
      if (result.success) {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== categoryId),
        }));
      }
    } catch (err) {
      set({ error: err.message });
    }
  },

  // ── Cell editing ──────────────────────────────────────────────────
  setEditingCell: (cell) => set({ editingCell: cell }),
  clearEditingCell: () => set({ editingCell: null }),

  // ── Formula recalculation ─────────────────────────────────────────
  recalculateFormulas: (products, columns) => {
    const formulaColumns = columns.filter((c) => c.type === 'formula' && c.formula);
    if (formulaColumns.length === 0) return products;

    // Build column name → id map
    const colNameMap = {};
    for (const c of columns) {
      colNameMap[c.name] = c.id;
    }

    return products.map((product) => {
      const newValues = { ...product.values };

      for (const fc of formulaColumns) {
        const refCols = getFormulaColumns(fc.formula);
        const scope = {};
        for (const refName of refCols) {
          const refId = colNameMap[refName];
          if (refId !== undefined) {
            scope[refName] = newValues[refId] || '0';
          }
        }

        const { value } = evaluateFormula(fc.formula, scope);
        if (value !== null) {
          newValues[fc.id] = value;
        }
      }

      return { ...product, values: newValues };
    });
  },
}));

export default useProductStore;
