import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Scan, Wifi, Camera, Type, Volume2, VolumeX, Play, Trash2,
  CheckCircle, XCircle, AlertTriangle, Settings2, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useAuthStore from '@/stores/authStore';
import useScannerStore from '@/stores/scannerStore';
import { attachScannerListener } from '@/utils/scannerListener';
import { playBeep } from '@/utils/scannerAudio';
import { cn, parseDbDate } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function ScannerSettings() {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { settings, loadSettings, sessionHistory, loadHistory, clearHistory } = useScannerStore();

  // Local form state
  const [scannerType, setScannerType] = useState('hid');
  const [scanDelayMs, setScanDelayMs] = useState(80);
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [beepVolume, setBeepVolume] = useState(0.7);
  const [autoScanOnStartup, setAutoScanOnStartup] = useState(false);
  const [webcamDeviceId, setWebcamDeviceId] = useState('');
  const [cameras, setCameras] = useState([]);
  const [saving, setSaving] = useState(false);

  // Test scanner state
  const [testCode, setTestCode] = useState('');
  const [testTiming, setTestTiming] = useState(null);
  const testBufferRef = useRef('');
  const testFirstCharRef = useRef(null);

  // Load settings into form
  useEffect(() => {
    if (activeBusiness?.id) {
      loadSettings(activeBusiness.id);
      loadHistory(activeBusiness.id);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    if (settings) {
      setScannerType(settings.scannerType || 'hid');
      setScanDelayMs(settings.scanDelayMs || 80);
      setPrefix(settings.prefix || '');
      setSuffix(settings.suffix || '');
      setBeepEnabled(settings.beepEnabled ?? true);
      setBeepVolume(settings.beepVolume ?? 0.7);
      setAutoScanOnStartup(settings.autoScanOnStartup ?? false);
      setWebcamDeviceId(settings.webcamDeviceId || '');
    }
  }, [settings]);

  // Enumerate cameras for webcam mode
  useEffect(() => {
    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevices);
      } catch { /* silent */ }
    };
    if (scannerType === 'webcam') enumerate();
  }, [scannerType]);

  // Test scanner listener
  useEffect(() => {
    const detach = attachScannerListener(
      (code) => {
        const timing = testFirstCharRef.current
          ? Date.now() - testFirstCharRef.current
          : 0;
        setTestCode(code);
        setTestTiming(timing);
        testFirstCharRef.current = null;
        if (beepEnabled) playBeep(beepVolume);
      },
      { scanDelayMs, minLength: 1 }
    );

    // Track first character timing for test
    const onFirstChar = (e) => {
      if (e.key.length === 1 && !testFirstCharRef.current) {
        testFirstCharRef.current = Date.now();
      }
    };
    window.addEventListener('keydown', onFirstChar, true);

    return () => {
      detach();
      window.removeEventListener('keydown', onFirstChar, true);
    };
  }, [scanDelayMs, beepEnabled, beepVolume]);

  const handleSave = async () => {
    if (!activeBusiness?.id) return;
    setSaving(true);
    try {
      const res = await window.electronAPI.scanner.updateSettings({
        businessId: activeBusiness.id,
        userId: currentUser?.id,
        userLabel: currentUser?.display_name || currentUser?.username,
        scannerType,
        scanDelayMs,
        prefix,
        suffix,
        beepEnabled,
        beepVolume,
        autoScanOnStartup,
        webcamDeviceId,
      });
      if (res.success) {
        await loadSettings(activeBusiness.id);
        toast({ title: 'Scanner settings saved.' });
      } else {
        toast({ title: 'Failed to save settings', description: res.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleClearHistory = async () => {
    await clearHistory();
    toast({ title: 'Scan history cleared.' });
  };

  const handleTestBeep = () => {
    playBeep(beepVolume);
  };

  const typeCards = [
    {
      key: 'hid',
      title: 'USB / Bluetooth Scanner (HID)',
      desc: 'Plug in your barcode scanner — no driver needed. Works out of the box.',
      icon: Wifi,
    },
    {
      key: 'webcam',
      title: 'Webcam / Camera',
      desc: 'Use your computer\'s camera to scan codes.',
      icon: Camera,
    },
    {
      key: 'manual',
      title: 'Manual Entry Only',
      desc: 'No scanner — type codes by hand.',
      icon: Type,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Scan className="w-6 h-6 text-emerald-500" />
            Scanner Settings
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Configure how InstaMall reads barcodes and QR codes.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-3xl">
        {/* Scanner Type */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-3">
            Scanner Type
          </h2>
          <div className="grid gap-3">
            {typeCards.map((card) => {
              const Icon = card.icon;
              const selected = scannerType === card.key;
              return (
                <button
                  key={card.key}
                  onClick={() => setScannerType(card.key)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    selected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-border bg-white hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                    selected ? 'border-emerald-500' : 'border-gray-300'
                  )}>
                    {selected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Icon className="w-4 h-4 text-text-muted" />
                      {card.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{card.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Webcam camera selector */}
          {scannerType === 'webcam' && cameras.length > 0 && (
            <div className="mt-3 ml-7">
              <label className="text-xs text-text-muted mb-1 block">Camera</label>
              <select
                value={webcamDeviceId}
                onChange={(e) => setWebcamDeviceId(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white w-full max-w-xs"
              >
                <option value="">Default Camera</option>
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* HID Scanner Settings */}
        {scannerType === 'hid' && (
          <section>
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-3">
              HID Scanner Settings
            </h2>
            <div className="grid gap-4 bg-white rounded-xl border border-border p-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  Input delay <span className="text-text-muted">(ms)</span>
                </label>
                <p className="text-xs text-text-muted mb-2">
                  Time to wait after last keypress before considering input complete
                </p>
                <Input
                  type="number"
                  min={40}
                  max={500}
                  value={scanDelayMs}
                  onChange={(e) => setScanDelayMs(Number(e.target.value))}
                  className="w-32"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">Prefix strip</label>
                  <Input
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="none"
                    data-scanner-aware="true"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">Suffix strip</label>
                  <Input
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="none"
                    data-scanner-aware="true"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Audio */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-3">
            Audio
          </h2>
          <div className="bg-white rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {beepEnabled ? (
                  <Volume2 className="w-4 h-4 text-text-muted" />
                ) : (
                  <VolumeX className="w-4 h-4 text-text-muted" />
                )}
                <span className="text-sm font-medium text-text-primary">Beep on scan</span>
              </div>
              <Switch checked={beepEnabled} onCheckedChange={setBeepEnabled} />
            </div>
            {beepEnabled && (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-muted w-16">Volume</span>
                  <Slider
                    value={[beepVolume * 100]}
                    onValueChange={([v]) => setBeepVolume(v / 100)}
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm text-text-muted w-10 text-right">
                    {Math.round(beepVolume * 100)}%
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleTestBeep} className="gap-1.5">
                  <Play className="w-3.5 h-3.5" /> Test Beep
                </Button>
              </>
            )}
          </div>
        </section>

        {/* General */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-3">
            General
          </h2>
          <div className="bg-white rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Activate scan mode on app startup</p>
                <p className="text-xs text-text-muted">Automatically enable scan mode when the app opens</p>
              </div>
              <Switch checked={autoScanOnStartup} onCheckedChange={setAutoScanOnStartup} />
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-text-muted">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono border">F2</kbd>{' '}
                activates scan mode on any screen <span className="text-text-muted/60">(not configurable)</span>
              </p>
            </div>
          </div>
        </section>

        {/* Test Scanner */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-3">
            Test Scanner
          </h2>
          <div className="bg-gray-50 rounded-xl border border-border p-4 min-h-[80px]">
            {testCode ? (
              <div className="flex items-center gap-3">
                {testTiming != null && testTiming < scanDelayMs ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-mono font-medium text-text-primary">{testCode}</p>
                  <p className="text-xs text-text-muted">
                    {testTiming != null ? `Received in ${testTiming}ms` : 'Received'}
                    {testTiming != null && testTiming < scanDelayMs && ' — valid scanner speed'}
                    {testTiming != null && testTiming >= scanDelayMs && ' — may be keyboard input (slow)'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Scan a barcode now to test your scanner...
              </p>
            )}
          </div>
        </section>

        {/* Scan History */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              Scan History <span className="text-text-muted font-normal">(this session)</span>
            </h2>
            {sessionHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearHistory} className="gap-1.5 text-xs text-text-muted">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
          {sessionHistory.length === 0 ? (
            <p className="text-sm text-text-muted">No scans this session.</p>
          ) : (
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              {sessionHistory.map((scan) => (
                <div key={scan.id} className="flex items-center gap-3 px-4 py-2.5">
                  {scan.action_taken === 'found' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {scan.product_name || scan.scanned_code}
                    </p>
                    {scan.product_name && (
                      <p className="text-xs text-text-muted font-mono">{scan.scanned_code}</p>
                    )}
                  </div>
                  <span className="text-xs text-text-muted capitalize">{scan.context}</span>
                  <span className="text-xs text-text-muted">
                    {scan.scanned_at ? formatDistanceToNow(parseDbDate(scan.scanned_at), { addSuffix: true }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
