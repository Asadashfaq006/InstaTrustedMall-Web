'use client';

import { ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/15 to-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-violet-500/10 to-indigo-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      </div>

      <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-6">
          Ready to streamline your business?
        </h2>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Join hundreds of businesses already using InstaMall to manage inventory,
          track sales, and grow faster. Set up in under 2 minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
          >
            Start Your Free Trial
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
          >
            Explore Features
          </a>
        </div>
        <p className="mt-6 text-sm text-white/40">
          No credit card required &middot; Free plan available &middot; Cancel anytime
        </p>
      </div>
    </section>
  );
}
