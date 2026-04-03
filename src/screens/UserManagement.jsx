/**
 * Module 8: User Management Screen (Admin only)
 * Lists all users with CRUD operations.
 */
import React, { useState, useEffect } from 'react';
import {
  UserPlus, Shield, MoreHorizontal, ToggleLeft, ToggleRight,
  Trash2, KeyRound, Edit2, UserX, UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useAuthStore from '@/stores/authStore';
import UserAvatar from '@/components/auth/UserAvatar';
import UserModal from '@/components/users/UserModal';
import ResetPinModal from '@/components/users/ResetPinModal';
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles';
import { cn } from '@/lib/utils';

export default function UserManagement() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetPinUser, setResetPinUser] = useState(null);

  useEffect(() => {
    if (activeBusiness) loadUsers();
  }, [activeBusiness?.id]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.users.getAll(activeBusiness.id);
      if (result.success) setUsers(result.data);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (user) => {
    const result = await window.electronAPI.users.deactivate({
      userId: user.id,
      requestingUserId: currentUser.id,
    });
    if (result.success) {
      toast({ title: 'Deactivated', description: `${user.display_name} has been deactivated` });
      loadUsers();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleReactivate = async (user) => {
    const result = await window.electronAPI.users.reactivate(user.id);
    if (result.success) {
      toast({ title: 'Reactivated', description: `${user.display_name} has been reactivated` });
      loadUsers();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete "${user.display_name}" permanently? This cannot be undone.`)) return;
    const result = await window.electronAPI.users.deleteUser({
      userId: user.id,
      requestingUserId: currentUser.id,
    });
    if (result.success) {
      toast({ title: 'Deleted', description: `${user.display_name} has been deleted` });
      loadUsers();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleOpenResetPin = (user) => {
    setResetPinUser(user);
    setShowResetPinModal(true);
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-navy flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent" />
            User Management
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {users.length} user{users.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <UserPlus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* User list */}
      {loading ? (
        <p className="text-text-muted text-sm">Loading users...</p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const isSelf = user.id === currentUser?.id;
            const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.viewer;

            return (
              <div
                key={user.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-lg border bg-white transition-colors',
                  !user.is_active && 'opacity-50 bg-gray-50',
                  isSelf && 'ring-1 ring-accent/20'
                )}
              >
                <UserAvatar
                  displayName={user.display_name}
                  avatarColor={user.avatar_color}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-navy truncate">
                      {user.display_name}
                    </span>
                    {isSelf && (
                      <Badge variant="outline" className="text-[10px] py-0">You</Badge>
                    )}
                    {user.is_default === 1 && (
                      <Badge variant="outline" className="text-[10px] py-0 border-amber-300 text-amber-600">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">@{user.username}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                      roleColor.bg, roleColor.text
                    )}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  {!user.is_active ? (
                    <Badge variant="outline" className="border-red-200 text-red-500 text-[10px]">Inactive</Badge>
                  ) : (
                    user.last_login_at && (
                      <span>Last login: {new Date(user.last_login_at).toLocaleDateString()}</span>
                    )
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                      <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenResetPin(user)}>
                      <KeyRound className="w-4 h-4 mr-2" /> Reset PIN
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.is_active ? (
                      <DropdownMenuItem
                        onClick={() => handleDeactivate(user)}
                        disabled={isSelf || user.is_default === 1}
                        className="text-amber-600"
                      >
                        <ToggleLeft className="w-4 h-4 mr-2" /> Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleReactivate(user)} className="text-green-600">
                        <ToggleRight className="w-4 h-4 mr-2" /> Reactivate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(user)}
                      disabled={isSelf || user.is_default === 1}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* User Create/Edit Modal */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          businessId={activeBusiness?.id}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
          onSaved={loadUsers}
        />
      )}

      {/* Reset PIN Modal */}
      {showResetPinModal && resetPinUser && (
        <ResetPinModal
          user={resetPinUser}
          requestingUserId={currentUser?.id}
          onClose={() => { setShowResetPinModal(false); setResetPinUser(null); }}
          onReset={loadUsers}
        />
      )}
    </div>
  );
}
