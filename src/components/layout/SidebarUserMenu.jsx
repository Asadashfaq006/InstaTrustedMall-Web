/**
 * Module 8: Sidebar User Menu
 * Shows current user avatar + popover with profile actions.
 */
import React, { useState } from 'react';
import { LogOut, KeyRound, Lock, ChevronUp, Users } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import useAuthStore from '@/stores/authStore';
import useBusinessStore from '@/stores/businessStore';
import usePlatformAuthStore from '@/stores/platformAuthStore';
import UserAvatar from '@/components/auth/UserAvatar';
import ChangePinModal from '@/components/users/ChangePinModal';
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles';
import { cn } from '@/lib/utils';

export default function SidebarUserMenu() {
  const { currentUser, logout, lock } = useAuthStore();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const platformUser = usePlatformAuthStore((s) => s.user);
  const platformAuth = usePlatformAuthStore((s) => s.isAuthenticated);
  const inventoryBusinessId = usePlatformAuthStore((s) => s.inventoryBusinessId);
  const [showChangePin, setShowChangePin] = useState(false);

  // Platform admin viewing a business inventory
  const isAdminViewing = platformAuth && platformUser?.role === 'admin' && !!inventoryBusinessId;

  if (!currentUser && !isAdminViewing) return null;

  // When the platform admin is viewing (no PIN user), show admin-specific UI
  if (isAdminViewing && !currentUser) {
    const adminName = platformUser.displayName || platformUser.display_name || 'Admin';
    return (
      <div className="flex items-center gap-3 w-full px-2 py-2 text-left">
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-indigo-300">{adminName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{adminName}</p>
          <p className="text-[10px] font-medium text-indigo-300/70">Admin</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const roleColor = ROLE_COLORS[currentUser.role] || ROLE_COLORS.viewer;

  const handleLogout = async () => {
    await logout(activeBusiness?.id);
  };

  const handleSwitchUser = async () => {
    await logout(activeBusiness?.id);
    // Logout already clears auth state; LoginScreen shows user selection
  };

  const handleLock = () => {
    lock();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
            <UserAvatar
              displayName={currentUser.display_name}
              avatarColor={currentUser.avatar_color}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.display_name}</p>
              <p className={cn(
                'text-[10px] font-medium',
                'text-white/50'
              )}>
                {ROLE_LABELS[currentUser.role]}
              </p>
            </div>
            <ChevronUp className="w-4 h-4 text-white/40" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-52">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{currentUser.display_name}</p>
            <p className="text-xs text-text-muted">@{currentUser.username}</p>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block',
              roleColor.bg, roleColor.text
            )}>
              {ROLE_LABELS[currentUser.role]}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowChangePin(true)}>
            <KeyRound className="w-4 h-4 mr-2" /> Change PIN
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLock}>
            <Lock className="w-4 h-4 mr-2" /> Lock App
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSwitchUser}>
            <Users className="w-4 h-4 mr-2" /> Switch User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600">
            <LogOut className="w-4 h-4 mr-2" /> Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showChangePin && (
        <ChangePinModal
          userId={currentUser.id}
          onClose={() => setShowChangePin(false)}
        />
      )}
    </>
  );
}
