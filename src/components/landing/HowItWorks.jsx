'use client';

import { Building2, Package, Users, BarChart3 } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: Building2,
    title: 'Create Your Business',
    description: 'Set up your business profile in under a minute. Choose your business type, add your logo, and configure currency settings.',
  },
  {
    step: '02',
    icon: Package,
    title: 'Add Your Products',
    description: 'Import your product catalog or add items one by one. Set prices, track stock levels, and assign categories.',
  },
  {
    step: '03',
    icon: Users,
    title: 'Start Selling',
    description: 'Create bills, manage buyers, and process sales instantly. Scan barcodes for lightning-fast checkout.',
  },
  {
    step: '04',
    icon: BarChart3,
    title: 'Track & Grow',
    description: 'Monitor sales, analyze trends, and make data-driven decisions with real-time reports and analytics.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="font-display text-3xl sm:text-4xl text-navy mb-4">
            Up and running in minutes
          </h2>
          <p className="text-text-secondary text-lg">
            No complex setup. No training needed. Just create, add, and sell.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px bg-border" />
              )}

              <div className="text-center">
                {/* Step number + icon */}
                <div className="relative inline-flex mb-6">
                  <div className="h-20 w-20 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center">
                    <item.icon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-indigo-500/25">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
