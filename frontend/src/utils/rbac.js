/**
 * RBAC Role and Navigation Resolver for StockAI
 * Maps the 10 Granular Roles to their designated default landing pages and navigation settings.
 */

export const ROLE_CONFIGS = {
  ROLE_SUPER_ADMIN: {
    roleName: 'SUPER_ADMIN',
    displayName: 'Super Admin',
    defaultTab: 'admin',
    defaultPath: '/admin/settings',
    landingDescription: 'Root System Administration & Enterprise Role Management',
    badge: 'SUPER ADMIN',
    allowedTabs: ['dashboard', 'raw-materials', 'procurement', 'production', 'quality', 'logistics', 'suppliers', 'admin', 'ai-copilot'],
  },
  ROLE_ADMIN: {
    roleName: 'ADMIN',
    displayName: 'Admin',
    defaultTab: 'admin',
    defaultPath: '/admin/settings',
    landingDescription: 'Plant Administration & Operations Management',
    badge: 'ADMIN',
    allowedTabs: ['dashboard', 'raw-materials', 'procurement', 'production', 'quality', 'logistics', 'suppliers', 'admin', 'ai-copilot'],
  },
  ROLE_FACTORY_DIRECTOR: {
    roleName: 'FACTORY_DIRECTOR',
    displayName: 'Factory Director',
    defaultTab: 'dashboard-executive',
    defaultPath: '/dashboard/executive',
    landingDescription: 'Executive Plant Overview & KPI Dashboard',
    badge: 'DIRECTOR',
    allowedTabs: ['dashboard', 'procurement', 'production', 'suppliers', 'ai-copilot'],
  },
  ROLE_PLANT_MANAGER: {
    roleName: 'PLANT_MANAGER',
    displayName: 'Plant Manager',
    defaultTab: 'dashboard-ai',
    defaultPath: '/dashboard/ai-inventory',
    landingDescription: 'AI Inventory & Operations Dashboard',
    badge: 'PLANT MGR',
    allowedTabs: ['dashboard', 'raw-materials', 'procurement', 'production', 'quality', 'logistics', 'ai-copilot'],
  },
  ROLE_STORE_MANAGER: {
    roleName: 'STORE_MANAGER',
    displayName: 'Store Manager',
    defaultTab: 'raw-materials',
    defaultPath: '/inventory/raw-materials',
    landingDescription: 'Raw Material & Finished Goods Management',
    badge: 'STORE MGR',
    allowedTabs: ['raw-materials', 'procurement', 'logistics'],
  },
  ROLE_PURCHASE_MANAGER: {
    roleName: 'PURCHASE_MANAGER',
    displayName: 'Purchase Manager',
    defaultTab: 'procurement',
    defaultPath: '/procurement/recommendations',
    landingDescription: 'Smart Purchase Recommendations & Reorder Scans',
    badge: 'PURCHASE',
    allowedTabs: ['procurement', 'raw-materials', 'suppliers', 'ai-copilot'],
  },
  ROLE_PRODUCTION_MANAGER: {
    roleName: 'PRODUCTION_MANAGER',
    displayName: 'Production Manager',
    defaultTab: 'production',
    defaultPath: '/production/flow',
    landingDescription: 'Production Flow & Work Order Management',
    badge: 'PROD MGR',
    allowedTabs: ['production', 'dashboard', 'raw-materials', 'quality', 'ai-copilot'],
  },
  ROLE_QUALITY_MANAGER: {
    roleName: 'QUALITY_MANAGER',
    displayName: 'Quality Manager',
    defaultTab: 'quality',
    defaultPath: '/qc/inspections',
    landingDescription: 'Quality Control & ASTM Lab Inspections',
    badge: 'QC MGR',
    allowedTabs: ['quality', 'production', 'raw-materials'],
  },
  ROLE_WAREHOUSE_EXECUTIVE: {
    roleName: 'WAREHOUSE_EXECUTIVE',
    displayName: 'Warehouse Executive',
    defaultTab: 'warehouse',
    defaultPath: '/warehouse/putaway',
    landingDescription: 'Warehouse Putaway & Mobile Scan Operations',
    badge: 'WAREHOUSE',
    allowedTabs: ['logistics', 'raw-materials'],
  },
  ROLE_ACCOUNTS_TEAM: {
    roleName: 'ACCOUNTS_TEAM',
    displayName: 'Accounts Team',
    defaultTab: 'suppliers',
    defaultPath: '/suppliers/management',
    landingDescription: 'Supplier Directory & Payments Management',
    badge: 'ACCOUNTS',
    allowedTabs: ['suppliers', 'procurement'],
  },
  ROLE_DISPATCH_EXECUTIVE: {
    roleName: 'DISPATCH_EXECUTIVE',
    displayName: 'Dispatch Executive',
    defaultTab: 'logistics',
    defaultPath: '/logistics/dispatches',
    landingDescription: 'Dispatch Management & Gate Pass Manifests',
    badge: 'DISPATCH',
    allowedTabs: ['logistics', 'dashboard'],
  },
  ROLE_MANAGER: {
    roleName: 'MANAGER',
    displayName: 'Manager',
    defaultTab: 'dashboard',
    defaultPath: '/dashboard',
    landingDescription: 'Operations Dashboard',
    badge: 'MANAGER',
    allowedTabs: ['dashboard', 'raw-materials', 'procurement', 'production', 'quality', 'logistics', 'ai-copilot'],
  },
  ROLE_SUPERVISOR: {
    roleName: 'SUPERVISOR',
    displayName: 'Supervisor',
    defaultTab: 'production',
    defaultPath: '/production/flow',
    landingDescription: 'Production Flow & Shift Tracking',
    badge: 'SUPERVISOR',
    allowedTabs: ['production', 'dashboard', 'raw-materials', 'quality'],
  },
  ROLE_OPERATOR: {
    roleName: 'OPERATOR',
    displayName: 'Operator',
    defaultTab: 'production',
    defaultPath: '/production/flow',
    landingDescription: 'Production & Machine Operations',
    badge: 'OPERATOR',
    allowedTabs: ['production', 'raw-materials'],
  },
};

// Priority ordering for resolving primary business role from user roles array
const ROLE_PRIORITY = [
  'ROLE_SUPER_ADMIN',
  'ROLE_FACTORY_DIRECTOR',
  'ROLE_PLANT_MANAGER',
  'ROLE_STORE_MANAGER',
  'ROLE_PURCHASE_MANAGER',
  'ROLE_PRODUCTION_MANAGER',
  'ROLE_QUALITY_MANAGER',
  'ROLE_WAREHOUSE_EXECUTIVE',
  'ROLE_ACCOUNTS_TEAM',
  'ROLE_DISPATCH_EXECUTIVE',
  'ROLE_ADMIN',
  'ROLE_MANAGER',
  'ROLE_SUPERVISOR',
  'ROLE_OPERATOR',
];

/**
 * Resolves the primary role configuration for a user based on their roles array
 * @param {string[]} roles 
 * @returns {object} Role configuration object
 */
export function getPrimaryRoleConfig(roles = []) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return ROLE_CONFIGS.ROLE_OPERATOR;
  }

  // Normalize roles (ensure ROLE_ prefix)
  const normalized = roles.map(r => r.startsWith('ROLE_') ? r : `ROLE_${r}`);

  for (const prioritizedRole of ROLE_PRIORITY) {
    if (normalized.includes(prioritizedRole)) {
      if (ROLE_CONFIGS[prioritizedRole]) {
        return ROLE_CONFIGS[prioritizedRole];
      }
      // Fallback for base roles
      if (prioritizedRole === 'ROLE_ADMIN') {
        return ROLE_CONFIGS.ROLE_SUPER_ADMIN;
      }
      if (prioritizedRole === 'ROLE_MANAGER') {
        return ROLE_CONFIGS.ROLE_PLANT_MANAGER;
      }
      if (prioritizedRole === 'ROLE_SUPERVISOR') {
        return ROLE_CONFIGS.ROLE_SUPERVISOR;
      }
      if (prioritizedRole === 'ROLE_OPERATOR') {
        return ROLE_CONFIGS.ROLE_OPERATOR;
      }
    }
  }

  return ROLE_CONFIGS.ROLE_OPERATOR;
}

/**
 * Returns the default tab identifier for a given user's roles
 * @param {string[]} roles 
 * @returns {string} tab ID
 */
export function getDefaultLandingTab(roles = []) {
  const config = getPrimaryRoleConfig(roles);
  return config.defaultTab;
}

/**
 * Normalizes an arbitrary tab or route identifier to its primary sidebar module tab id
 * @param {string} tab 
 * @returns {string} canonical module id
 */
export function normalizeModuleTab(tab) {
  if (!tab) return 'dashboard';
  if (tab === 'dashboard-executive' || tab === 'dashboard-ai') return 'dashboard';
  if (tab === 'warehouse' || tab === 'stock-transfers') return 'logistics';
  return tab;
}

/**
 * Returns the unified set of allowed tab IDs across all roles assigned to the user
 * @param {string[]} roles 
 * @returns {string[]} array of unique tab IDs
 */
export function getAllowedTabs(roles = []) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return ['production', 'raw-materials'];
  }

  const normalized = roles.map(r => r.startsWith('ROLE_') ? r : `ROLE_${r}`);
  const tabsSet = new Set();

  for (const roleKey of normalized) {
    const config = ROLE_CONFIGS[roleKey];
    if (config && Array.isArray(config.allowedTabs)) {
      config.allowedTabs.forEach(t => tabsSet.add(t));
    } else {
      // Fallback for base roles
      if (roleKey === 'ROLE_ADMIN' || roleKey === 'ROLE_SUPER_ADMIN') {
        ROLE_CONFIGS.ROLE_SUPER_ADMIN.allowedTabs.forEach(t => tabsSet.add(t));
      } else if (roleKey === 'ROLE_MANAGER') {
        ROLE_CONFIGS.ROLE_PLANT_MANAGER.allowedTabs.forEach(t => tabsSet.add(t));
      } else if (roleKey === 'ROLE_SUPERVISOR') {
        ROLE_CONFIGS.ROLE_SUPERVISOR.allowedTabs.forEach(t => tabsSet.add(t));
      } else if (roleKey === 'ROLE_OPERATOR') {
        ROLE_CONFIGS.ROLE_OPERATOR.allowedTabs.forEach(t => tabsSet.add(t));
      }
    }
  }

  // If set is still empty (unknown role), default to least-privilege operator set
  if (tabsSet.size === 0) {
    return ['production', 'raw-materials'];
  }

  return Array.from(tabsSet);
}

/**
 * Checks whether a given tab/page is permitted for the user's roles
 * @param {string} tab 
 * @param {string[]} roles 
 * @returns {boolean}
 */
export function isTabAllowed(tab, roles = []) {
  const canonical = normalizeModuleTab(tab);
  const allowed = getAllowedTabs(roles);
  return allowed.includes(canonical);
}
