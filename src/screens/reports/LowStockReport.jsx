import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import ExportButton from '@/components/reports/ExportButton';

export default function LowStockReport() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { activeBusiness } = useBusinessStore();
  const { exportCSV, exportExcel, exportPDF } = useReportStore();
  const cur = activeBusiness?.currency_symbol || '₹';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBusiness) return;
    (async () => {
      setLoading(true);
      const res = await window.electronAPI.reports.getLowStockReport(activeBusiness.id);
      if (res.success) setData(res.data);
      setLoading(false);
    })();
  }, [activeBusiness]);

  const outCount = data.filter(r => r.stock_status === 'out').length;
  const lowCount = data.filter(r => r.stock_status === 'low').length;
  const totalReorderCost = data.reduce((s, r) => s + r.suggested_order * r.purchase_price, 0);

  const exportData = data.map(r => ({
    Name: r.name, SKU: r.sku || '', Category: r.category || '',
    'Current Stock': r.current_stock, 'Reorder At': r.reorder_at,
    Status: r.stock_status === 'out' ? 'Out of Stock' : 'Low Stock',
    'Suggested Order': r.suggested_order,
    'Estimated Cost': (r.suggested_order * r.purchase_price).toFixed(2),
  }));

  return (
    <div className="p-6 max-w-[1400px] print:p-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-text-primary">Low Stock & Out of Stock Report</h1>
          <p className="text-xs text-text-muted">
            {outCount} out of stock · {lowCount} low stock · Reorder cost: {cur}{totalReorderCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <ExportButton
          onExportCSV={() => exportCSV(exportData, 'low-stock')}
          onExportExcel={() => exportExcel(exportData, 'Low Stock', 'low-stock')}
          onExportPDF={() => exportPDF({
            filename: 'low-stock',
            title: `${activeBusiness?.name || 'Business'} — Low Stock Report`,
            headers: [
              { key: 'Name', label: 'Product', align: 'left' },
              { key: 'SKU', label: 'SKU', align: 'left' },
              { key: 'Category', label: 'Category', align: 'left' },
              { key: 'Current Stock', label: 'Stock', align: 'right', mono: true },
              { key: 'Reorder At', label: 'Reorder At', align: 'right' },
              { key: 'Status', label: 'Status', align: 'center' },
              { key: 'Suggested Order', label: 'Order Qty', align: 'right', mono: true, bold: true },
              { key: 'Estimated Cost', label: 'Est. Cost', align: 'right', mono: true },
            ],
            rows: exportData,
            summary: [
              { label: 'Out of Stock', value: String(outCount), color: '#dc2626' },
              { label: 'Low Stock', value: String(lowCount), color: '#d97706' },
              { label: 'Reorder Cost', value: `${cur}${totalReorderCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#111827' },
            ],
            currency: cur,
          })}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">{activeBusiness?.name} — Low Stock Report</h1>
      </div>

      {/* Summary badges */}
      <div className="flex gap-4 mb-5 print:hidden">
        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-4 py-2">
          <XCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">{outCount} Out of Stock</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg px-4 py-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-semibold">{lowCount} Low Stock</span>
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
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Current Stock</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Reorder At</th>
                <th className="text-center p-3 font-semibold text-text-muted text-xs">Status</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Suggested Order</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-text-muted text-xs">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-text-muted text-xs">All products are well-stocked!</td></tr>
              ) : data.map((r, i) => (
                <tr key={r.product_id} className={`border-b border-border/50 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                  <td className="p-3">
                    <div className="font-medium text-text-primary text-xs">{r.name}</div>
                    {r.sku && <div className="text-[10px] text-text-muted">{r.sku}</div>}
                  </td>
                  <td className="p-3 text-xs text-text-secondary">{r.category || '—'}</td>
                  <td className={`p-3 text-right font-mono text-xs font-medium ${r.current_stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {r.current_stock}
                  </td>
                  <td className="p-3 text-right text-xs text-text-muted">{r.reorder_at || '—'}</td>
                  <td className="p-3 text-center">
                    {r.stock_status === 'out' ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Out of Stock</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Low Stock</Badge>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-semibold text-blue-600">
                    {r.suggested_order}
                  </td>
                  <td className="p-3 text-right text-xs">
                    {r.purchase_price > 0
                      ? `${cur}${(r.suggested_order * r.purchase_price).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={5} className="p-3 text-xs text-right">Total Reorder Cost</td>
                  <td className="p-3 text-right text-xs font-mono">
                    {data.reduce((s, r) => s + r.suggested_order, 0)}
                  </td>
                  <td className="p-3 text-right text-xs font-mono">
                    {cur}{totalReorderCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
