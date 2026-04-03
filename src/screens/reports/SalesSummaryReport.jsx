import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import DateRangePicker from '@/components/reports/DateRangePicker';
import ExportButton from '@/components/reports/ExportButton';

export default function SalesSummaryReport() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { activeBusiness } = useBusinessStore();
  const { dateFrom, dateTo, groupBy, setDateRange, setGroupBy, exportCSV, exportExcel, exportPDF } = useReportStore();
  const cur = activeBusiness?.currency_symbol || '₹';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    const res = await window.electronAPI.reports.getSalesSummary({
      businessId: activeBusiness.id, groupBy, dateFrom, dateTo,
    });
    if (res.success) setData(res.data);
    setLoading(false);
  }, [activeBusiness, dateFrom, dateTo, groupBy]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = data.reduce((s, r) => s + r.demand_count, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const chartData = data.map(r => {
    let label = r.period;
    try {
      if (groupBy === 'day') label = format(parseISO(r.period), 'MMM d');
      else if (groupBy === 'month') label = format(parseISO(r.period + '-01'), 'MMM yy');
    } catch { /* keep raw */ }
    return { ...r, label };
  });

  const exportData = data.map(r => ({
    Period: r.period, Revenue: r.revenue?.toFixed(2), Orders: r.demand_count,
    'Avg Order': r.avg_order_value?.toFixed(2), Discount: r.total_discount?.toFixed(2), Tax: r.total_tax?.toFixed(2),
  }));

  return (
    <div className="p-6 max-w-[1400px] print:p-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-text-primary">Sales Summary</h1>
          <p className="text-xs text-text-muted">Revenue and order trends grouped by {groupBy}</p>
        </div>
        <ExportButton
          onExportCSV={() => exportCSV(exportData, 'sales-summary')}
          onExportExcel={() => exportExcel(exportData, 'Sales Summary', 'sales-summary')}
          onExportPDF={() => exportPDF({
            filename: 'sales-summary',
            title: `${activeBusiness?.name || 'Business'} — Sales Summary (${dateFrom} to ${dateTo})`,
            headers: [
              { key: 'Period', label: 'Period', align: 'left' },
              { key: 'Revenue', label: 'Revenue', align: 'right', mono: true },
              { key: 'Orders', label: 'Orders', align: 'right' },
              { key: 'Avg Order', label: 'Avg Order', align: 'right', mono: true },
              { key: 'Discount', label: 'Discount', align: 'right' },
              { key: 'Tax', label: 'Tax', align: 'right' },
            ],
            rows: exportData,
            summary: [
              { label: 'Total Revenue', value: `${cur}${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#059669' },
              { label: 'Total Orders', value: String(totalOrders), color: '#111827' },
              { label: 'Avg Order Value', value: `${cur}${avgOrderValue.toLocaleString()}`, color: '#2563eb' },
            ],
            currency: cur,
          })}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">{activeBusiness?.name} — Sales Summary ({dateFrom} to {dateTo})</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6 print:hidden">
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={setDateRange} />
        <div className="flex gap-1">
          {['day', 'week', 'month'].map(g => (
            <Button key={g} size="sm" variant={groupBy === g ? 'default' : 'outline'}
              onClick={() => setGroupBy(g)} className="text-xs capitalize">{g}</Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-600">{cur}{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-1">Total Orders</p>
          <p className="text-xl font-bold text-text-primary">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-1">Avg Order Value</p>
          <p className="text-xl font-bold text-blue-600">{cur}{avgOrderValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:hidden">
        {/* Revenue */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Revenue Trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={chartData.length > 20 ? 12 : 24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} width={45} />
                <Tooltip formatter={(v) => [`${cur}${Number(v).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#27AE60" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-text-muted text-center py-12">No data</p>}
        </div>

        {/* Orders trend */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Orders Trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Line type="monotone" dataKey="demand_count" name="Orders" stroke="#2E86AB" strokeWidth={2} dot={{ r: 3, fill: '#2E86AB' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-text-muted text-center py-12">No data</p>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="text-left p-3 font-semibold text-text-muted text-xs">Period</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Revenue</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Orders</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Avg Order</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Discount</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Tax</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted text-xs">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted text-xs">No sales data for this period</td></tr>
            ) : data.map((r, i) => (
              <tr key={r.period} className={`border-b border-border/50 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                <td className="p-3 text-xs font-medium text-text-primary">{r.period}</td>
                <td className="p-3 text-right font-mono text-xs font-medium">{cur}{r.revenue?.toLocaleString()}</td>
                <td className="p-3 text-right text-xs">{r.demand_count}</td>
                <td className="p-3 text-right text-xs">{cur}{r.avg_order_value?.toLocaleString()}</td>
                <td className="p-3 text-right text-xs text-text-muted">{cur}{r.total_discount?.toLocaleString()}</td>
                <td className="p-3 text-right text-xs text-text-muted">{cur}{r.total_tax?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="p-3 text-xs">Totals</td>
                <td className="p-3 text-right font-mono text-xs">{cur}{totalRevenue.toLocaleString()}</td>
                <td className="p-3 text-right text-xs">{totalOrders}</td>
                <td className="p-3 text-right text-xs">{cur}{avgOrderValue.toLocaleString()}</td>
                <td className="p-3 text-right text-xs text-text-muted">{cur}{data.reduce((s, r) => s + (r.total_discount || 0), 0).toLocaleString()}</td>
                <td className="p-3 text-right text-xs text-text-muted">{cur}{data.reduce((s, r) => s + (r.total_tax || 0), 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
