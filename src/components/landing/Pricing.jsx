'use client';

import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for small shops getting started',
    features: [
      '1 business profile',
      'Up to 500 products',
      'Basic stock tracking',
      'Buyer management',
      'Simple bill generation',
      'CSV export',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹999',
    period: '/month',
    description: 'For growing businesses that need more power',
    features: [
      'Up to 5 businesses',
      'Unlimited products',
      'Advanced stock control',
      'Full buyer directory',
      'Demand builder with PDF',
      'All reports & analytics',
      'Barcode scanner support',
      'Role-based user access',
      'Label printing',
      'Priority support',
    ],
    cta: 'Start 14-Day Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: '₹2,499',
    period: '/month',
    description: 'For large operations with multiple locations',
    features: [
      'Unlimited businesses',
      'Unlimited everything',
      'All Professional features',
      'Audit trail & logs',
      'Data backup & restore',
      'Custom themes',
      'Sidebar customization',
      'Keyboard shortcuts',
      'Thermal printer support',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="font-display text-3xl sm:text-4xl text-navy mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-text-secondary text-lg">
            Start free. Upgrade as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl shadow-indigo-500/20 scale-[1.02] ring-2 ring-indigo-500'
                  : 'bg-white border border-border hover:shadow-lg hover:border-indigo-100'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1 text-xs font-bold text-white shadow-lg shadow-indigo-500/25">
                    {plan.badge}
                  </span>
                </div>
              )}

              <h3
                className={`text-lg font-semibold mb-1 ${
                  plan.highlighted ? 'text-white' : 'text-text-primary'
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-sm mb-6 ${
                  plan.highlighted ? 'text-white/60' : 'text-text-muted'
                }`}
              >
                {plan.description}
              </p>

              <div className="mb-6">
                <span
                  className={`text-4xl font-bold ${
                    plan.highlighted ? 'text-white' : 'text-navy'
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ${
                    plan.highlighted ? 'text-white/50' : 'text-text-muted'
                  }`}
                >
                  {plan.period}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? 'text-indigo-400' : 'text-emerald-500'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.highlighted ? 'text-white/80' : 'text-text-secondary'
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl'
                    : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
