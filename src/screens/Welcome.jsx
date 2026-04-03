import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BusinessModal from '@/components/BusinessModal';

export default function Welcome() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'radial-gradient(circle at center, #eef2ff 0%, #F8FAFC 70%)',
      }}
    >
      <div className="flex flex-col items-center gap-8 px-4">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-display text-5xl tracking-tight">
            <span className="text-indigo-600 font-bold">Insta</span>
            <span className="text-slate-900 font-bold">Mall</span>
          </h1>
          <p className="mt-2 text-text-secondary text-base">
            Your complete offline business manager
          </p>
        </div>

        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-lg max-w-[480px] w-full p-10">

          <div className="text-center">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Welcome! Let's set up your first business profile to get started.
            </h2>
            <p className="text-text-secondary text-sm mb-8">
              InstaMall will help you manage inventory, track buyers, and create bills — all offline.
            </p>
            <Button
              size="lg"
              className="w-full h-12 text-base font-semibold transition-transform hover:scale-[1.01]"
              onClick={() => setShowModal(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create My First Business
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-text-muted text-xs">
          Version 1.0.0 &nbsp;·&nbsp; 100% Offline &nbsp;·&nbsp; InstaMall
        </p>
      </div>

      {/* Create Business Modal */}
      <BusinessModal
        open={showModal}
        onOpenChange={setShowModal}
        mode="create"
      />
    </div>
  );
}
