'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Do I need an internet connection to use InstaMall?',
    answer: 'InstaMall works entirely on your local network. Your data stays on your server and is accessible from any device on the same network. No cloud dependency.',
  },
  {
    question: 'Can I manage multiple businesses?',
    answer: 'Yes! InstaMall supports unlimited business profiles. Each business has its own products, buyers, bills, and reports. Switch between them instantly from the sidebar.',
  },
  {
    question: 'How does the PIN-based login work?',
    answer: 'Each user gets a short PIN (4-6 digits) for fast login. No passwords to remember. Roles (Admin, Manager, Cashier) control what each user can access. The app auto-locks after inactivity.',
  },
  {
    question: 'Can I use barcode scanners?',
    answer: 'Absolutely. InstaMall supports USB and Bluetooth hardware scanners, plus camera-based scanning. Scan to search products, add to bills, or manage stock — all configurable.',
  },
  {
    question: 'What reports are available?',
    answer: 'Sales summaries, profit/loss analysis, stock status, low-stock alerts, top products, buyer outstanding balances, buyer statements, and demand history. All exportable to CSV, Excel, or PDF.',
  },
  {
    question: 'Can I print bills and labels?',
    answer: 'Yes. InstaMall supports thermal receipt printers (58mm/80mm) for bills and standard printers for labels. Design custom label templates with barcode/QR codes.',
  },
  {
    question: 'Is my data safe?',
    answer: 'Your data never leaves your server. InstaMall includes full audit logging of every action, automatic backups, and role-based access control to prevent unauthorized changes.',
  },
  {
    question: 'How do I get started?',
    answer: 'Click "Start Free Trial" above, create your first business profile, and start adding products. The entire setup takes less than 2 minutes. No credit card required.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="py-20 lg:py-28 bg-background">
      <div className="mx-auto max-w-3xl px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="font-display text-3xl sm:text-4xl text-navy mb-4">
            Frequently asked questions
          </h2>
          <p className="text-text-secondary text-lg">
            Everything you need to know about InstaMall.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-white overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex items-center justify-between w-full px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-text-primary pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-text-muted flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
