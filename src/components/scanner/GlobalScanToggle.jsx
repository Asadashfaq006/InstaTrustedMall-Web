import React from 'react';
import { Scan } from 'lucide-react';
import useScannerStore from '@/stores/scannerStore';
import { cn } from '@/lib/utils';

/**
 * Global scan mode toggle icon in the topbar/sidebar.
 * Click → toggles scan mode, F2 also toggles.
 * Shows session scan count as badge.
 */
export default function GlobalScanToggle() {
  const isScanModeActive = useScannerStore((s) => s.isScanModeActive);
  const sessionHistory = useScannerStore((s) => s.sessionHistory);
  const toggleScanMode = useScannerStore((s) => s.toggleScanMode);

  const scanCount = sessionHistory.length;

  return (
    <button
      onClick={toggleScanMode}
      title={isScanModeActive ? 'Deactivate scan mode (F2)' : 'Activate scan mode (F2)'}
      className={cn(
        'relative p-2 rounded-lg transition-all',
        isScanModeActive
          ? 'bg-emerald-500/20 text-emerald-500 ring-2 ring-emerald-500/30'
          : 'text-text-muted hover:text-text-primary hover:bg-gray-100'
      )}
    >
      <Scan className={cn('w-5 h-5', isScanModeActive && 'text-emerald-500')} />
      {scanCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-white text-[9px] font-bold px-1">
          {scanCount > 99 ? '99+' : scanCount}
        </span>
      )}
    </button>
  );
}
