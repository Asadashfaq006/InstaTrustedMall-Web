import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Package, Search, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import ExportButton from '@/components/reports/ExportButton';

const STATUS_BADGES = {
  ok: { label: 'In Stock', variant: 'default', className: 'bg-green-100 text-green-700 border-green-200' },
  low: { label: 'Low', variant: 'default', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  out: { label: 'Out', variant: 'default', className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function StockStatusReport() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { activeBusiness } = useBusinessStore();
  const { exportCSV, exportExcel, exportPDF } = useReportStore();
  const cur = activeBusiness?.currency_symbol || '₹';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('stock');
  const [sortDir, setSortDir] = useState('asc');

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    const res = await window.electronAPI.reports.getStockStatus({
      businessId: activeBusiness.id, search, stockStatus: stockFilter, sortBy, sortDir,
    });
    if (res.success) setData(res.data);
    setLoading(false);
  }, [activeBusiness, search, stockFilter, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const totalValue = data.reduce((s, r) => s + (r.stock_value || 0), 0);
  const outCount = data.filter(r => r.stock_status === 'out').length;
  const lowCount = data.filter(r => r.stock_status === 'low').length;

  const exportData = data.map(r => ({
    Name: r.name, SKU: r.sku || '', Category: r.category || '',
    'Current Stock': r.current_stock, 'Reorder At': r.reorder_at,
    'Purchase Price': r.purchase_price, 'Sale Price': r.sale_price,
    'Stock Value': r.stock_value?.toFixed(2), Status: r.stock_status,
  }));

  return (
    <div className="p-6 max-w-[1400px] print:p-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-text-primary">Stock Status Report</h1>
          <p className="text-xs text-text-muted">
            {data.length} products — Total Value: {cur}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <ExportButton
          onExportCSV={() => exportCSV(exportData, 'stock-status')}
          onExportExcel={() => exportExcel(exportData, 'Stock Status', 'stock-status')}
          onExportPDF={() => exportPDF({
            filename: 'stock-status',
            title: `${activeBusiness?.name || 'Business'} — Stock Status Report`,
            headers: [
              { key: 'Name', label: 'Product', align: 'left' },
              { key: 'SKU', label: 'SKU', align: 'left' },
              { key: 'Category', label: 'Category', align: 'left' },
              { key: 'Current Stock', label: 'Stock', align: 'right', mono: true },
              { key: 'Purchase Price', label: 'Buy Price', align: 'right', mono: true },
              { key: 'Sale Price', label: 'Sale Price', align: 'right', mono: true },
              { key: 'Stock Value', label: 'Value', align: 'right', mono: true, bold: true },
              { key: 'Status', label: 'Status', align: 'center' },
            ],
            rows: exportData,
            summary: [
              { label: 'Products', value: String(data.length), color: '#111827' },
              { label: 'Total Value', value: `${cur}${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#111827' },
              { label: 'Low Stock', value: String(lowCount), color: '#d97706' },
              { label: 'Out of Stock', value: String(outCount), color: '#dc2626' },
            ],
            currency: cur,
          })}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">{activeBusiness?.name} — Stock Status Report</h1>
        <p className="text-xs text-gray-500">{data.length} products — Total Value: {cur}{totalValue.toLocaleString()}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 print:hidden">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search products..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {['all', 'ok', 'low', 'out'].map(f => (
            <Button key={f} size="sm" variant={stockFilter === f ? 'default' : 'outline'}
              onClick={() => setStockFilter(f)} className="text-xs capitalize">
              {f === 'all' ? 'All' : f === 'ok' ? 'In Stock' : f === 'low' ? `Low (${lowCount})` : `Out (${outCount})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left p-3 font-semibold text-text-muted text-xs">Product</th>
                <th className="text-left p-3 font-semibold text-text-muted text-xs">Category</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs cursor-pointer select-none"
                  onClick={() => toggleSort('stock')}>
                  <span className="inline-flex items-center gap-1">Stock <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Reorder At</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Buy Price</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Sale Price</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs cursor-pointer select-none"
                  onClick={() => toggleSort('value')}>
                  <span className="inline-flex items-center gap-1">Value <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-center p-3 font-semibold text-text-muted text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-text-muted text-xs">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-text-muted text-xs">No products found</td></tr>
              ) : data.map((r, i) => {
                const badge = STATUS_BADGES[r.stock_status] || STATUS_BADGES.ok;
                return (
                  <tr key={r.product_id} className={`border-b border-border/50 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                    <td className="p-3">
                      <div className="font-medium text-text-primary text-xs">{r.name}</div>
                      {r.sku && <div className="text-[10px] text-text-muted">{r.sku}</div>}
                    </td>
                    <td className="p-3 text-xs text-text-secondary">{r.category || '—'}</td>
                    <td className="p-3 text-right font-mono text-xs font-medium">{r.current_stock}</td>
                    <td className="p-3 text-right text-xs text-text-muted">{r.reorder_at || '—'}</td>
                    <td className="p-3 text-right text-xs">{r.purchase_price ? `${cur}${r.purchase_price}` : '—'}</td>
                    <td className="p-3 text-right text-xs">{r.sale_price ? `${cur}${r.sale_price}` : '—'}</td>
                    <td className="p-3 text-right font-mono text-xs">
                      {r.stock_value > 0 ? `${cur}${r.stock_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
