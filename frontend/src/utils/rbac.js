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
    landingDescription: 'System Administration & Security Settings',
    badge: 'ADMIN',
  },
  ROLE_FACTORY_DIRECTOR: {
    roleName: 'FACTORY_DIRECTOR',
    displayName: 'Factory Director',
    defaultTab: 'dashboard-executive',
    defaultPath: '/dashboard/executive',
    landingDescription: 'Executive Plant Overview & KPI Dashboard',
    badge: 'DIRECTOR',
  },
  ROLE_PLANT_MANAGER: {
    roleName: 'PLANT_MANAGER',
    displayName: 'Plant Manager',
    defaultTab: 'dashboard-ai',
    defaultPath: '/dashboard/ai-inventory',
    landingDescription: 'AI Inventory & Operations Dashboard',
    badge: 'PLANT MGR',
  },
  ROLE_STORE_MANAGER: {
    roleName: 'STORE_MANAGER',
    displayName: 'Store Manager',
    defaultTab: 'raw-materials',
    defaultPath: '/inventory/raw-materials',
    landingDescription: 'Raw Material & Finished Goods Management',
    badge: 'STORE MGR',
  },
  ROLE_PURCHASE_MANAGER: {
    roleName: 'PURCHASE_MANAGER',
    displayName: 'Purchase Manager',
    defaultTab: 'procurement',
    defaultPath: '/procurement/recommendations',
    landingDescription: 'Smart Purchase Recommendations & Reorder Scans',
    badge: 'PURCHASE',
  },
  ROLE_PRODUCTION_MANAGER: {
    roleName: 'PRODUCTION_MANAGER',
    displayName: 'Production Manager',
    defaultTab: 'production',
    defaultPath: '/production/flow',
    landingDescription: 'Production Flow & Work Order Management',
    badge: 'PROD MGR',
  },
  ROLE_QUALITY_MANAGER: {
    roleName: 'QUALITY_MANAGER',
    displayName: 'Quality Manager',
    defaultTab: 'quality',
    defaultPath: '/qc/inspections',
    landingDescription: 'Quality Control & ASTM Lab Inspections',
    badge: 'QC MGR',
  },
  ROLE_WAREHOUSE_EXECUTIVE: {
    roleName: 'WAREHOUSE_EXECUTIVE',
    displayName: 'Warehouse Executive',
    defaultTab: 'warehouse',
    defaultPath: '/warehouse/putaway',
    landingDescription: 'Warehouse Putaway & Mobile Scan Operations',
    badge: 'WAREHOUSE',
  },
  ROLE_ACCOUNTS_TEAM: {
    roleName: 'ACCOUNTS_TEAM',
    displayName: 'Accounts Team',
    defaultTab: 'suppliers',
    defaultPath: '/suppliers/management',
    landingDescription: 'Supplier Directory & Payments Management',
    badge: 'ACCOUNTS',
  },
  ROLE_DISPATCH_EXECUTIVE: {
    roleName: 'DISPATCH_EXECUTIVE',
    displayName: 'Dispatch Executive',
    defaultTab: 'logistics',
    defaultPath: '/logistics/dispatches',
    landingDescription: 'Dispatch Management & Gate Pass Manifests',
    badge: 'DISPATCH',
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
    return {
      roleName: 'OPERATOR',
      displayName: 'Operator',
      defaultTab: 'dashboard',
      defaultPath: '/dashboard',
      landingDescription: 'Operations Dashboard',
      badge: 'OPERATOR',
    };
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
        return ROLE_CONFIGS.ROLE_QUALITY_MANAGER;
      }
      if (prioritizedRole === 'ROLE_OPERATOR') {
        return ROLE_CONFIGS.ROLE_WAREHOUSE_EXECUTIVE;
      }
    }
  }

  return {
    roleName: 'OPERATOR',
    displayName: 'Operator',
    defaultTab: 'dashboard',
    defaultPath: '/dashboard',
    landingDescription: 'Control Room Dashboard',
    badge: 'OPERATOR',
  };
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
