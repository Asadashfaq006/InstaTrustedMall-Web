/**
 * Module 8: User Roles & Permissions Constants
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALESPERSON: 'salesperson',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.SALESPERSON]: 'Salesperson',
  [ROLES.VIEWER]: 'Viewer',
};

export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  [ROLES.ADMIN]: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  [ROLES.MANAGER]: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  [ROLES.SALESPERSON]: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  [ROLES.VIEWER]: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

/**
 * Permission matrix: which roles can do what.
 * Key = permission slug, Value = array of roles that have this permission
 */
export const PERMISSIONS = {
  // Products / Inventory
  'products:view':         [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON, ROLES.VIEWER],
  'products:create':       [ROLES.ADMIN, ROLES.MANAGER],
  'products:edit':         [ROLES.ADMIN, ROLES.MANAGER],
  'products:delete':       [ROLES.ADMIN, ROLES.MANAGER],
  'products:import':       [ROLES.ADMIN, ROLES.MANAGER],
  'products:export':       [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON],
  'products:viewCost':     [ROLES.ADMIN, ROLES.MANAGER],

  // Stock
  'stock:view':            [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON, ROLES.VIEWER],
  'stock:adjustIn':        [ROLES.ADMIN, ROLES.MANAGER],
  'stock:adjustOut':       [ROLES.ADMIN, ROLES.MANAGER],
  'stock:adjust':          [ROLES.ADMIN, ROLES.MANAGER],
  'stock:setReorder':      [ROLES.ADMIN, ROLES.MANAGER],

  // Buyers
  'buyers:view':           [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON, ROLES.VIEWER],
  'buyers:create':         [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON],
  'buyers:edit':           [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON],
  'buyers:archive':        [ROLES.ADMIN, ROLES.MANAGER],
  'buyers:delete':         [ROLES.ADMIN],
  'buyers:recordPayment':  [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON],

  // Demands
  'demands:view':          [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON, ROLES.VIEWER],
  'demands:create':        [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON],
  'demands:edit':          [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON],
  'demands:confirm':       [ROLES.ADMIN, ROLES.MANAGER],
  'demands:cancel':        [ROLES.ADMIN, ROLES.MANAGER],
  'demands:delete':        [ROLES.ADMIN],

  // Audit
  'audit:view':            [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON, ROLES.VIEWER],
  'audit:viewSystem':      [ROLES.ADMIN],

  // Sales
  'sales:view':            [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON, ROLES.VIEWER],

  // Reports
  'reports:view':          [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON, ROLES.VIEWER],
  'reports:viewFinancial': [ROLES.ADMIN, ROLES.MANAGER],
  'reports:export':        [ROLES.ADMIN, ROLES.MANAGER],

  // Users & Settings
  'users:manage':          [ROLES.ADMIN],
  'settings:manage':       [ROLES.ADMIN],
  'businesses:manage':     [ROLES.ADMIN, ROLES.MANAGER],

  // Backup & Data
  'backup:manage':         [ROLES.ADMIN],

  // Sidebar
  'sidebar:manage':        [ROLES.ADMIN],

  // Dashboard
  'dashboard:viewRevenue': [ROLES.ADMIN, ROLES.MANAGER],
};

export const AVATAR_COLORS = [
  '#1E3A5F', '#2E86AB', '#D32F2F', '#388E3C', '#F57C00',
  '#7B1FA2', '#00796B', '#C2185B', '#455A64', '#5D4037',
];
