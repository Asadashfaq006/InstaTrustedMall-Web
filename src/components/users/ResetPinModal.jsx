/**
 * Module 8: Reset PIN Modal (Admin resets another user's PIN)
 */
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import UserAvatar from '@/components/auth/UserAvatar';

export default function ResetPinModal({ user, requestingUserId, onClose, onReset }) {
  const { toast } = useToast();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      toast({ title: 'Error', description: 'PIN must be 4-6 digits', variant: 'destructive' });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: 'Error', description: 'PINs do not match', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.auth.resetPin({
        targetUserId: user.id,
        newPin,
        requestingUserId,
      });
      if (result.success) {
        toast({ title: 'PIN Reset', description: `PIN has been reset for ${user.display_name}` });
        onReset?.();
        onClose();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset PIN</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <UserAvatar displayName={user.display_name} avatarColor={user.avatar_color} size="md" />
          <div>
            <p className="font-medium text-sm">{user.display_name}</p>
            <p className="text-xs text-text-muted">@{user.username}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-navy mb-1 block">New PIN (4-6 digits)</label>
            <Input
              type="password"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-navy mb-1 block">Confirm PIN</label>
            <Input
              type="password"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReset} disabled={saving}>
            {saving ? 'Resetting...' : 'Reset PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
