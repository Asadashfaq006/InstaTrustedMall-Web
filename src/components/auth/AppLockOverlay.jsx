/**
 * Module 8: App Lock Overlay
 * Shown when the app auto-locks or user manually locks.
 * User must re-enter their PIN to unlock.
 */
import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import PinPad from '@/components/auth/PinPad';
import UserAvatar from '@/components/auth/UserAvatar';

export default function AppLockOverlay() {
  const { currentUser, unlock } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;

  const handleSubmit = async (pin) => {
    setLoading(true);
    setError('');
    try {
      const result = await window.electronAPI.auth.verifyPin({
        userId: currentUser.id,
        pin,
      });
      if (result.success) {
        unlock();
      } else {
        setError('Wrong PIN. Try again.');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center">
      {/* Lock icon */}
      <div className="mb-6 p-4 rounded-full bg-white/10">
        <Lock className="w-8 h-8 text-indigo-400" />
      </div>

      {/* User info */}
      <UserAvatar
        displayName={currentUser.display_name}
        avatarColor={currentUser.avatar_color}
        size="xl"
        className="mb-3"
      />
      <h2 className="text-white text-xl font-semibold mb-1">{currentUser.display_name}</h2>
      <p className="text-white/50 text-sm mb-8">Enter PIN to unlock</p>

      {/* PIN Pad */}
      <PinPad
        pinLength={currentUser.pin_length || 4}
        onSubmit={handleSubmit}
        error={error}
        disabled={loading}
      />
    </div>
  );
}
