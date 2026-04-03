import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, Camera, Search, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Full-screen webcam scanner overlay.
 *
 * Props:
 *  - onScanComplete(code: string) — fired on each successful decode
 *  - onClose() — close the overlay
 *  - closeOnScan — if true, auto-close after first scan (800ms delay)
 */
export default function WebcamScannerOverlay({ onScanComplete, onClose, closeOnScan = false }) {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [lastResult, setLastResult] = useState(null); // { text, found, time }
  const [manualCode, setManualCode] = useState('');
  const [visible, setVisible] = useState(false);
  const lastDecodedRef = useRef('');
  const debounceRef = useRef(null);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Enumerate cameras
  useEffect(() => {
    const enumerate = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCamera) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Camera enumeration failed:', err);
      }
    };
    enumerate();
  }, []);

  // Start/restart scanning when camera changes
  useEffect(() => {
    if (!selectedCamera || !videoRef.current) return;

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const startScanning = async () => {
      try {
        await codeReader.decodeFromVideoDevice(
          selectedCamera,
          videoRef.current,
          (result, err) => {
            if (result) {
              const text = result.getText();
              // Debounce same code within 2s
              if (text === lastDecodedRef.current) return;
              lastDecodedRef.current = text;
              clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                lastDecodedRef.current = '';
              }, 2000);

              setLastResult({ text, time: Date.now() });
              onScanComplete(text);

              if (closeOnScan) {
                setTimeout(() => handleClose(), 800);
              }
            }
          }
        );
      } catch (err) {
        console.error('Scanner start failed:', err);
      }
    };

    startScanning();

    return () => {
      codeReader.reset();
    };
  }, [selectedCamera, onScanComplete, closeOnScan]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      if (codeReaderRef.current) codeReaderRef.current.reset();
      onClose();
    }, 250);
  }, [onClose]);

  const handleManualSearch = () => {
    if (manualCode.trim().length >= 3) {
      onScanComplete(manualCode.trim());
      setLastResult({ text: manualCode.trim(), time: Date.now() });
      setManualCode('');
      if (closeOnScan) setTimeout(() => handleClose(), 800);
    }
  };

  // ESC to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  // Time-ago label
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 5) return 'just now';
    return `${sec} sec ago`;
  };

  // Update time display
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9998] flex flex-col items-center justify-center transition-all duration-250',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.96]'
      )}
      style={{ backgroundColor: 'rgba(13,17,23,0.92)' }}
    >
      {/* Header */}
      <div className="w-full max-w-[600px] flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            Webcam Scanner
          </h2>
          <p className="text-gray-400 text-sm">Point camera at a barcode or QR code</p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Video feed */}
      <div className="relative w-full max-w-[560px] aspect-[4/3] rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Viewfinder frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[240px] h-[240px]">
            {/* Corner marks */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-sm" />

            {/* Scanning line */}
            <div className="absolute left-2 right-2 scan-line" />
          </div>
        </div>
      </div>

      {/* Camera selector */}
      {cameras.length > 1 && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-gray-400 text-sm">Camera:</span>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 border border-white/20 outline-none"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Last scan result */}
      {lastResult && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{lastResult.text}</span>
          <span className="text-gray-500">{getTimeAgo(lastResult.time)}</span>
        </div>
      )}

      {/* Manual entry */}
      <div className="mt-4 w-full max-w-[560px] px-4">
        <div className="border-t border-white/10 pt-4">
          <p className="text-gray-500 text-xs mb-2">Or type manually</p>
          <div className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              placeholder="SKU or barcode"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              data-scanner-aware="true"
            />
            <Button onClick={handleManualSearch} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1">
              <Search className="w-3.5 h-3.5" /> Search
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
