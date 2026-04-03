/**
 * Module 8: UserAvatar component
 * Colored circle with initials, optional online dot.
 */
import React from 'react';
import { cn } from '@/lib/utils';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserAvatar({ displayName, avatarColor = '#2E86AB', size = 'md', className }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        sizes[size] || sizes.md,
        className
      )}
      style={{ backgroundColor: avatarColor }}
      title={displayName}
    >
      {getInitials(displayName)}
    </div>
  );
}
