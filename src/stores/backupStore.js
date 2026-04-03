// src/stores/backupStore.js – Zustand store for backup/import/export state
import { create } from 'zustand';

const useBackupStore = create((set, get) => ({
  // Backup state
  backupLog: [],
  backupSettings: null,
  isBackingUp: false,
  lastScheduledBackup: null,

  // Restore state
  isRestoring: false,
  restoreProgress: null,

  // Import state  
  isImporting: false,

  // ── Backup Actions ──────────────────────────────────────────────
  loadBackupLog: async (businessId) => {
    const res = await window.electronAPI.backup.getLog(businessId);
    if (res.success) set({ backupLog: res.data });
    return res;
  },

  loadBackupSettings: async (businessId) => {
    const res = await window.electronAPI.backup.getSettings(businessId);
    if (res.success) set({ backupSettings: res.data });
    return res;
  },

  updateBackupSettings: async (data) => {
    const res = await window.electronAPI.backup.updateSettings(data);
    if (res.success) set({ backupSettings: res.data });
    return res;
  },

  createBackup: async (data) => {
    set({ isBackingUp: true });
    try {
      const res = await window.electronAPI.backup.create(data);
      if (res.success) {
        // Refresh log
        await get().loadBackupLog(data.businessId);
      }
      return res;
    } finally {
      set({ isBackingUp: false });
    }
  },

  deleteLogEntry: async ({ logId, deleteFile, businessId }) => {
    const res = await window.electronAPI.backup.deleteLogEntry({ logId, deleteFile });
    if (res.success) await get().loadBackupLog(businessId);
    return res;
  },

  clearOldBackups: async ({ businessId, keepRecent }) => {
    const res = await window.electronAPI.backup.clearOld({ businessId, keepRecent });
    if (res.success) await get().loadBackupLog(businessId);
    return res;
  },

  // ── Restore Actions ─────────────────────────────────────────────
  verifyBackupFile: async (filePath) => {
    return await window.electronAPI.backup.verifyFile(filePath);
  },

  restoreBackup: async (data) => {
    set({ isRestoring: true, restoreProgress: 'creating_safety_backup' });
    try {
      set({ restoreProgress: 'restoring' });
      const res = await window.electronAPI.backup.restore(data);
      if (res.success) set({ restoreProgress: 'completed' });
      else set({ restoreProgress: 'failed' });
      return res;
    } finally {
      set({ isRestoring: false });
    }
  },

  clearRestoreProgress: () => set({ restoreProgress: null }),

  // ── Import Actions ──────────────────────────────────────────────
  parseImportFile: async ({ filePath, fileType }) => {
    return await window.electronAPI.dataImport.parseFile({ filePath, fileType });
  },

  importProducts: async (data) => {
    set({ isImporting: true });
    try {
      return await window.electronAPI.dataImport.importProducts(data);
    } finally {
      set({ isImporting: false });
    }
  },

  importBuyers: async (data) => {
    set({ isImporting: true });
    try {
      return await window.electronAPI.dataImport.importBuyers(data);
    } finally {
      set({ isImporting: false });
    }
  },

  validateImportRows: async (data) => {
    return await window.electronAPI.dataImport.validateRows(data);
  },

  // ── Export Actions ──────────────────────────────────────────────
  exportProducts: async (data) => {
    return await window.electronAPI.dataExport.products(data);
  },

  exportBuyers: async (data) => {
    return await window.electronAPI.dataExport.buyers(data);
  },

  exportDemands: async (data) => {
    return await window.electronAPI.dataExport.demands(data);
  },

  saveExportFile: async (data) => {
    return await window.electronAPI.dataExport.saveFile(data);
  },

  // ── Scheduler Events ───────────────────────────────────────────
  setLastScheduledBackup: (data) => set({ lastScheduledBackup: data }),
}));

export default useBackupStore;
