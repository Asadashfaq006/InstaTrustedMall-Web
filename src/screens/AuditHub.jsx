import React, { useState } from 'react';
import { ClipboardList, Download, Activity, Package, BarChart3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useAuditStore from '@/stores/auditStore';
import { cn } from '@/lib/utils';
import AuditOverview from '@/screens/audit/AuditOverview';
import ProductHistory from '@/screens/audit/ProductHistory';
import StockLog from '@/screens/audit/StockLog';
import SystemAuditLog from '@/screens/audit/SystemAuditLog';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'product-history', label: 'Product History', icon: Package },
  { key: 'stock-log', label: 'Stock Log', icon: BarChart3 },
  { key: 'system', label: 'System Audit', icon: Shield },
];

export default function AuditHub() {
  const [activeTab, setActiveTab] = useState('overview');
  const { activeBusiness } = useBusinessStore();
  const { exportCSV } = useAuditStore();
  const { toast } = useToast();

  const handleExport = async () => {
    const res = await exportCSV(activeBusiness?.id, activeTab);
    if (res.success) {
      toast({ title: 'CSV exported', description: res.data });
    } else {
      toast({ title: 'Export failed', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-navy" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              Audit & History
            </h1>
            <p className="text-xs text-text-muted">
              Track every change across your business
            </p>
          </div>
        </div>

        {activeTab !== 'overview' && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-navy/10 text-navy'
                : 'text-text-muted hover:text-text-primary hover:bg-gray-100'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto bg-background">
        {activeTab === 'overview' && <AuditOverview />}
        {activeTab === 'product-history' && <ProductHistory />}
        {activeTab === 'stock-log' && <StockLog />}
        {activeTab === 'system' && <SystemAuditLog />}
      </div>
    </div>
  );
}
