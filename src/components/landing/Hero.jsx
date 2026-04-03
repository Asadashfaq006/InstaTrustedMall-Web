'use client';

import { ArrowRight, Play } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-background to-violet-50/50" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/15 to-violet-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-slate-900/5 to-indigo-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-4 py-1.5 mb-6 border border-indigo-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-indigo-600">
                Trusted by 500+ businesses
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-navy leading-[1.1] mb-6">
              Smart Inventory Management for{' '}
              <span className="text-accent">Every Business</span>
            </h1>

            <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-lg">
              Track stock, process sales, manage buyers, and generate beautiful bills — all from one
              simple dashboard. Works offline, syncs when you&apos;re ready.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-7 py-3.5 text-base font-semibold text-navy transition hover:border-navy/30 hover:bg-navy/5"
              >
                <Play className="h-4 w-4" />
                See How It Works
              </a>
            </div>

            {/* Social Proof */}
            <div className="mt-10 flex items-center gap-6 text-sm text-text-muted">
              <div className="flex -space-x-2">
                {['bg-gradient-to-br from-indigo-500 to-violet-600', 'bg-gradient-to-br from-slate-700 to-slate-900', 'bg-gradient-to-br from-emerald-500 to-teal-600', 'bg-gradient-to-br from-amber-500 to-orange-600'].map((color, i) => (
                  <div
                    key={i}
                    className={`h-8 w-8 rounded-full ${color} ring-2 ring-white flex items-center justify-center text-white text-xs font-bold`}
                  >
                    {['A', 'K', 'R', 'S'][i]}
                  </div>
                ))}
              </div>
              <div>
                <span className="font-semibold text-text-primary">4.9/5</span> from 200+ reviews
              </div>
            </div>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="relative">
            <div className="rounded-2xl bg-white shadow-2xl shadow-navy/10 border border-border overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-background border-b border-border">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-error/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-success/60" />
                </div>
                <div className="ml-4 flex-1 h-6 rounded bg-border/50 max-w-[200px]" />
              </div>
              {/* Dashboard mockup */}
              <div className="p-6 space-y-4 bg-background">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Today Sales', value: '₹24,580', color: 'text-accent' },
                    { label: 'Products', value: '1,247', color: 'text-navy' },
                    { label: 'Active Buyers', value: '89', color: 'text-success' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 border border-border">
                      <p className="text-xs text-text-muted">{stat.label}</p>
                      <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                {/* Chart placeholder */}
                <div className="bg-white rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-text-primary">Sales Overview</p>
                    <p className="text-xs text-text-muted">Last 7 days</p>
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-indigo-100 relative" style={{ height: `${h}%` }}>
                        <div className="absolute inset-x-0 bottom-0 rounded-t bg-gradient-to-t from-indigo-600 to-violet-500" style={{ height: `${h * 0.7}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Products table preview */}
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border">
                    <p className="text-sm font-semibold text-text-primary">Recent Products</p>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0">
                      <div className="h-8 w-8 rounded bg-accent/10 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-3 w-24 rounded bg-border/80" />
                      </div>
                      <div className="h-3 w-12 rounded bg-success/20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <div className="absolute -bottom-4 -left-4 rounded-xl bg-white shadow-lg border border-border p-3 hidden lg:flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <span className="text-white text-lg">+</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary">New Order #247</p>
                <p className="text-[10px] text-text-muted">₹12,450 — Just now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
