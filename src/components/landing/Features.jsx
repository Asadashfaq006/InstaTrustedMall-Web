'use client';

import {
  Package, Users, FileText, BarChart3, ShieldCheck, Scan,
  Tags, Warehouse, Receipt, TrendingUp, Settings, Keyboard
} from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Product Management',
    description: 'Add, edit, and organize products with custom columns, categories, and barcode support.',
    color: 'bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-600',
  },
  {
    icon: Warehouse,
    title: 'Stock Control',
    description: 'Track stock in/out with reasons, view movement history, and get low-stock alerts instantly.',
    color: 'bg-gradient-to-br from-slate-500/10 to-indigo-500/10 text-slate-700',
  },
  {
    icon: Users,
    title: 'Buyer Directory',
    description: 'Manage buyers, track outstanding balances, record payments, and view complete transaction history.',
    color: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600',
  },
  {
    icon: FileText,
    title: 'Demand Builder',
    description: 'Create professional bills with line items, discounts, and instant PDF generation or thermal printing.',
    color: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Sales summaries, profit/loss, stock status, top products, buyer statements — all exportable.',
    color: 'bg-gradient-to-br from-violet-500/10 to-purple-500/10 text-violet-600',
  },
  {
    icon: Scan,
    title: 'Barcode Scanner',
    description: 'Scan barcodes with USB/Bluetooth scanners or camera. Auto-add to bills with configurable shortcuts.',
    color: 'bg-gradient-to-br from-sky-500/10 to-blue-500/10 text-sky-600',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description: 'Create users with PIN login, assign roles (Admin, Manager, Cashier), and control module access.',
    color: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600',
  },
  {
    icon: Tags,
    title: 'Label Printing',
    description: 'Design and print barcode labels for your products. Customize layouts and batch print.',
    color: 'bg-gradient-to-br from-rose-500/10 to-pink-500/10 text-rose-600',
  },
  {
    icon: TrendingUp,
    title: 'Multi-Business',
    description: 'Manage multiple businesses from one dashboard. Switch instantly, each with its own data and theme.',
    color: 'bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-600',
  },
  {
    icon: Receipt,
    title: 'Thermal Printing',
    description: 'Print receipts directly to thermal printers. Clean bill layouts optimized for 80mm and 58mm rolls.',
    color: 'bg-gradient-to-br from-slate-500/10 to-indigo-500/10 text-slate-700',
  },
  {
    icon: Settings,
    title: 'Fully Customizable',
    description: 'Custom sidebar, business themes, column layouts, and data export/import for complete flexibility.',
    color: 'bg-gradient-to-br from-teal-500/10 to-cyan-500/10 text-teal-600',
  },
  {
    icon: Keyboard,
    title: 'Keyboard Shortcuts',
    description: 'Navigate lightning-fast with built-in shortcuts. Power users love the speed of keyboard-first workflows.',
    color: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Features</p>
          <h2 className="font-display text-3xl sm:text-4xl text-navy mb-4">
            Everything you need to run your business
          </h2>
          <p className="text-text-secondary text-lg">
            From inventory to invoicing, InstaMall handles it all — so you can focus on growing.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border p-6 transition-all hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.color} mb-4`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
