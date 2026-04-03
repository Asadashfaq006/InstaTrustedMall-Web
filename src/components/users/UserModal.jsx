/**
 * Module 8: UserModal - Create or Edit a user
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ROLES, ROLE_LABELS, AVATAR_COLORS } from '@/constants/roles';
import { cn } from '@/lib/utils';

const MODULE_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Products' },
  { key: 'stock', label: 'Stock Control' },
  { key: 'buyers', label: 'Buyers' },
  { key: 'demands', label: 'Demands' },
  { key: 'audit', label: 'Audit & History' },
  { key: 'reports', label: 'Reports' },
  { key: 'labels', label: 'Label Generator' },
  { key: 'settings-scanner', label: 'Scanner' },
  { key: 'settings-company', label: 'Settings' },
];

export default function UserModal({ user, businessId, onClose, onSaved }) {
  const isEditing = !!user;
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [role, setRole] = useState(user?.role || ROLES.SALESPERSON);
  const [pin, setPin] = useState('');
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color || AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [moduleAccess, setModuleAccess] = useState({});

  // Load module access when editing
  useEffect(() => {
    if (!isEditing || !user?.id || !businessId) return;
    const load = async () => {
      try {
        const result = await window.electronAPI.users.getModuleAccess({ userId: user.id, businessId });
        if (result.success && result.data) {
          const map = {};
          result.data.forEach((m) => { map[m.module_key] = m.has_access === 1; });
          setModuleAccess(map);
        }
      } catch { /* ignore */ }
    };
    load();
  }, [isEditing, user?.id, businessId]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({ title: 'Error', description: 'Display name is required', variant: 'destructive' });
      return;
    }
    if (!isEditing && !username.trim()) {
      toast({ title: 'Error', description: 'Username is required', variant: 'destructive' });
      return;
    }
    if (!isEditing && (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin))) {
      toast({ title: 'Error', description: 'PIN must be 4-6 digits', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let result;
      if (isEditing) {
        result = await window.electronAPI.users.update({
          userId: user.id,
          displayName: displayName.trim(),
          role,
          avatarColor,
        });
      } else {
        result = await window.electronAPI.users.create({
          businessId,
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
          role,
          pin,
          avatarColor,
        });
      }

      if (result.success) {
        // Save module access settings
        const userId = isEditing ? user.id : result.data?.id;
        if (userId && Object.keys(moduleAccess).length > 0) {
          try {
            await window.electronAPI.users.updateModuleAccess({
              userId,
              businessId,
              modules: Object.entries(moduleAccess).map(([key, access]) => ({
                module_key: key,
                has_access: access ? 1 : 0,
              })),
            });
          } catch { /* ignore */ }
        }
        toast({ title: 'Saved', description: `User ${isEditing ? 'updated' : 'created'} successfully` });
        onSaved?.();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-2">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-t transition-colors',
              activeTab === 'general' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
            )}
          >General</button>
          <button
            onClick={() => setActiveTab('modules')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-t transition-colors',
              activeTab === 'modules' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
            )}
          >Module Access</button>
        </div>

        {activeTab === 'general' && (
        <div className="space-y-4 py-2">
          {/* Display Name */}
          <div>
            <label className="text-sm font-medium text-navy mb-1 block">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          {/* Username (only on create) */}
          {!isEditing && (
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="johndoe"
              />
              <p className="text-xs text-text-muted mt-1">Lowercase letters, numbers, underscores only</p>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="text-sm font-medium text-navy mb-1 block">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN (only on create) */}
          {!isEditing && (
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">PIN (4-6 digits)</label>
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
              />
            </div>
          )}

          {/* Avatar Color */}
          <div>
            <label className="text-sm font-medium text-navy mb-2 block">Avatar Color</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    avatarColor === color ? 'border-accent scale-110 ring-2 ring-accent/20' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'modules' && (
          <div className="py-2 space-y-3">
            <p className="text-xs text-text-muted">Control which modules this user can access. Unchecked modules will be hidden from their sidebar.</p>
            <div className="space-y-2">
              {MODULE_OPTIONS.map((mod) => (
                <label key={mod.key} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={moduleAccess[mod.key] !== false}
                    onChange={(e) => setModuleAccess((prev) => ({ ...prev, [mod.key]: e.target.checked }))}
                    className="rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-text-primary">{mod.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
