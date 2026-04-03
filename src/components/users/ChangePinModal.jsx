/**
 * Module 8: Change PIN Modal (User changes their own PIN)
 */
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export default function ChangePinModal({ userId, onClose }) {
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (!currentPin) {
      toast({ title: 'Error', description: 'Enter your current PIN', variant: 'destructive' });
      return;
    }
    if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      toast({ title: 'Error', description: 'New PIN must be 4-6 digits', variant: 'destructive' });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: 'Error', description: 'PINs do not match', variant: 'destructive' });
      return;
    }
    if (currentPin === newPin) {
      toast({ title: 'Error', description: 'New PIN must be different', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.auth.changePin({
        userId,
        currentPin,
        newPin,
      });
      if (result.success) {
        toast({ title: 'PIN Changed', description: 'Your PIN has been updated successfully' });
        onClose();
      } else {
        const msg = result.error === 'wrong_current_pin' ? 'Current PIN is incorrect' : result.error;
        toast({ title: 'Error', description: msg, variant: 'destructive' });
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
          <DialogTitle>Change Your PIN</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-sm font-medium text-navy mb-1 block">Current PIN</label>
            <Input
              type="password"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              autoFocus
            />
          </div>
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
            <label className="text-sm font-medium text-navy mb-1 block">Confirm New PIN</label>
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
          <Button onClick={handleChange} disabled={saving}>
            {saving ? 'Saving...' : 'Change PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
