/**
 * KaziFlow RBAC — Permission Catalog (source of truth)
 * ------------------------------------------------------------------
 * Every permission is an independently assignable key. System roles map to a
 * set of these keys (see SYSTEM_ROLE_PERMISSIONS). Custom roles store grants
 * in the `role_permissions` table. The DB `permissions` table is seeded from
 * this catalog so the database stays in sync.
 */

export type PermissionKey =
  | "organization.view"
  | "organization.update"
  | "organization.manage_billing"
  | "organization.manage_settings"
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "clients.delete"
  | "invoices.view"
  | "invoices.create"
  | "invoices.edit"
  | "invoices.delete"
  | "invoices.send"
  | "invoices.void"
  | "payments.view"
  | "payments.create"
  | "payments.receive"
  | "payments.refund"
  | "expenses.view"
  | "expenses.create"
  | "expenses.edit"
  | "expenses.delete"
  | "tasks.view"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  | "inventory.view"
  | "inventory.products.manage"
  | "inventory.stock.adjust"
  | "inventory.warehouses.manage"
  | "purchasing.view"
  | "purchasing.create"
  | "purchasing.approve"
  | "purchasing.receive"
  | "bookkeeping.view"
  | "bookkeeping.manage"
  | "bookkeeping.post"
  | "reports.view_financial"
  | "reports.export"
  | "compliance.view"
  | "compliance.manage"
  | "compliance.submit"
  | "integrations.configure"
  | "integrations.etims"
  | "integrations.mpesa"
  | "integrations.stripe"
  | "ai.access"
  | "ai.manage"
  | "team.view"
  | "team.invite"
  | "team.manage"
  | "roles.view"
  | "roles.manage"
  | "api.keys.manage"
  | "api.view"
  | "audit.view"
  | "notifications.view"
  | "notifications.manage"
  | "settings.view"
  | "settings.manage"
  | "subscription.manage"
  | "timeline.view"
  | "sync.push"
  | "sync.pull"
  | "sync.conflict"
  | "sync.status";

export interface PermissionDef {
  key: PermissionKey;
  category: string;
  name: string;
  description: string;
}

export const PERMISSIONS: Record<PermissionKey, PermissionDef> = {
  "organization.view": { key: "organization.view", category: "organization", name: "View Organization", description: "View organization profile and details" },
  "organization.update": { key: "organization.update", category: "organization", name: "Update Organization", description: "Edit organization profile and settings" },
  "organization.manage_billing": { key: "organization.manage_billing", category: "organization", name: "Manage Billing", description: "Manage subscription and billing" },
  "organization.manage_settings": { key: "organization.manage_settings", category: "organization", name: "Manage Settings", description: "Manage organization-level integrations and config" },

  "clients.view": { key: "clients.view", category: "clients", name: "View Clients", description: "View client list and details" },
  "clients.create": { key: "clients.create", category: "clients", name: "Create Clients", description: "Add new clients" },
  "clients.edit": { key: "clients.edit", category: "clients", name: "Edit Clients", description: "Edit existing clients" },
  "clients.delete": { key: "clients.delete", category: "clients", name: "Delete Clients", description: "Delete clients" },

  "invoices.view": { key: "invoices.view", category: "invoices", name: "View Invoices", description: "View invoices" },
  "invoices.create": { key: "invoices.create", category: "invoices", name: "Create Invoices", description: "Create invoices" },
  "invoices.edit": { key: "invoices.edit", category: "invoices", name: "Edit Invoices", description: "Edit invoices" },
  "invoices.delete": { key: "invoices.delete", category: "invoices", name: "Delete Invoices", description: "Delete invoices" },
  "invoices.send": { key: "invoices.send", category: "invoices", name: "Send Invoices", description: "Send invoices to clients" },
  "invoices.void": { key: "invoices.void", category: "invoices", name: "Void Invoices", description: "Void/cancel invoices" },

  "payments.view": { key: "payments.view", category: "payments", name: "View Payments", description: "View payments" },
  "payments.create": { key: "payments.create", category: "payments", name: "Record Payments", description: "Record manual payments" },
  "payments.receive": { key: "payments.receive", category: "payments", name: "Receive Payments", description: "Receive and reconcile payments" },
  "payments.refund": { key: "payments.refund", category: "payments", name: "Refund Payments", description: "Issue refunds" },

  "expenses.view": { key: "expenses.view", category: "expenses", name: "View Expenses", description: "View expenses" },
  "expenses.create": { key: "expenses.create", category: "expenses", name: "Create Expenses", description: "Log expenses" },
  "expenses.edit": { key: "expenses.edit", category: "expenses", name: "Edit Expenses", description: "Edit expenses" },
  "expenses.delete": { key: "expenses.delete", category: "expenses", name: "Delete Expenses", description: "Delete expenses" },

  "tasks.view": { key: "tasks.view", category: "tasks", name: "View Tasks", description: "View tasks" },
  "tasks.create": { key: "tasks.create", category: "tasks", name: "Create Tasks", description: "Create tasks" },
  "tasks.edit": { key: "tasks.edit", category: "tasks", name: "Edit Tasks", description: "Edit tasks" },
  "tasks.delete": { key: "tasks.delete", category: "tasks", name: "Delete Tasks", description: "Delete tasks" },

  "inventory.view": { key: "inventory.view", category: "inventory", name: "View Inventory", description: "View inventory" },
  "inventory.products.manage": { key: "inventory.products.manage", category: "inventory", name: "Manage Products", description: "Create/edit products, categories, brands, suppliers" },
  "inventory.stock.adjust": { key: "inventory.stock.adjust", category: "inventory", name: "Adjust Stock", description: "Adjust stock levels" },
  "inventory.warehouses.manage": { key: "inventory.warehouses.manage", category: "inventory", name: "Manage Warehouses", description: "Create/edit warehouses" },

  "purchasing.view": { key: "purchasing.view", category: "purchasing", name: "View Purchase Orders", description: "View purchase orders" },
  "purchasing.create": { key: "purchasing.create", category: "purchasing", name: "Create Purchase Orders", description: "Create purchase orders" },
  "purchasing.approve": { key: "purchasing.approve", category: "purchasing", name: "Approve Purchase Orders", description: "Approve purchase orders" },
  "purchasing.receive": { key: "purchasing.receive", category: "purchasing", name: "Receive Purchase Orders", description: "Receive purchase orders" },

  "bookkeeping.view": { key: "bookkeeping.view", category: "bookkeeping", name: "View Bookkeeping", description: "View chart of accounts and journal" },
  "bookkeeping.manage": { key: "bookkeeping.manage", category: "bookkeeping", name: "Manage Bookkeeping", description: "Manage chart of accounts" },
  "bookkeeping.post": { key: "bookkeeping.post", category: "bookkeeping", name: "Post Journal Entries", description: "Post journal entries" },

  "reports.view_financial": { key: "reports.view_financial", category: "reports", name: "View Financial Reports", description: "View financial reports" },
  "reports.export": { key: "reports.export", category: "reports", name: "Export Reports", description: "Export reports" },

  "compliance.view": { key: "compliance.view", category: "compliance", name: "View Compliance", description: "View eTIMS compliance status" },
  "compliance.manage": { key: "compliance.manage", category: "compliance", name: "Manage Compliance", description: "Manage compliance configuration" },
  "compliance.submit": { key: "compliance.submit", category: "compliance", name: "Submit to Compliance", description: "Submit invoices to KRA eTIMS" },

  "integrations.configure": { key: "integrations.configure", category: "integrations", name: "Configure Integrations", description: "Configure platform integrations" },
  "integrations.etims": { key: "integrations.etims", category: "integrations", name: "eTIMS Integration", description: "Manage KRA eTIMS integration" },
  "integrations.mpesa": { key: "integrations.mpesa", category: "integrations", name: "M-Pesa Integration", description: "Manage M-Pesa integration" },
  "integrations.stripe": { key: "integrations.stripe", category: "integrations", name: "Stripe Integration", description: "Manage Stripe integration" },

  "ai.access": { key: "ai.access", category: "ai", name: "Access AI Features", description: "Use AI assistant features" },
  "ai.manage": { key: "ai.manage", category: "ai", name: "Manage AI", description: "Manage AI configuration and limits" },

  "team.view": { key: "team.view", category: "team", name: "View Team", description: "View team members" },
  "team.invite": { key: "team.invite", category: "team", name: "Invite Team", description: "Invite team members" },
  "team.manage": { key: "team.manage", category: "team", name: "Manage Team", description: "Manage team members and roles" },

  "roles.view": { key: "roles.view", category: "roles", name: "View Roles", description: "View roles and permissions" },
  "roles.manage": { key: "roles.manage", category: "roles", name: "Manage Roles", description: "Create/edit custom roles and permissions" },

  "api.keys.manage": { key: "api.keys.manage", category: "api", name: "Manage API Keys", description: "Create/revoke API keys" },
  "api.view": { key: "api.view", category: "api", name: "View API", description: "View API usage and docs" },

  "audit.view": { key: "audit.view", category: "audit", name: "View Audit Logs", description: "View audit logs" },

  "notifications.view": { key: "notifications.view", category: "notifications", name: "View Notifications", description: "View notifications" },
  "notifications.manage": { key: "notifications.manage", category: "notifications", name: "Manage Notifications", description: "Manage notification preferences" },

  "settings.view": { key: "settings.view", category: "settings", name: "View Settings", description: "View settings" },
  "settings.manage": { key: "settings.manage", category: "settings", name: "Manage Settings", description: "Manage application settings" },

  "subscription.manage": { key: "subscription.manage", category: "subscription", name: "Manage Subscription", description: "Manage subscription plan" },

  "timeline.view": { key: "timeline.view", category: "audit", name: "View Timeline", description: "View the business activity timeline" },
  "sync.push": { key: "sync.push", category: "sync", name: "Push Sync", description: "Push offline changes to server" },
  "sync.pull": { key: "sync.pull", category: "sync", name: "Pull Sync", description: "Pull server changes to offline" },
  "sync.conflict": { key: "sync.conflict", category: "sync", name: "Resolve Conflicts", description: "Resolve sync conflicts" },
  "sync.status": { key: "sync.status", category: "sync", name: "View Sync Status", description: "View sync status" },
};

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

/** The nine system roles. Order matters: higher privilege first. */
export type SystemRole =
  | "owner"
  | "administrator"
  | "manager"
  | "accountant"
  | "inventory_manager"
  | "cashier"
  | "sales_representative"
  | "employee"
  | "viewer";

const TASK_PERMS: PermissionKey[] = [
  "tasks.view",
  "tasks.create",
  "tasks.edit",
  "tasks.delete",
];

const FINANCIAL_REPORTING: PermissionKey[] = [
  "reports.view_financial",
  "reports.export",
];

const COMPLIANCE_PERMS: PermissionKey[] = [
  "compliance.view",
  "compliance.manage",
  "compliance.submit",
];

const INTEGRATION_PERMS: PermissionKey[] = [
  "integrations.configure",
  "integrations.etims",
  "integrations.mpesa",
  "integrations.stripe",
];

/**
 * System role → permission mapping. Owners get everything. Each lower role is a
 * subset of the higher ones, with role-specific focuses layered on top.
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, PermissionKey[]> = {
  owner: ALL_PERMISSION_KEYS,

  administrator: ALL_PERMISSION_KEYS.filter(
    (p) => p !== "organization.manage_billing" && p !== "subscription.manage"
  ),

  manager: [
    "organization.view",
    "organization.update",
    "clients.view",
    "clients.create",
    "clients.edit",
    "clients.delete",
    "invoices.view",
    "invoices.create",
    "invoices.edit",
    "invoices.delete",
    "invoices.send",
    "invoices.void",
    "payments.view",
    "payments.create",
    "payments.receive",
    "payments.refund",
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.delete",
    "inventory.view",
    "inventory.products.manage",
    "inventory.stock.adjust",
    "inventory.warehouses.manage",
    "purchasing.view",
    "purchasing.create",
    "purchasing.approve",
    "purchasing.receive",
    "bookkeeping.view",
    "bookkeeping.manage",
    "bookkeeping.post",
    ...FINANCIAL_REPORTING,
    ...COMPLIANCE_PERMS,
    "ai.access",
    "team.view",
    "team.invite",
    "roles.view",
    "notifications.view",
    "timeline.view",
    "notifications.manage",
    "settings.view",
    "settings.manage",
    ...TASK_PERMS,
  ],

  accountant: [
    "organization.view",
    "clients.view",
    "clients.create",
    "clients.edit",
    "invoices.view",
    "invoices.create",
    "invoices.edit",
    "invoices.send",
    "invoices.void",
    "payments.view",
    "payments.create",
    "payments.receive",
    "payments.refund",
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.delete",
    "bookkeeping.view",
    "bookkeeping.manage",
    "bookkeeping.post",
    ...FINANCIAL_REPORTING,
    ...COMPLIANCE_PERMS,
    "ai.access",
    "notifications.view",
    "timeline.view",
    "notifications.manage",
    ...TASK_PERMS,
  ],

  inventory_manager: [
    "organization.view",
    "invoices.view",
    "clients.view",
    "inventory.view",
    "inventory.products.manage",
    "inventory.stock.adjust",
    "inventory.warehouses.manage",
    "purchasing.view",
    "purchasing.create",
    "purchasing.approve",
    "purchasing.receive",
    "reports.view_financial",
    "ai.access",
    "notifications.view",
    "timeline.view",
    ...TASK_PERMS,
  ],

  cashier: [
    "organization.view",
    "clients.view",
    "invoices.view",
    "payments.view",
    "payments.create",
    "payments.receive",
    "expenses.view",
    "notifications.view",
    "timeline.view",
    ...TASK_PERMS,
  ],

  sales_representative: [
    "organization.view",
    "clients.view",
    "clients.create",
    "clients.edit",
    "invoices.view",
    "invoices.create",
    "invoices.edit",
    "invoices.send",
    "inventory.view",
    "ai.access",
    "notifications.view",
    "timeline.view",
    ...TASK_PERMS,
  ],

  employee: [
    "organization.view",
    "clients.view",
    "clients.create",
    "invoices.view",
    "invoices.create",
    "payments.view",
    "expenses.view",
    "expenses.create",
    "inventory.view",
    "purchasing.view",
    "bookkeeping.view",
    "ai.access",
    "notifications.view",
    "timeline.view",
    "tasks.view",
    "tasks.create",
    "tasks.edit",
  ],

  viewer: [
    "organization.view",
    "clients.view",
    "invoices.view",
    "payments.view",
    "expenses.view",
    "inventory.view",
    "purchasing.view",
    "bookkeeping.view",
    "reports.view_financial",
    "compliance.view",
    "ai.access",
    "notifications.view",
    "timeline.view",
    "tasks.view",
  ],
};

export const SYSTEM_ROLES: SystemRole[] = [
  "owner",
  "administrator",
  "manager",
  "accountant",
  "inventory_manager",
  "cashier",
  "sales_representative",
  "employee",
  "viewer",
];

export const ROLE_LABELS: Record<SystemRole, string> = {
  owner: "Owner",
  administrator: "Administrator",
  manager: "Manager",
  accountant: "Accountant",
  inventory_manager: "Inventory Manager",
  cashier: "Cashier",
  sales_representative: "Sales Representative",
  employee: "Employee",
  viewer: "Viewer",
};

/** Human-friendly grouping of permissions for the UI. */
export const PERMISSION_GROUPS: { category: string; label: string; permissions: PermissionKey[] }[] = (() => {
  const groups: Record<string, PermissionKey[]> = {};
  for (const key of ALL_PERMISSION_KEYS) {
    const cat = PERMISSIONS[key].category;
    (groups[cat] ||= []).push(key);
  }
  return Object.entries(groups).map(([category, permissions]) => ({
    category,
    label: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " "),
    permissions,
  }));
})();
