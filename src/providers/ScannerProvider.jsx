import React, { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { attachScannerListener } from '@/utils/scannerListener';
import useScannerStore from '@/stores/scannerStore';
import useBusinessStore from '@/stores/businessStore';
import useAuthStore from '@/stores/authStore';
import GlobalScanPopup from '@/components/scanner/GlobalScanPopup';

/**
 * Root-level scanner provider that:
 * 1. Loads scanner settings on mount
 * 2. Attaches global HID scanner listener
 * 3. Registers F2/ESC keyboard shortcuts
 * 4. Renders GlobalScanPopup on scan result
 */
export default function ScannerProvider({ children }) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    settings,
    isScanModeActive,
    loadSettings,
    processScan,
    activateScanMode,
    deactivateScanMode,
  } = useScannerStore();

  const [showPopup, setShowPopup] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const router = useRouter();
  const navigate = (path) => router.push(path);

  // Load scanner settings when business changes
  useEffect(() => {
    if (activeBusiness?.id) {
      loadSettings(activeBusiness.id);
    }
  }, [activeBusiness?.id, loadSettings]);

  // Auto-activate scan mode on startup if configured
  useEffect(() => {
    if (settings?.autoScanOnStartup && !isScanModeActive) {
      activateScanMode();
    }
  }, [settings?.autoScanOnStartup]);

  // F2 toggle scan mode, ESC deactivate
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const store = useScannerStore.getState();
        store.isScanModeActive ? store.deactivateScanMode() : store.activateScanMode();
      }
      if (e.key === 'Escape') {
        useScannerStore.getState().deactivateScanMode();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Attach global HID scanner listener
  useEffect(() => {
    if (!settings || !activeBusiness?.id) return;

    const detach = attachScannerListener(
      async (code) => {
        // Only intercept if global scan mode is ON
        if (!useScannerStore.getState().isScanModeActive) return;

        const result = await processScan(activeBusiness.id, code, 'global');
        if (result) {
          setScanResult(result);
          setShowPopup(true);
        }
      },
      { scanDelayMs: settings.scanDelayMs }
    );
    return detach;
  }, [settings, activeBusiness?.id, processScan]);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
  }, []);

  return (
    <>
      {children}
      {showPopup && scanResult && (
        <GlobalScanPopup
          result={scanResult}
          onClose={handleClosePopup}
          onNavigate={navigate}
        />
      )}
    </>
  );
}
