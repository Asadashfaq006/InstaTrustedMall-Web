import React, { useEffect, useCallback, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { attachScannerListener } from '@/utils/scannerListener';
import useScannerStore from '@/stores/scannerStore';
import useBusinessStore from '@/stores/businessStore';
import WebcamScannerOverlay from '@/components/scanner/WebcamScannerOverlay';
import { cn } from '@/lib/utils';

/**
 * Reusable scan mode toggle button.
 *
 * Props:
 *  - onScan(code: string) — called when a scan is completed
 *  - context — string label for where the scan happened
 *  - mode — 'hid' | 'webcam' | 'auto' (defaults to 'auto')
 *  - className — extra classes
 */
export default function ScanModeButton({ onScan, context = 'general', mode = 'auto', className }) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const settings = useScannerStore((s) => s.settings);
  const processScan = useScannerStore((s) => s.processScan);

  const [active, setActive] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);

  const resolvedMode = mode === 'auto' ? (settings?.scannerType || 'hid') : mode;

  const handleScan = useCallback(
    async (code) => {
      if (!activeBusiness?.id) return;
      const result = await processScan(activeBusiness.id, code, context);
      if (onScan) onScan(code, result);
    },
    [activeBusiness?.id, context, processScan, onScan]
  );

  // Attach HID listener while active
  useEffect(() => {
    if (!active || resolvedMode === 'webcam') return;
    const detach = attachScannerListener(handleScan, {
      scanDelayMs: settings?.scanDelayMs || 80,
    });
    return detach;
  }, [active, resolvedMode, handleScan, settings?.scanDelayMs]);

  // ESC deactivates
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setActive(false);
        setWebcamOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const handleClick = () => {
    if (active) {
      setActive(false);
      setWebcamOpen(false);
    } else {
      setActive(true);
      if (resolvedMode === 'webcam') {
        setWebcamOpen(true);
      }
    }
  };

  return (
    <>
      <Button
        variant={active ? 'default' : 'outline'}
        size="sm"
        onClick={handleClick}
        className={cn(
          'gap-1.5 transition-all',
          active && 'bg-emerald-500 hover:bg-emerald-600 text-white scan-mode-pulse',
          className
        )}
      >
        <Camera className="w-3.5 h-3.5" />
        {active ? (
          <>Scanning... <span className="text-xs opacity-70">ESC</span></>
        ) : (
          'Scan Mode'
        )}
      </Button>

      {webcamOpen && (
        <WebcamScannerOverlay
          onScanComplete={(code) => handleScan(code)}
          onClose={() => {
            setWebcamOpen(false);
            setActive(false);
          }}
          closeOnScan={false}
        />
      )}
    </>
  );
}
