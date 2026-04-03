import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PermissionGate from '@/components/auth/PermissionGate';
import useBusinessStore from '@/stores/businessStore';
import useStockStore from '@/stores/stockStore';
import useScannerStore from '@/stores/scannerStore';
import StockOverview from '@/screens/stock/StockOverview';
import MovementLog from '@/screens/stock/MovementLog';
import LowStockPanel from '@/screens/stock/LowStockPanel';
import ReorderLevels from '@/screens/stock/ReorderLevels';
import ExpiryPanel from '@/screens/stock/ExpiryPanel';
import BatchStockInModal from '@/components/stock/BatchStockInModal';
import StockImportModal from '@/components/stock/StockImportModal';
import ScanModeButton from '@/components/scanner/ScanModeButton';
import { BarChart3, History, AlertTriangle, Settings2, Package, Upload, Download, Camera, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'overview', label: 'Stock Overview', icon: BarChart3 },
  { key: 'movements', label: 'Movement Log', icon: History },
  { key: 'alerts', label: 'Low Stock Alerts', icon: AlertTriangle },
  { key: 'expiry', label: 'Expiry Tracking', icon: Clock },
  { key: 'reorder', label: 'Reorder Levels', icon: Settings2 },
];

export default function StockControl() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const exportCSV = useStockStore((s) => s.exportCSV);
  const lowStockCount = useStockStore((s) => s.lowStockCount);
  const outOfStockCount = useStockStore((s) => s.outOfStockCount);

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [batchOpen, setBatchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [scanFlashId, setScanFlashId] = useState(null);

  const handleScanReceive = useCallback((code, result) => {
    if (result?.found && result.product) {
      toast({ title: `✓ ${result.product.name}`, description: 'Ready for stock adjustment' });
      setScanFlashId(result.product.id);
      setTimeout(() => setScanFlashId(null), 1500);
    } else {
      toast({ title: `Code not found: ${code}`, variant: 'destructive' });
    }
  }, [toast]);

  const handleExportLevels = async () => {
    const res = await exportCSV({ businessId: activeBusiness.id, includeHistory: false });
    if (res.success) {
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-levels-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const alertCount = lowStockCount + outOfStockCount;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent" />
            Stock Control
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Track, adjust, and monitor inventory stock levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLevels} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <ScanModeButton
            onScan={handleScanReceive}
            context="stock"
          />
          <PermissionGate permission="stock:adjustIn">
            <Button size="sm" onClick={() => setBatchOpen(true)} className="gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Batch Stock-In
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-white">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'alerts' && alertCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && <StockOverview />}
        {activeTab === 'movements' && <MovementLog />}
        {activeTab === 'alerts' && <LowStockPanel />}
        {activeTab === 'expiry' && <ExpiryPanel />}
        {activeTab === 'reorder' && <ReorderLevels />}
      </div>

      {/* Modals */}
      <BatchStockInModal open={batchOpen} onOpenChange={setBatchOpen} />
      <StockImportModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
