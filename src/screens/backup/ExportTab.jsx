import React, { useState } from 'react';
import {
  Download, Package, Users, ShoppingCart, FileSpreadsheet,
  CheckCircle2, AlertCircle, Filter, RefreshCw,
} from 'lucide-react';
import useBackupStore from '../../stores/backupStore';

export default function ExportTab({ businessId, currentUser }) {
  const { exportProducts, exportBuyers, exportDemands, saveExportFile } = useBackupStore();

  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [msg, setMsg] = useState(null);

  // Product filters
  const [productFilters, setProductFilters] = useState({ category: '', stockStatus: '', search: '' });
  // Buyer filters
  const [buyerFilters, setBuyerFilters] = useState({ status: '' });
  // Demand filters
  const [demandFilters, setDemandFilters] = useState({ status: '', dateFrom: '', dateTo: '' });

  const handleExport = async (type) => {
    setIsExporting(true);
    setMsg(null);
    try {
      let res;
      let defaultName;

      if (type === 'products') {
        res = await exportProducts({ businessId, filters: productFilters });
        defaultName = `InstaMall_Products_${new Date().toISOString().slice(0, 10)}`;
      } else if (type === 'buyers') {
        res = await exportBuyers({ businessId, filters: buyerFilters });
        defaultName = `InstaMall_Buyers_${new Date().toISOString().slice(0, 10)}`;
      } else {
        res = await exportDemands({ businessId, filters: demandFilters });
        defaultName = `InstaMall_Demands_${new Date().toISOString().slice(0, 10)}`;
      }

      if (!res.success) {
        setMsg({ type: 'error', text: res.error });
        return;
      }

      const rows = res.data;
      if (rows.length === 0) {
        setMsg({ type: 'error', text: 'No data to export with current filters' });
        return;
      }

      let content;
      if (exportFormat === 'csv') {
        // Build CSV string
        const headers = Object.keys(rows[0]);
        const csvLines = [headers.join(',')];
        for (const row of rows) {
          const vals = headers.map((h) => {
            const v = row[h] ?? '';
            const s = String(v);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
              return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
          });
          csvLines.push(vals.join(','));
        }
        content = csvLines.join('\n');
      } else {
        // For xlsx, we need to build the file in main process
        // Encode data as base64 JSON so main process can write it
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
        const buf = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        content = buf;
      }

      const saveRes = await saveExportFile({
        defaultName: `${defaultName}.${exportFormat}`,
        extension: exportFormat,
        content,
      });

      if (saveRes.success) {
        setMsg({ type: 'success', text: `Exported ${rows.length} rows to ${saveRes.filePath}` });
      } else if (!saveRes.cancelled) {
        setMsg({ type: 'error', text: saveRes.error || 'Export cancelled' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Format selector */}
      <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Export format:</span>
        <div className="flex gap-2">
          {[
            { value: 'csv', label: 'CSV', icon: FileSpreadsheet, color: 'text-green-600' },
            { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, color: 'text-blue-600' },
          ].map((fmt) => {
            const Icon = fmt.icon;
            return (
              <button
                key={fmt.value}
                onClick={() => setExportFormat(fmt.value)}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${
                  exportFormat === fmt.value
                    ? 'border-[#5B6EAE] bg-[#5B6EAE]/5 text-[#5B6EAE]'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${exportFormat === fmt.value ? 'text-[#5B6EAE]' : fmt.color}`} />
                {fmt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="truncate">{msg.text}</span>
        </div>
      )}

      {/* Export cards */}
      <div className="space-y-4">
        {/* Products */}
        <ExportCard
          title="Products"
          description="Export all products with their stock levels and custom column values"
          icon={Package}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          isExporting={isExporting}
          onExport={() => handleExport('products')}
        >
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Search name/SKU..."
              value={productFilters.search}
              onChange={(e) => setProductFilters((f) => ({ ...f, search: e.target.value }))}
              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#5B6EAE]/30 focus:border-[#5B6EAE]"
            />
            <select
              value={productFilters.stockStatus}
              onChange={(e) => setProductFilters((f) => ({ ...f, stockStatus: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
            >
              <option value="">All Stock</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </ExportCard>

        {/* Buyers */}
        <ExportCard
          title="Buyers"
          description="Export buyer directory with balances and demand counts"
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          isExporting={isExporting}
          onExport={() => handleExport('buyers')}
        >
          <div className="flex gap-2 mt-3">
            <select
              value={buyerFilters.status}
              onChange={(e) => setBuyerFilters((f) => ({ ...f, status: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
            >
              <option value="">All Buyers</option>
              <option value="outstanding">With Outstanding</option>
              <option value="paid">Fully Paid</option>
            </select>
          </div>
        </ExportCard>

        {/* Demands */}
        <ExportCard
          title="Demands"
          description="Export demand history with buyer info and payment status"
          icon={ShoppingCart}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          isExporting={isExporting}
          onExport={() => handleExport('demands')}
        >
          <div className="flex gap-2 mt-3">
            <select
              value={demandFilters.status}
              onChange={(e) => setDemandFilters((f) => ({ ...f, status: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              value={demandFilters.dateFrom}
              onChange={(e) => setDemandFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
              placeholder="From"
            />
            <input
              type="date"
              value={demandFilters.dateTo}
              onChange={(e) => setDemandFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
              placeholder="To"
            />
          </div>
        </ExportCard>
      </div>
    </div>
  );
}

function ExportCard({ title, description, icon: Icon, iconColor, iconBg, isExporting, onExport, children }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1E3A5F]">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5B6EAE] rounded-lg hover:bg-[#4A5D9D] disabled:opacity-60 transition-colors"
        >
          {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export
        </button>
      </div>
      {children}
    </div>
  );
}
