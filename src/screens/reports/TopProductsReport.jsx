import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import DateRangePicker from '@/components/reports/DateRangePicker';
import ExportButton from '@/components/reports/ExportButton';

export default function TopProductsReport() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { activeBusiness } = useBusinessStore();
  const { dateFrom, dateTo, setDateRange, exportCSV, exportExcel, exportPDF } = useReportStore();
  const cur = activeBusiness?.currency_symbol || '₹';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('revenue');
  const [limit, setLimit] = useState(10);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    const res = await window.electronAPI.reports.getTopProducts({
      businessId: activeBusiness.id, dateFrom, dateTo, sortBy, limit,
    });
    if (res.success) setData(res.data);
    setLoading(false);
  }, [activeBusiness, dateFrom, dateTo, sortBy, limit]);

  useEffect(() => { load(); }, [load]);

  const chartData = data.slice(0, 10).map(r => ({
    name: r.name.length > 14 ? r.name.slice(0, 12) + '…' : r.name,
    revenue: r.total_revenue,
    qty: r.total_qty_sold,
  }));

  const exportData = data.map((r, i) => ({
    Rank: i + 1, Name: r.name, SKU: r.sku || '', Category: r.category || '',
    'Qty Sold': r.total_qty_sold, Revenue: r.total_revenue?.toFixed(2),
    'Current Stock': r.current_stock,
  }));

  return (
    <div className="p-6 max-w-[1400px] print:p-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-text-primary">Top Products</h1>
          <p className="text-xs text-text-muted">Best performers by {sortBy === 'revenue' ? 'revenue' : 'quantity sold'}</p>
        </div>
        <ExportButton
          onExportCSV={() => exportCSV(exportData, 'top-products')}
          onExportExcel={() => exportExcel(exportData, 'Top Products', 'top-products')}
          onExportPDF={() => exportPDF({
            filename: 'top-products',
            title: `${activeBusiness?.name || 'Business'} — Top Products (${dateFrom} to ${dateTo})`,
            headers: [
              { key: 'Rank', label: '#', align: 'center' },
              { key: 'Name', label: 'Product', align: 'left' },
              { key: 'SKU', label: 'SKU', align: 'left' },
              { key: 'Category', label: 'Category', align: 'left' },
              { key: 'Qty Sold', label: 'Qty Sold', align: 'right', mono: true },
              { key: 'Revenue', label: 'Revenue', align: 'right', mono: true, bold: true },
              { key: 'Current Stock', label: 'Stock', align: 'right' },
            ],
            rows: exportData,
            summary: [
              { label: 'Products', value: String(data.length), color: '#111827' },
              { label: 'Total Revenue', value: `${cur}${data.reduce((s, r) => s + (r.total_revenue || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#059669' },
              { label: 'Total Qty Sold', value: String(data.reduce((s, r) => s + (r.total_qty_sold || 0), 0)), color: '#2563eb' },
            ],
            currency: cur,
          })}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">{activeBusiness?.name} — Top Products ({dateFrom} to {dateTo})</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6 print:hidden">
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={setDateRange} />
        <div className="flex gap-2">
          <Button size="sm" variant={sortBy === 'revenue' ? 'default' : 'outline'}
            onClick={() => setSortBy('revenue')} className="text-xs">By Revenue</Button>
          <Button size="sm" variant={sortBy === 'qty_sold' ? 'default' : 'outline'}
            onClick={() => setSortBy('qty_sold')} className="text-xs">By Quantity</Button>
        </div>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-xs"
          value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
          <option value={20}>Top 20</option>
          <option value={50}>Top 50</option>
        </select>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5 mb-6 print:hidden">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => sortBy === 'revenue' ? `${cur}${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}` : v} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => sortBy === 'revenue' ? [`${cur}${Number(v).toLocaleString()}`, 'Revenue'] : [v, 'Qty Sold']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Bar dataKey={sortBy === 'revenue' ? 'revenue' : 'qty'} fill="#2E86AB" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="text-center p-3 font-semibold text-text-muted text-xs w-12">#</th>
              <th className="text-left p-3 font-semibold text-text-muted text-xs">Product</th>
              <th className="text-left p-3 font-semibold text-text-muted text-xs">Category</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Qty Sold</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Revenue</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Stock Left</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted text-xs">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted text-xs">No sales data for this period</td></tr>
            ) : data.map((r, i) => (
              <tr key={r.product_id} className={`border-b border-border/50 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                <td className="p-3 text-center">
                  {i < 3 ? <Award className={`w-4 h-4 mx-auto ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-600'}`} /> : <span className="text-xs text-text-muted">{i + 1}</span>}
                </td>
                <td className="p-3">
                  <div className="font-medium text-text-primary text-xs">{r.name}</div>
                  {r.sku && <span className="text-[10px] text-text-muted">{r.sku}</span>}
                </td>
                <td className="p-3 text-xs text-text-secondary">{r.category || '—'}</td>
                <td className="p-3 text-right font-mono text-xs">{r.total_qty_sold}</td>
                <td className="p-3 text-right font-mono text-xs font-medium">{cur}{r.total_revenue?.toLocaleString()}</td>
                <td className="p-3 text-right font-mono text-xs">{r.current_stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
