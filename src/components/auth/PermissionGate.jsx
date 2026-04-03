/**
 * Module 8: PermissionGate component
 * Conditionally renders children based on the current user's permissions.
 * If the user doesn't have the required permission, renders fallback (or nothing).
 */
import React from 'react';
import useAuthStore from '@/stores/authStore';

export default function PermissionGate({ permission, children, fallback = null }) {
  const canDo = useAuthStore((s) => s.can);

  if (!permission) return children;
  if (canDo(permission)) return children;
  return fallback;
}
