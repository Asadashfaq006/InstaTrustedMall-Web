/**
 * Module 8: Permission checker utility
 */
import { PERMISSIONS } from '@/constants/roles';

/**
 * Check if a user role has a given permission
 * @param {string} role - e.g. 'admin', 'salesperson'
 * @param {string} permission - e.g. 'products:create'
 * @returns {boolean}
 */
export function can(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Check if role is admin
 */
export function isAdmin(role) {
  return role === 'admin';
}

/**
 * Check if role is admin or manager
 */
export function isAdminOrManager(role) {
  return role === 'admin' || role === 'manager';
}
