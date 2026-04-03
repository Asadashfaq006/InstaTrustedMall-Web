import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import ExportButton from '@/components/reports/ExportButton';

export default function BuyerOutstandingReport() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { activeBusiness } = useBusinessStore();
  const { exportCSV, exportExcel, exportPDF } = useReportStore();
  const cur = activeBusiness?.currency_symbol || '₹';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('outstanding');

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    const res = await window.electronAPI.reports.getBuyerOutstandingReport({
      businessId: activeBusiness.id, sortBy, search,
    });
    if (res.success) setData(res.data);
    setLoading(false);
  }, [activeBusiness, sortBy, search]);

  useEffect(() => { load(); }, [load]);

  const totalOutstanding = data.reduce((s, r) => s + r.outstanding, 0);
  const totalBilled = data.reduce((s, r) => s + r.total_billed, 0);
  const totalPaid = data.reduce((s, r) => s + r.total_paid, 0);

  const exportData = data.map(r => ({
    'Buyer Code': r.is_counter_sale ? (r.demand_code || 'Counter Sale') : (r.buyer_code || ''),
    Name: r.full_name, Business: r.business_name || '',
    Phone: r.phone || '', Type: r.is_counter_sale ? 'Counter Sale' : 'Buyer',
    'Total Billed': r.total_billed?.toFixed(2),
    'Total Paid': r.total_paid?.toFixed(2), Outstanding: r.outstanding?.toFixed(2),
    Orders: r.demands_count, 'Last Payment': r.last_payment_at || 'Never',
    'Days Since Payment': r.days_since_last_payment ?? 'N/A',
  }));

  return (
    <div className="p-6 max-w-[1400px] print:p-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-text-primary">Outstanding Report</h1>
          <p className="text-xs text-text-muted">
            {data.length} entries owe {cur}{totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <ExportButton
          onExportCSV={() => exportCSV(exportData, 'buyer-outstanding')}
          onExportExcel={() => exportExcel(exportData, 'Outstanding', 'buyer-outstanding')}
          onExportPDF={() => exportPDF({
            filename: 'buyer-outstanding',
            title: `${activeBusiness?.name || 'Business'} — Outstanding Report`,
            headers: [
              { key: 'Buyer Code', label: 'Code', align: 'left' },
              { key: 'Name', label: 'Name', align: 'left' },
              { key: 'Type', label: 'Type', align: 'center' },
              { key: 'Total Billed', label: 'Billed', align: 'right', mono: true },
              { key: 'Total Paid', label: 'Paid', align: 'right', mono: true },
              { key: 'Outstanding', label: 'Outstanding', align: 'right', mono: true, bold: true },
              { key: 'Orders', label: 'Orders', align: 'right' },
              { key: 'Days Since Payment', label: 'Days', align: 'right' },
            ],
            rows: exportData,
            summary: [
              { label: 'Total Billed', value: `${cur}${totalBilled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#111827' },
              { label: 'Total Paid', value: `${cur}${totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#059669' },
              { label: 'Outstanding', value: `${cur}${totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#ea580c' },
            ],
            currency: cur,
          })}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">{activeBusiness?.name} — Outstanding Report</h1>
        <p className="text-xs text-gray-500">{data.length} entries — Total: {cur}{totalOutstanding.toLocaleString()}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-text-muted font-semibold uppercase mb-1">Total Billed</p>
          <p className="text-lg font-bold text-text-primary">{cur}{totalBilled.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-text-muted font-semibold uppercase mb-1">Total Paid</p>
          <p className="text-lg font-bold text-emerald-600">{cur}{totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-text-muted font-semibold uppercase mb-1">Outstanding</p>
          <p className="text-lg font-bold text-orange-600">{cur}{totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 print:hidden">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input placeholder="Search buyers..." className="pl-9 h-9 text-sm"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {[
            { key: 'outstanding', label: 'By Amount' },
            { key: 'name', label: 'By Name' },
            { key: 'last_activity', label: 'By Last Payment' },
          ].map(s => (
            <Button key={s.key} size="sm" variant={sortBy === s.key ? 'default' : 'outline'}
              onClick={() => setSortBy(s.key)} className="text-xs">{s.label}</Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left p-3 font-semibold text-text-muted text-xs">Buyer</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Billed</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Paid</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Outstanding</th>
                <th className="text-right p-3 font-semibold text-text-muted text-xs">Orders</th>
                <th className="text-left p-3 font-semibold text-text-muted text-xs">Last Payment</th>
                <th className="text-center p-3 font-semibold text-text-muted text-xs">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-text-muted text-xs">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-text-muted text-xs">No outstanding balances</td></tr>
              ) : data.map((r, i) => (
                <tr key={r.buyer_id || `cs-${r.demand_id}`}
                  className={`border-b border-border/50 ${r.buyer_id ? 'cursor-pointer hover:bg-gray-50' : ''} ${i % 2 ? 'bg-gray-50/30' : ''}`}
                  onClick={() => r.buyer_id && navigate(`/reports/buyer-statement?buyerId=${r.buyer_id}`)}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-text-primary text-xs">{r.full_name}</div>
                      {r.is_counter_sale ? (
                        <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">Counter</span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {r.is_counter_sale ? (r.demand_code || '') : `${r.buyer_code || ''}${r.phone ? ` · ${r.phone}` : ''}`}
                    </div>
                  </td>
                  <td className="p-3 text-right text-xs">{cur}{r.total_billed?.toLocaleString()}</td>
                  <td className="p-3 text-right text-xs text-emerald-600">{cur}{r.total_paid?.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-xs font-semibold text-orange-600">
                    {cur}{r.outstanding?.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-xs">{r.demands_count}</td>
                  <td className="p-3 text-xs text-text-secondary">
                    {r.last_payment_at ? r.last_payment_at.split('T')[0] : 'Never'}
                  </td>
                  <td className="p-3 text-center">
                    {r.days_since_last_payment != null && r.days_since_last_payment > 30 ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">{r.days_since_last_payment}d</Badge>
                    ) : r.days_since_last_payment != null ? (
                      <span className="text-[10px] text-text-muted">{r.days_since_last_payment}d</span>
                    ) : (
                      <span className="text-[10px] text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="p-3 text-xs">Totals ({data.length} entries)</td>
                  <td className="p-3 text-right font-mono text-xs">{cur}{totalBilled.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-xs text-emerald-600">{cur}{totalPaid.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-xs font-bold text-orange-600">{cur}{totalOutstanding.toLocaleString()}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
