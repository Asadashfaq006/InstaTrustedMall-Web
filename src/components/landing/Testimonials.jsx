'use client';

import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Rajesh Sharma',
    role: 'Electronics Store Owner',
    location: 'Mumbai',
    quote: 'InstaMall transformed how I manage my shop. Stock tracking used to take hours — now it\'s automatic. The barcode scanner feature alone saved me 2 hours every day.',
    rating: 5,
    initial: 'R',
    color: 'bg-gradient-to-br from-indigo-500 to-violet-600',
  },
  {
    name: 'Priya Patel',
    role: 'Wholesale Distributor',
    location: 'Ahmedabad',
    quote: 'Managing 50+ buyers and their outstanding amounts was a nightmare. InstaMall\'s buyer directory and statement reports made it effortless. Best investment for my business.',
    rating: 5,
    initial: 'P',
    color: 'bg-gradient-to-br from-slate-700 to-slate-900',
  },
  {
    name: 'Mohammed Ali',
    role: 'Restaurant Manager',
    location: 'Hyderabad',
    quote: 'The multi-business feature is a game changer. I run 3 restaurants and can switch between them instantly. The thermal printing for bills works flawlessly.',
    rating: 5,
    initial: 'M',
    color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
  {
    name: 'Sneha Reddy',
    role: 'Fashion Boutique Owner',
    location: 'Bangalore',
    quote: 'I love how easy it is to create beautiful bills and manage my inventory. The label printing feature helps me organize my entire store. Highly recommend!',
    rating: 5,
    initial: 'S',
    color: 'bg-gradient-to-br from-amber-500 to-orange-600',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Testimonials</p>
          <h2 className="font-display text-3xl sm:text-4xl text-navy mb-4">
            Loved by businesses everywhere
          </h2>
          <p className="text-text-secondary text-lg">
            See what our users have to say about their experience with InstaMall.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-border p-8 bg-background hover:shadow-lg transition-shadow"
            >
              {/* Quote icon */}
              <Quote className="h-8 w-8 text-indigo-500/20 mb-4" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>

              {/* Quote text */}
              <p className="text-text-secondary leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {t.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.role} · {t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
