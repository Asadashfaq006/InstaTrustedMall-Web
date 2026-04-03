/**
 * Module 8: Login Screen
 * Full-screen auth overlay with PIN entry.
 * Flow: Select user → Enter PIN → Authenticated (auto-switches to user's business)
 *
 * Users are loaded from ALL active businesses. After login, the active business
 * is force-set to the user's business_id to prevent cross-business data leakage.
 */
import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import PinPad from '@/components/auth/PinPad';
import UserAvatar from '@/components/auth/UserAvatar';
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles';
import { cn } from '@/lib/utils';

export default function LoginScreen() {
  const { login } = useAuthStore();

  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Load all users from all active businesses on mount
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const bizResult = await window.electronAPI.businesses.getAll();
        if (bizResult.success) {
          const activeBusinesses = bizResult.data.filter(b => b.is_active);
          const allUsersArr = [];
          for (const biz of activeBusinesses) {
            const usersResult = await window.electronAPI.users.getAll(biz.id);
            if (usersResult.success) {
              const active = usersResult.data.filter(u => u.is_active && u.role !== 'admin');
              active.forEach(u => allUsersArr.push({ ...u, businessName: biz.name }));
            }
          }
          setAllUsers(allUsersArr);
          if (allUsersArr.length === 1) setSelectedUser(allUsersArr[0]);
        }
      } catch (_) {}
      setPageLoading(false);
    };
    loadAllUsers();
  }, []);

  const handleSubmitPin = async (pin) => {
    if (!selectedUser) return;
    setLoading(true);
    setError('');
    try {
      const result = await window.electronAPI.auth.login({
        businessId: selectedUser.business_id,
        username: selectedUser.username,
        pin,
      });
      if (result.success) {
        await login(result.data);
      } else {
        setError(result.error === 'invalid_credentials' ? 'Wrong PIN' : result.error);
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setError('');
  };

  if (pageLoading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <p className="text-white/50 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center overflow-auto">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          <span className="text-indigo-400 font-bold">Insta</span>
          <span className="text-white font-bold">Mall</span>
        </h1>
        {selectedUser && (
          <p className="text-white/40 text-sm">{selectedUser.businessName}</p>
        )}
      </div>

      {/* PIN Entry for selected user */}
      {selectedUser ? (
        <div className="flex flex-col items-center">
          <UserAvatar
            displayName={selectedUser.display_name}
            avatarColor={selectedUser.avatar_color}
            size="xl"
            className="mb-3"
          />
          <h2 className="text-white text-xl font-semibold mb-1">{selectedUser.display_name}</h2>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full mb-6',
            ROLE_COLORS[selectedUser.role]?.bg,
            ROLE_COLORS[selectedUser.role]?.text,
          )}>
            {ROLE_LABELS[selectedUser.role] || selectedUser.role}
          </span>

          <PinPad
            pinLength={selectedUser.pin_length || 4}
            onSubmit={handleSubmitPin}
            error={error}
            disabled={loading}
          />

          {allUsers.length > 1 && (
            <button
              onClick={handleBackToUsers}
              className="mt-6 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              ← Switch user
            </button>
          )}
        </div>
      ) : (
        /* User selection grid */
        <div className="flex flex-col items-center max-w-lg w-full px-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-accent" />
            <h2 className="text-white text-lg font-medium">Who's using InstaMall?</h2>
          </div>

          {allUsers.length === 0 ? (
            <p className="text-white/40 text-sm">No active users found</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
              {allUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 
                             transition-all border border-white/5 hover:border-accent/30"
                >
                  <UserAvatar
                    displayName={user.display_name}
                    avatarColor={user.avatar_color}
                    size="lg"
                  />
                  <span className="text-white text-sm font-medium truncate max-w-full">
                    {user.display_name}
                  </span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    ROLE_COLORS[user.role]?.bg,
                    ROLE_COLORS[user.role]?.text,
                  )}>
                    {ROLE_LABELS[user.role]}
                  </span>
                  <span className="text-white/30 text-[10px] truncate max-w-full">
                    {user.businessName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
