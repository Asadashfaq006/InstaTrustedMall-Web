import { create } from 'zustand';
import { stripPrefixSuffix } from '@/utils/scannerListener';
import { playBeep, playErrorBeep } from '@/utils/scannerAudio';

const useScannerStore = create((set, get) => ({
  // Settings
  settings: null,
  sessionId: null,

  // Active scan state
  isScanModeActive: false,
  lastScannedCode: null,
  lastScannedProduct: null,
  lastScanStatus: null, // 'found' | 'not_found'
  sessionHistory: [],

  // Webcam state
  isWebcamOpen: false,
  webcamDeviceId: null,
  availableCameras: [],

  // ── Loaders ────────────────────────

  loadSettings: async (businessId) => {
    try {
      const res = await window.electronAPI.scanner.getSettings(businessId);
      if (res.success) {
        set({
          settings: res.data,
          sessionId: get().sessionId || crypto.randomUUID(),
        });
      }
    } catch { /* silent */ }
  },

  loadHistory: async (businessId) => {
    try {
      const { sessionId } = get();
      if (!sessionId) return;
      const res = await window.electronAPI.scanner.getSessionHistory({
        businessId,
        sessionId,
        limit: 50,
      });
      if (res.success) {
        set({ sessionHistory: res.data || [] });
      }
    } catch { /* silent */ }
  },

  // ── Scan Mode ──────────────────────

  activateScanMode: () => set({ isScanModeActive: true }),
  deactivateScanMode: () => set({ isScanModeActive: false }),
  toggleScanMode: () => set((s) => ({ isScanModeActive: !s.isScanModeActive })),

  // ── Webcam ─────────────────────────

  openWebcam: () => set({ isWebcamOpen: true }),
  closeWebcam: () => set({ isWebcamOpen: false }),
  setAvailableCameras: (cameras) => set({ availableCameras: cameras }),
  setWebcamDeviceId: (id) => set({ webcamDeviceId: id }),

  // ── Core Scan Processing ───────────

  processScan: async (businessId, code, context = 'global') => {
    const { settings, sessionId } = get();

    // Strip prefix/suffix
    const stripped = stripPrefixSuffix(code, settings?.prefix, settings?.suffix);
    if (!stripped) return null;

    // Play beep
    if (settings?.beepEnabled) playBeep(settings.beepVolume);

    // Lookup product
    const res = await window.electronAPI.scanner.lookupCode({ businessId, code: stripped });

    if (!res.success) return null;

    const status = res.data.found ? 'found' : 'not_found';
    set({
      lastScannedCode: stripped,
      lastScannedProduct: res.data.product ?? null,
      lastScanStatus: status,
    });

    // If not found, play error beep
    if (!res.data.found && settings?.beepEnabled) {
      playErrorBeep(settings.beepVolume);
    }

    // Log to DB
    try {
      await window.electronAPI.scanner.logScan({
        businessId,
        sessionId,
        scannedCode: stripped,
        productId: res.data.product?.id ?? null,
        productName: res.data.product?.name ?? null,
        actionTaken: status,
        context,
      });
    } catch { /* silent */ }

    // Update in-memory history
    await get().loadHistory(businessId);

    return res.data; // { found, product, scannedCode }
  },

  // ── Clear History ──────────────────

  clearHistory: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    try {
      await window.electronAPI.scanner.clearSessionHistory(sessionId);
      set({ sessionHistory: [] });
    } catch { /* silent */ }
  },

  // ── Reset ──────────────────────────

  reset: () =>
    set({
      settings: null,
      isScanModeActive: false,
      lastScannedCode: null,
      lastScannedProduct: null,
      lastScanStatus: null,
      sessionHistory: [],
      isWebcamOpen: false,
    }),
}));

export default useScannerStore;
