import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import DateRangePicker from '@/components/reports/DateRangePicker';
import ExportButton from '@/components/reports/ExportButton';

const STATUS_COLORS = {
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function DemandHistoryReport() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { activeBusiness } = useBusinessStore();
  const { dateFrom, dateTo, setDateRange, exportCSV, exportExcel, exportPDF } = useReportStore();
  const cur = activeBusiness?.currency_symbol || '₹';

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Summary stats
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);

    const [histRes, sumRes] = await Promise.all([
      window.electronAPI.reports.getDemandHistoryReport({
        businessId: activeBusiness.id, status: status || undefined,
        dateFrom, dateTo, limit: pageSize, offset: (page - 1) * pageSize,
      }),
      window.electronAPI.reports.getDemandSummary({
        businessId: activeBusiness.id, dateFrom, dateTo,
      }),
    ]);

    if (histRes.success) { setData(histRes.data.rows || []); setTotal(histRes.data.total || 0); }
    if (sumRes.success) setSummary(sumRes.data);
    setLoading(false);
  }, [activeBusiness, status, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, dateFrom, dateTo]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const exportData = data.map(r => ({
    'Bill Code': r.demand_code, Status: r.status, Buyer: r.buyer_name,
    'Buyer Code': r.buyer_code, Items: r.items_count,
    Total: r.grand_total?.toFixed(2), Paid: r.amount_paid?.toFixed(2),
    Due: r.balance_due?.toFixed(2), Date: r.confirmed_at?.split('T')[0] || r.created_at?.split('T')[0],
    Notes: r.notes || '',
  }));

  return (
    <div className="p-6 max-w-[1400px] print:p-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-text-primary">Demand History</h1>
          <p className="text-xs text-text-muted">{total} demands found</p>
        </div>
        <ExportButton
          onExportCSV={() => exportCSV(exportData, 'demand-history')}
          onExportExcel={() => exportExcel(exportData, 'Demand History', 'demand-history')}
          onExportPDF={() => exportPDF({
            filename: 'demand-history',
            title: `${activeBusiness?.name || 'Business'} — Demand History (${dateFrom} to ${dateTo})`,
            headers: [
              { key: 'Bill Code', label: 'Bill #', align: 'left', mono: true },
              { key: 'Buyer', label: 'Buyer', align: 'left' },
              { key: 'Status', label: 'Status', align: 'center' },
              { key: 'Items', label: 'Items', align: 'right' },
              { key: 'Total', label: 'Total', align: 'right', mono: true, bold: true },
              { key: 'Paid', label: 'Paid', align: 'right', mono: true },
              { key: 'Due', label: 'Due', align: 'right', mono: true },
              { key: 'Date', label: 'Date', align: 'left' },
            ],
            rows: exportData,
            summary: summary ? [
              { label: 'Total Demands', value: String(summary.total_demands || 0), color: '#111827' },
              { label: 'Total Value', value: `${cur}${(summary.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#111827' },
              { label: 'Collected', value: `${cur}${(summary.total_collected || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#059669' },
              { label: 'Outstanding', value: `${cur}${(summary.total_outstanding || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#ea580c' },
            ] : [],
            currency: cur,
          })}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">{activeBusiness?.name} — Demand History ({dateFrom} to {dateTo})</h1>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted font-semibold uppercase mb-1">Total Demands</p>
            <p className="text-lg font-bold text-text-primary">{summary.total_demands}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted font-semibold uppercase mb-1">Total Value</p>
            <p className="text-lg font-bold text-text-primary">{cur}{summary.total_value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted font-semibold uppercase mb-1">Collected</p>
            <p className="text-lg font-bold text-emerald-600">{cur}{summary.total_collected?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted font-semibold uppercase mb-1">Outstanding</p>
            <p className="text-lg font-bold text-orange-600">{cur}{summary.total_outstanding?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4 print:hidden">
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={setDateRange} />
        <div className="flex gap-1">
          {[
            { key: '', label: 'All' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'paid', label: 'Paid' },
            { key: 'partial', label: 'Partial' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map(s => (
            <Button key={s.key} size="sm" variant={status === s.key ? 'default' : 'outline'}
              onClick={() => setStatus(s.key)} className="text-xs">{s.label}</Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left p-3 font-semibold text-text-muted text-xs">Bill #</th>
                <th className="text-left p-3 font-semibold text-text-muted text-xs">Buyer</th>
                <th className="text-center p-3 font-semibold text-text-muted text-xs">Status</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Items</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Total</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Paid</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Due</th>
                <th className="text-left p-3 font-semibold text-text-muted text-xs">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-text-muted text-xs">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-text-muted text-xs">No demands found</td></tr>
              ) : data.map((r, i) => (
                <tr key={r.id} className={`border-b border-border/50 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                  <td className="p-3 text-xs font-mono font-medium text-text-primary">{r.demand_code}</td>
                  <td className="p-3">
                    <div className="text-xs text-text-primary">{r.buyer_name}</div>
                    <div className="text-[10px] text-text-muted">{r.buyer_code}</div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge className={`text-[10px] capitalize ${STATUS_COLORS[r.status] || STATUS_COLORS.draft}`}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right text-xs">{r.items_count}</td>
                  <td className="p-3 text-right font-mono text-xs font-medium">{cur}{r.grand_total?.toLocaleString()}</td>
                  <td className="p-3 text-right text-xs text-emerald-600">{cur}{r.amount_paid?.toLocaleString()}</td>
                  <td className={`p-3 text-right text-xs ${r.balance_due > 0 ? 'text-orange-600 font-medium' : ''}`}>
                    {r.balance_due > 0 ? `${cur}${r.balance_due.toLocaleString()}` : '—'}
                  </td>
                  <td className="p-3 text-xs text-text-secondary">
                    {(r.confirmed_at || r.created_at)?.split('T')[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2 print:hidden">
            <p className="text-xs text-text-muted">
              Page {page} of {totalPages} ({total} results)
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8"
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8"
                disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
