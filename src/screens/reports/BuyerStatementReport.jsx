import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import useBusinessStore from '@/stores/businessStore';
import useReportStore from '@/stores/reportStore';
import DateRangePicker from '@/components/reports/DateRangePicker';
import ExportButton from '@/components/reports/ExportButton';

export default function BuyerStatementReport() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const searchParams = useSearchParams();
  const preSelectedBuyerId = searchParams.get('buyerId');
  const { activeBusiness } = useBusinessStore();
  const { dateFrom, dateTo, setDateRange, exportCSV, exportExcel, exportPDF } = useReportStore();
  const cur = activeBusiness?.currency_symbol || '₹';

  const [buyerList, setBuyerList] = useState([]);
  const [buyerId, setBuyerId] = useState(preSelectedBuyerId || '');
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load buyer list
  useEffect(() => {
    if (!activeBusiness) return;
    (async () => {
      const res = await window.electronAPI.buyers.getAll(activeBusiness.id);
      if (res.success) setBuyerList(res.data || []);
    })();
  }, [activeBusiness]);

  const load = useCallback(async () => {
    if (!buyerId) return;
    setLoading(true);
    const res = await window.electronAPI.reports.getBuyerStatement({
      buyerId: Number(buyerId), dateFrom, dateTo,
    });
    if (res.success) setStatement(res.data);
    setLoading(false);
  }, [buyerId, dateFrom, dateTo]);

  useEffect(() => { if (buyerId) load(); }, [load, buyerId]);

  const buyer = statement?.buyer;
  const entries = statement?.entries || [];

  const exportData = entries.map(e => ({
    Date: e.event_date?.split('T')[0] || '', Type: e.type, Reference: e.ref_code,
    Debit: e.debit?.toFixed(2), Credit: e.credit?.toFixed(2),
    Balance: e.running_balance?.toFixed(2), Notes: e.notes || '',
  }));

  return (
    <div className="p-6 max-w-[1200px] print:p-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-text-primary">Buyer Statement</h1>
          <p className="text-xs text-text-muted">
            {buyer ? `${buyer.full_name} (${buyer.buyer_code})` : 'Select a buyer'}
          </p>
        </div>
        {statement && (
          <ExportButton
            onExportCSV={() => exportCSV(exportData, `statement-${buyer?.buyer_code}`)}
            onExportExcel={() => exportExcel(exportData, 'Statement', `statement-${buyer?.buyer_code}`)}
            onExportPDF={() => exportPDF({
              filename: `statement-${buyer?.buyer_code}`,
              title: `${activeBusiness?.name || 'Business'} — Statement: ${buyer?.full_name} (${buyer?.buyer_code}) — ${dateFrom} to ${dateTo}`,
              headers: [
                { key: 'Date', label: 'Date', align: 'left' },
                { key: 'Type', label: 'Type', align: 'center' },
                { key: 'Reference', label: 'Reference', align: 'left', mono: true },
                { key: 'Debit', label: 'Debit', align: 'right', mono: true },
                { key: 'Credit', label: 'Credit', align: 'right', mono: true },
                { key: 'Balance', label: 'Balance', align: 'right', mono: true, bold: true },
                { key: 'Notes', label: 'Notes', align: 'left' },
              ],
              rows: exportData,
              summary: [
                { label: 'Opening', value: `${cur}${statement.openingBalance?.toLocaleString()}`, color: '#111827' },
                { label: 'Total Debits', value: `${cur}${statement.totalDebits?.toLocaleString()}`, color: '#dc2626' },
                { label: 'Total Credits', value: `${cur}${statement.totalCredits?.toLocaleString()}`, color: '#059669' },
                { label: 'Closing', value: `${cur}${statement.closingBalance?.toLocaleString()}`, color: statement.closingBalance > 0 ? '#ea580c' : '#059669' },
              ],
              currency: cur,
            })}
          />
        )}
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold">{activeBusiness?.name}</h1>
        <h2 className="text-base font-semibold">Statement: {buyer?.full_name} ({buyer?.buyer_code})</h2>
        <p className="text-xs text-gray-500">{dateFrom} to {dateTo}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6 print:hidden">
        <div>
          <label className="text-xs font-semibold text-text-muted mb-1 block">Buyer</label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[220px]"
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
          >
            <option value="">Select buyer...</option>
            {buyerList.map(b => (
              <option key={b.id} value={b.id}>{b.full_name} ({b.buyer_code})</option>
            ))}
          </select>
        </div>
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={setDateRange} />
      </div>

      {!buyerId && (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <FileText className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">Select a buyer to view their statement</p>
        </div>
      )}

      {loading && <p className="text-sm text-text-muted text-center py-8">Loading statement...</p>}

      {statement && !loading && (
        <>
          {/* Balance summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-text-muted font-semibold uppercase mb-1">Opening Balance</p>
              <p className="text-lg font-bold text-text-primary">{cur}{statement.openingBalance?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-text-muted font-semibold uppercase mb-1">Total Debits</p>
              <p className="text-lg font-bold text-red-600">{cur}{statement.totalDebits?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-text-muted font-semibold uppercase mb-1">Total Credits</p>
              <p className="text-lg font-bold text-emerald-600">{cur}{statement.totalCredits?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-text-muted font-semibold uppercase mb-1">Closing Balance</p>
              <p className={`text-lg font-bold ${statement.closingBalance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {cur}{statement.closingBalance?.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Statement table */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left p-3 font-semibold text-text-muted text-xs">Date</th>
                  <th className="text-left p-3 font-semibold text-text-muted text-xs">Type</th>
                  <th className="text-left p-3 font-semibold text-text-muted text-xs">Reference</th>
                  <th className="text-right p-3 font-semibold text-text-muted text-xs">Debit</th>
                  <th className="text-right p-3 font-semibold text-text-muted text-xs">Credit</th>
                  <th className="text-right p-3 font-semibold text-text-muted text-xs">Balance</th>
                  <th className="text-left p-3 font-semibold text-text-muted text-xs">Notes</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening balance row */}
                <tr className="border-b border-border/50 bg-blue-50/30">
                  <td className="p-3 text-xs text-text-muted" colSpan={5}>Opening Balance</td>
                  <td className="p-3 text-right font-mono text-xs font-semibold">{cur}{statement.openingBalance?.toLocaleString()}</td>
                  <td></td>
                </tr>

                {entries.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-text-muted text-xs">No transactions in this period</td></tr>
                ) : entries.map((e, i) => (
                  <tr key={i} className={`border-b border-border/50 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                    <td className="p-3 text-xs text-text-primary">{e.event_date?.split('T')[0]}</td>
                    <td className="p-3 text-xs">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        e.type === 'demand' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {e.type === 'demand' ? 'Bill' : 'Payment'}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono text-text-secondary">{e.ref_code}</td>
                    <td className="p-3 text-right font-mono text-xs text-red-600">
                      {e.debit > 0 ? `${cur}${e.debit.toLocaleString()}` : ''}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-emerald-600">
                      {e.credit > 0 ? `${cur}${e.credit.toLocaleString()}` : ''}
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-medium">
                      {cur}{e.running_balance?.toLocaleString()}
                    </td>
                    <td className="p-3 text-xs text-text-muted truncate max-w-[150px]">{e.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="p-3 text-xs">Closing Balance</td>
                  <td className="p-3 text-right font-mono text-xs text-red-600">
                    {cur}{statement.totalDebits?.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-emerald-600">
                    {cur}{statement.totalCredits?.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right font-mono text-xs font-bold ${statement.closingBalance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {cur}{statement.closingBalance?.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
