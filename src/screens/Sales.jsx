'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { ShoppingCart, Search, ChevronDown, ChevronUp, User, TrendingUp, DollarSign, Package } from 'lucide-react';
import useBusinessStore from '@/stores/businessStore';
import useSalesStore from '@/stores/salesStore';

export default function Sales() {
  const { activeBusiness } = useBusinessStore();
  const {
    sales, totalSales, summary, userBreakdown, topProducts,
    isLoading, searchQuery, startDate, endDate, selectedUserId,
    sortBy, page, pageSize,
    setSearchQuery, setDateRange, setSelectedUserId, setSortBy, setPage,
    loadAll, loadSales,
  } = useSalesStore();

  const cur = activeBusiness?.currency_symbol || '₨';
  const [expandedSale, setExpandedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const load = useCallback(() => {
    if (activeBusiness) loadAll(activeBusiness.id);
  }, [activeBusiness, startDate, endDate, selectedUserId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeBusiness) loadSales(activeBusiness.id);
  }, [activeBusiness, searchQuery, sortBy, page]);

  const toggleSaleItems = async (demandId) => {
    if (expandedSale === demandId) {
      setExpandedSale(null);
      return;
    }
    setLoadingItems(true);
    try {
      const res = await window.electronAPI.sales.getItems({ demandId });
      if (res.success) setSaleItems(res.data);
    } catch {}
    setExpandedSale(demandId);
    setLoadingItems(false);
  };

  const totalPages = Math.ceil(totalSales / pageSize);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-500">Product sales and transactions overview</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase">Total Sales</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{parseInt(summary.total_sales || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{cur}{parseFloat(summary.total_revenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Collected</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{cur}{parseFloat(summary.total_collected || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{cur}{parseFloat(summary.total_outstanding || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search sales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setDateRange(e.target.value, endDate)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setDateRange(startDate, e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
        >
          <option value="recent">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>
        {selectedUserId && (
          <button
            onClick={() => setSelectedUserId(null)}
            className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition"
          >
            Clear User Filter ×
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales Table */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Invoice</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Buyer</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Sold By</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Date</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Status</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading sales...</td></tr>
                ) : sales.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">No sales found</td></tr>
                ) : sales.map((s) => (
                  <React.Fragment key={s.id}>
                    <tr className="hover:bg-slate-50 transition cursor-pointer" onClick={() => toggleSaleItems(s.id)}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-slate-900">{s.serial_number || s.demand_code}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.buyer_full_name || s.buyer_name || 'Walk-in'}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                        {cur}{parseFloat(s.grand_total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {s.confirmed_by_name || s.created_by_name ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700">{s.confirmed_by_name || s.created_by_name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
                              {s.confirmed_by_role || s.created_by_role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Admin</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {s.confirmed_at ? new Date(s.confirmed_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.status === 'paid' || s.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          s.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {s.balance_due > 0 ? 'Partial' : 'Paid'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {expandedSale === s.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </td>
                    </tr>
                    {expandedSale === s.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-slate-50/70">
                          {loadingItems ? (
                            <p className="text-xs text-slate-400 py-2">Loading items...</p>
                          ) : (
                            <div className="space-y-1">
                              {saleItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="font-medium text-slate-700">{item.product_name}</span>
                                    {item.product_sku && <span className="text-slate-400">({item.product_sku})</span>}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-slate-500">{item.quantity} × {cur}{parseFloat(item.unit_price).toLocaleString()}</span>
                                    <span className="font-mono font-medium text-slate-900">{cur}{parseFloat(item.line_total).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <span className="text-xs text-slate-500">Page {page} of {totalPages} ({totalSales} total)</span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 rounded text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 rounded text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel - User breakdown + Top products */}
        <div className="space-y-5">
          {/* Sales by User */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-500" />
              Sales by User
            </h3>
            {userBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No user data yet</p>
            ) : userBreakdown.map((u, i) => (
              <button
                key={i}
                onClick={() => setSelectedUserId(u.user_id)}
                className={`w-full flex items-center justify-between py-2.5 px-2 rounded-lg text-left hover:bg-slate-50 transition ${selectedUserId === u.user_id ? 'bg-emerald-50' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{u.user_name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{u.user_role} · {u.sale_count} sales</p>
                </div>
                <span className="font-mono text-sm font-medium text-emerald-600">{cur}{parseFloat(u.total_revenue).toLocaleString()}</span>
              </button>
            ))}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" />
              Top Products
            </h3>
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No product data yet</p>
            ) : topProducts.slice(0, 10).map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 w-5">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{p.product_name}</p>
                    <p className="text-[10px] text-slate-400">{parseFloat(p.total_qty).toLocaleString()} sold · {p.sale_count} orders</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-medium text-slate-800">{cur}{parseFloat(p.total_revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
