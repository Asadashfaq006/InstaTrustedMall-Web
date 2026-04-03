/**
 * Module 8: Security Settings Screen
 * Manage startup lock and auto-lock timer.
 */
import React, { useState, useEffect } from 'react';
import { Shield, Clock, Lock, KeyRound, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useAuthStore from '@/stores/authStore';

const AUTO_LOCK_OPTIONS = [
  { value: '0', label: 'Never' },
  { value: '1', label: '1 minute' },
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
];

export default function SecuritySettings() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { toast } = useToast();

  const [requirePin, setRequirePin] = useState(false);
  const [autoLock, setAutoLock] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);

  // Danger Zone
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetDatabase = async () => {
    setResetting(true);
    try {
      const res = await window.electronAPI.database.clean();
      if (res.success) {
        toast({ title: 'Database cleared. Restarting…' });
        // Short delay so the toast is visible, then reload
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast({ title: res.error || 'Failed to reset database', variant: 'destructive' });
        setResetting(false);
        setConfirmReset(false);
      }
    } catch (err) {
      toast({ title: err.message, variant: 'destructive' });
      setResetting(false);
      setConfirmReset(false);
    }
  };

  useEffect(() => {
    if (activeBusiness) loadSettings();
  }, [activeBusiness?.id]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.authSettings.get(activeBusiness.id);
      if (result.success) {
        setRequirePin(result.data.require_pin_on_startup === 1);
        setAutoLock(String(result.data.auto_lock_after_minutes || 0));
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await window.electronAPI.authSettings.update({
        businessId: activeBusiness.id,
        requirePinOnStartup: requirePin,
        autoLockAfterMinutes: parseInt(autoLock, 10),
      });
      if (result.success) {
        toast({ title: 'Saved', description: 'Security settings updated' });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <p className="text-text-muted text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-xl">
        {/* Header */}
        <h1 className="text-xl font-bold text-navy flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-accent" />
          Security Settings
        </h1>

        <div className="space-y-6">
          {/* Startup Lock */}
          <div className="flex items-start justify-between p-4 rounded-lg border bg-white">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-navy mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-navy">Require PIN on startup</h3>
                <p className="text-xs text-text-muted mt-1">
                  When enabled, users must enter their PIN every time the app starts.
                </p>
              </div>
            </div>
            <Switch checked={requirePin} onCheckedChange={setRequirePin} />
          </div>

          {/* Auto-lock */}
          <div className="flex items-start justify-between p-4 rounded-lg border bg-white">
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-navy mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-navy">Auto-lock after inactivity</h3>
                <p className="text-xs text-text-muted mt-1">
                  Automatically lock the app after a period of inactivity. Requires PIN to unlock.
                </p>
              </div>
            </div>
            <Select value={autoLock} onValueChange={setAutoLock}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTO_LOCK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Security Settings'}
          </Button>

          {/* Change PIN */}
          {currentUser && (
            <div className="p-4 rounded-lg border bg-white space-y-3 mt-2">
              <div className="flex gap-3">
                <KeyRound className="w-5 h-5 text-navy mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-navy">Change Your PIN</h3>
                  <p className="text-xs text-text-muted mt-1">
                    Update your login PIN. Must be 4-6 digits.
                  </p>
                </div>
              </div>
              <div className="space-y-2 max-w-[280px]">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Current PIN"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="New PIN (4-6 digits)"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Confirm New PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                />
                <Button
                  size="sm"
                  disabled={changingPin || !currentPin || newPin.length < 4 || newPin !== confirmPin}
                  onClick={async () => {
                    if (newPin !== confirmPin) {
                      toast({ title: 'PINs do not match', variant: 'destructive' });
                      return;
                    }
                    setChangingPin(true);
                    try {
                      const res = await window.electronAPI.auth.changePin({
                        userId: currentUser.id,
                        currentPin,
                        newPin,
                      });
                      if (res.success) {
                        toast({ title: 'PIN changed successfully' });
                        setCurrentPin('');
                        setNewPin('');
                        setConfirmPin('');
                      } else {
                        const msg = res.error === 'wrong_current_pin' ? 'Current PIN is incorrect' : (res.error || 'Failed');
                        toast({ title: msg, variant: 'destructive' });
                      }
                    } catch (err) {
                      toast({ title: err.message, variant: 'destructive' });
                    } finally {
                      setChangingPin(false);
                    }
                  }}
                  className="w-full"
                >
                  {changingPin ? 'Changing...' : 'Change PIN'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Danger Zone ─────────────────────────────── */}
        <div className="mt-8 p-4 rounded-lg border border-red-200 bg-red-50 space-y-3">
          <div className="flex gap-3 items-start">
            <Trash2 className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-red-700">Danger Zone — Reset All Data</h3>
              <p className="text-xs text-red-600 mt-1">
                Permanently deletes <strong>all</strong> businesses, products, buyers, demands, stock
                and settings. This cannot be undone. Take a backup first.
              </p>
            </div>
          </div>

          {!confirmReset ? (
            <Button
              variant="outline"
              size="sm"
              className="border-red-400 text-red-600 hover:bg-red-100 w-full"
              onClick={() => setConfirmReset(true)}
            >
              Reset All Data…
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-700 text-center">
                Are you absolutely sure? This will wipe everything.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={resetting}
                  onClick={handleResetDatabase}
                >
                  {resetting ? 'Resetting…' : 'Yes, Delete Everything'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
