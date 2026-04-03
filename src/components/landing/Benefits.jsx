'use client';

import { CheckCircle2, Zap, Globe, Shield } from 'lucide-react';

const benefits = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built for speed. Load thousands of products, process sales, and generate reports in milliseconds.',
    stats: '< 100ms',
    statsLabel: 'Avg response time',
  },
  {
    icon: Globe,
    title: 'Works Everywhere',
    description: 'Run on any device with a browser. No app installs needed. Your data, accessible from any computer.',
    stats: '100%',
    statsLabel: 'Browser-based',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data stays on your server. PIN-based auth, role permissions, and full audit trail for every action.',
    stats: '256-bit',
    statsLabel: 'Encryption ready',
  },
];

const highlights = [
  'No monthly fees or hidden charges',
  'Unlimited products and buyers',
  'Multi-business support included',
  'Full data export (CSV, Excel, PDF)',
  'Works offline — no internet needed',
  'Regular updates with new features',
];

export default function Benefits() {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Benefits cards */}
          <div className="space-y-6">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Why InstaMall</p>
            <h2 className="font-display text-3xl sm:text-4xl text-navy">
              Built for businesses that move fast
            </h2>
            <p className="text-text-secondary text-lg max-w-lg">
              Whether you run a retail store, wholesale business, or restaurant — InstaMall adapts to your workflow.
            </p>

            <div className="space-y-4 pt-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex gap-4 rounded-xl bg-white p-5 border border-border shadow-sm"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary mb-1">{benefit.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{benefit.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-lg font-bold text-indigo-600">{benefit.stats}</p>
                    <p className="text-[10px] text-text-muted">{benefit.statsLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Highlights checklist */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 text-white">
            <h3 className="font-display text-2xl mb-2">What&apos;s included</h3>
            <p className="text-white/60 mb-8">Everything you need, nothing you don&apos;t.</p>
            <div className="space-y-4">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                  <span className="text-white/90">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-8 border-t border-white/10">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl hover:shadow-indigo-500/30"
              >
                View Pricing Plans
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
