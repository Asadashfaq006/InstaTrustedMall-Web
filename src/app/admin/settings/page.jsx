'use client';

import { useState } from 'react';
import usePlatformAuthStore from '@/stores/platformAuthStore';
import { Settings, Save, Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const { user } = usePlatformAuthStore();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account details</p>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
          <input
            type="text"
            defaultValue={user?.displayName || user?.display_name || ''}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            defaultValue={user?.email || ''}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input
            type="tel"
            defaultValue={user?.phone || ''}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
          />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Account settings editing will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
