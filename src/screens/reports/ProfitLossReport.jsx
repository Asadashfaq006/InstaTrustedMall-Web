import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import DateRangePicker from '@/components/reports/DateRangePicker';
import ExportButton from '@/components/reports/ExportButton';

export default function ProfitLossReport() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { activeBusiness } = useBusinessStore();
  const { dateFrom, dateTo, groupBy, setDateRange, setGroupBy, exportCSV, exportExcel, exportPDF } = useReportStore();
  const cur = activeBusiness?.currency_symbol || '₹';

  const [rows, setRows] = useState([]);
  const [missingCostCount, setMissingCostCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    const res = await window.electronAPI.reports.getProfitLoss({
      businessId: activeBusiness.id, groupBy, dateFrom, dateTo,
    });
    if (res.success) {
      setRows(res.data.rows || []);
      setMissingCostCount(res.data.missingCostCount || 0);
    }
    setLoading(false);
  }, [activeBusiness, dateFrom, dateTo, groupBy]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCogs = rows.reduce((s, r) => s + r.cogs, 0);
  const totalProfit = totalRevenue - totalCogs;
  const totalMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const chartData = rows.map(r => {
    let label = r.period;
    try {
      if (groupBy === 'day') label = format(parseISO(r.period), 'MMM d');
      else if (groupBy === 'month') label = format(parseISO(r.period + '-01'), 'MMM yy');
    } catch { /* keep raw */ }
    return { ...r, label };
  });

  const exportData = rows.map(r => ({
    Period: r.period, Revenue: r.revenue?.toFixed(2), COGS: r.cogs?.toFixed(2),
    'Gross Profit': r.gross_profit?.toFixed(2), 'Margin %': r.margin_pct,
    Orders: r.demand_count,
  }));

  return (
    <div className="p-6 max-w-[1400px] print:p-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-text-primary">Profit & Loss Report</h1>
          <p className="text-xs text-text-muted">Revenue vs cost analysis with margin</p>
        </div>
        <ExportButton
          onExportCSV={() => exportCSV(exportData, 'profit-loss')}
          onExportExcel={() => exportExcel(exportData, 'Profit Loss', 'profit-loss')}
          onExportPDF={() => exportPDF({
            filename: 'profit-loss',
            title: `${activeBusiness?.name || 'Business'} — Profit & Loss (${dateFrom} to ${dateTo})`,
            headers: [
              { key: 'Period', label: 'Period', align: 'left' },
              { key: 'Revenue', label: 'Revenue', align: 'right', mono: true },
              { key: 'COGS', label: 'COGS', align: 'right', mono: true },
              { key: 'Gross Profit', label: 'Gross Profit', align: 'right', mono: true, bold: true },
              { key: 'Margin %', label: 'Margin %', align: 'right' },
              { key: 'Orders', label: 'Orders', align: 'right' },
            ],
            rows: exportData,
            summary: [
              { label: 'Revenue', value: `${cur}${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#111827' },
              { label: 'COGS', value: `${cur}${totalCogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#dc2626' },
              { label: 'Gross Profit', value: `${cur}${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: totalProfit >= 0 ? '#059669' : '#dc2626' },
              { label: 'Margin', value: `${totalMargin}%`, color: Number(totalMargin) >= 0 ? '#059669' : '#dc2626' },
            ],
            currency: cur,
          })}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">{activeBusiness?.name} — Profit & Loss ({dateFrom} to {dateTo})</h1>
      </div>

      {/* Missing cost warning */}
      {missingCostCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2.5 mb-5 text-xs print:hidden">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{missingCostCount} products</strong> are missing purchase/cost prices. Profit calculations may be inaccurate.
            Set cost prices in Inventory → Custom Columns.
          </span>
        </div>
      )}

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-muted font-semibold uppercase mb-1">Revenue</p>
          <p className="text-xl font-bold text-text-primary">{cur}{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-muted font-semibold uppercase mb-1">COGS</p>
          <p className="text-xl font-bold text-red-600">{cur}{totalCogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-muted font-semibold uppercase mb-1">Gross Profit</p>
          <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {cur}{totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-muted font-semibold uppercase mb-1">Margin</p>
          <p className={`text-xl font-bold ${Number(totalMargin) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalMargin}%
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5 mb-6 print:hidden">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Revenue vs COGS</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={chartData.length > 20 ? 10 : 20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} width={50} />
              <Tooltip
                formatter={(v, name) => [`${cur}${Number(v).toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'COGS']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#27AE60" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cogs" name="COGS" fill="#C0392B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="text-left p-3 font-semibold text-text-muted text-xs">Period</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Revenue</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">COGS</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Gross Profit</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Margin %</th>
              <th className="text-right p-3 font-semibold text-text-muted text-xs">Orders</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted text-xs">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted text-xs">No data for this period</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.period} className={`border-b border-border/50 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                <td className="p-3 text-xs font-medium text-text-primary">{r.period}</td>
                <td className="p-3 text-right font-mono text-xs">{cur}{r.revenue?.toLocaleString()}</td>
                <td className="p-3 text-right font-mono text-xs text-red-600">{cur}{r.cogs?.toLocaleString()}</td>
                <td className={`p-3 text-right font-mono text-xs font-medium ${r.gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {cur}{r.gross_profit?.toLocaleString()}
                </td>
                <td className="p-3 text-right text-xs">{r.margin_pct}%</td>
                <td className="p-3 text-right text-xs">{r.demand_count}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="p-3 text-xs">Totals</td>
                <td className="p-3 text-right font-mono text-xs">{cur}{totalRevenue.toLocaleString()}</td>
                <td className="p-3 text-right font-mono text-xs text-red-600">{cur}{totalCogs.toLocaleString()}</td>
                <td className={`p-3 text-right font-mono text-xs ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {cur}{totalProfit.toLocaleString()}
                </td>
                <td className="p-3 text-right text-xs">{totalMargin}%</td>
                <td className="p-3 text-right text-xs">{rows.reduce((s, r) => s + r.demand_count, 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
