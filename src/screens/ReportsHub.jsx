import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, AlertTriangle, TrendingUp, Award, Columns,
  DollarSign, PieChart, Users, FileText, ClipboardList,
} from 'lucide-react';

const REPORT_SECTIONS = [
  {
    title: 'Inventory Reports',
    reports: [
      {
        name: 'Stock Status',
        description: 'Current stock levels, values, and movement overview for all products',
        icon: Package,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        path: '/reports/stock-status',
      },
      {
        name: 'Low Stock Alert',
        description: 'Products that are below reorder levels or out of stock',
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        path: '/reports/low-stock',
      },
      {
        name: 'Top Products',
        description: 'Best-selling products by quantity sold or revenue generated',
        icon: Award,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        path: '/reports/top-products',
      },
    ],
  },
  {
    title: 'Sales & Financial Reports',
    reports: [
      {
        name: 'Sales Summary',
        description: 'Revenue breakdown by day, week, or month with trend analysis',
        icon: TrendingUp,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        path: '/reports/sales-summary',
      },
      {
        name: 'Profit & Loss',
        description: 'Revenue vs cost analysis with gross margin calculations',
        icon: PieChart,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        path: '/reports/profit-loss',
      },
      {
        name: 'Outstanding',
        description: 'Unpaid balances from buyers and counter sales',
        icon: Users,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        path: '/reports/buyer-outstanding',
      },
      {
        name: 'Buyer Statement',
        description: 'Detailed transaction history and balance for a specific buyer',
        icon: FileText,
        color: 'text-teal-600',
        bgColor: 'bg-teal-50',
        path: '/reports/buyer-statement',
      },
      {
        name: 'Demand History',
        description: 'Complete history of all demands/bills with filters and search',
        icon: ClipboardList,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        path: '/reports/demand-history',
      },
    ],
  },
];

export default function ReportsHub() {
  const router = useRouter();
  const navigate = (path) => router.push(path);

  return (
    <div className="p-6 max-w-[1200px]">
      <h1 className="font-display text-2xl text-text-primary mb-1">Reports & Analytics</h1>
      <p className="text-text-secondary text-sm mb-8">
        Select a report to view detailed insights about your business
      </p>

      {REPORT_SECTIONS.map((section) => (
        <div key={section.title} className="mb-8">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.reports.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.path}
                  onClick={() => navigate(report.path)}
                  className="bg-white rounded-xl border border-border p-5 text-left hover:shadow-md hover:border-accent/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg ${report.bgColor} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 ${report.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary mb-1">
                        {report.name}
                      </h3>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
