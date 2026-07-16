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
  | "payments.delete"
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
  | "purchasing.requests.manage"
  | "purchasing.rfq.manage"
  | "purchasing.quotations.manage"
  | "purchasing.po.manage"
  | "purchasing.grn.manage"
  | "purchasing.returns.manage"
  | "purchasing.invoices.manage"
  | "purchasing.payments.manage"
  | "purchasing.suppliers.manage"
  | "purchasing.budget.manage"
  | "purchasing.reports.view"
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
  | "integrations.view"
  | "integrations.manage"
  | "integrations.sync"
  | "integrations.logs.view"
  | "ai.access"
  | "ai.manage"
  | "automation.view"
  | "automation.manage"
  | "automation.execute"
  | "approvals.view"
  | "approvals.manage"
  | "approvals.approve"
  | "team.view"
  | "team.invite"
  | "team.manage"
  | "roles.view"
  | "roles.manage"
  | "api.keys.manage"
  | "api.view"
  | "api.analytics.view"
  | "api.docs.view"
  | "api.sdk.generate"
  | "oauth.clients.manage"
  | "webhooks.manage"
  | "sandbox.manage"
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
  | "sync.status"
  | "crm.view"
  | "crm.leads.manage"
  | "crm.contacts.manage"
  | "crm.deals.manage"
  | "crm.activities.manage"
  | "crm.quotations.manage"
  | "crm.quotations.approve"
  | "crm.reports.view"
  | "crm.ai.access"
  | "pos.view"
  | "pos.sales.create"
  | "pos.sales.view"
  | "pos.sales.delete"
  | "pos.returns"
  | "pos.shift.manage"
  | "pos.settings.manage"
  | "hr.view"
  | "hr.employees.manage"
  | "hr.departments.manage"
  | "hr.positions.manage"
  | "hr.attendance.manage"
  | "hr.leave.manage"
  | "hr.shifts.manage"
  | "hr.recruitment.manage"
  | "hr.onboarding.manage"
  | "hr.offboarding.manage"
  | "hr.performance.manage"
  | "hr.training.manage"
  | "hr.documents.manage"
  | "hr.reports.view"
  | "hr.ai.access"
  | "payroll.view"
  | "payroll.periods.manage"
  | "payroll.salary_structures.manage"
  | "payroll.runs.manage"
  | "payroll.runs.approve"
  | "payroll.payslips.view"
  | "payroll.payslips.manage"
  | "payroll.reports.view"
  | "payroll.export"
  | "payroll.settings.manage"
  | "analytics.view"
  | "analytics.export"
  | "analytics.dashboards.manage"
  | "analytics.scheduled_reports.manage"
  | "enterprise.view"
  | "enterprise.branches.manage"
  | "enterprise.members.manage"
  | "enterprise.pricing.manage"
  | "enterprise.transfers.manage"
  | "enterprise.sales.manage"
  | "enterprise.procurement.manage"
  | "enterprise.reports.view"
  | "enterprise.approvals.manage"
  | "enterprise.approvals.approve"
  | "enterprise.settings.manage"
  | "enterprise.ai.access";

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
  "payments.delete": { key: "payments.delete", category: "payments", name: "Delete Payments", description: "Delete payments" },

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
  "purchasing.approve": { key: "purchasing.approve", category: "purchasing", name: "Approve Purchase Orders", description: "Approve purchase orders and requests" },
  "purchasing.receive": { key: "purchasing.receive", category: "purchasing", name: "Receive Purchase Orders", description: "Receive purchase orders" },
  "purchasing.requests.manage": { key: "purchasing.requests.manage", category: "purchasing", name: "Manage Purchase Requests", description: "Create and manage purchase requisitions" },
  "purchasing.rfq.manage": { key: "purchasing.rfq.manage", category: "purchasing", name: "Manage RFQs", description: "Create and issue requests for quotations" },
  "purchasing.quotations.manage": { key: "purchasing.quotations.manage", category: "purchasing", name: "Manage Supplier Quotations", description: "Record and compare supplier quotations" },
  "purchasing.po.manage": { key: "purchasing.po.manage", category: "purchasing", name: "Manage Purchase Orders", description: "Create, submit, order and cancel purchase orders" },
  "purchasing.grn.manage": { key: "purchasing.grn.manage", category: "purchasing", name: "Manage Goods Received", description: "Create goods received notes and update inventory" },
  "purchasing.returns.manage": { key: "purchasing.returns.manage", category: "purchasing", name: "Manage Supplier Returns", description: "Record returns to suppliers" },
  "purchasing.invoices.manage": { key: "purchasing.invoices.manage", category: "purchasing", name: "Manage Purchase Invoices", description: "Record supplier purchase invoices and post to bookkeeping" },
  "purchasing.payments.manage": { key: "purchasing.payments.manage", category: "purchasing", name: "Manage Supplier Payments", description: "Record payments to suppliers" },
  "purchasing.suppliers.manage": { key: "purchasing.suppliers.manage", category: "purchasing", name: "Manage Suppliers", description: "Manage supplier profiles and performance" },
  "purchasing.budget.manage": { key: "purchasing.budget.manage", category: "purchasing", name: "Manage Budgets", description: "Create and manage procurement budgets" },
  "purchasing.reports.view": { key: "purchasing.reports.view", category: "purchasing", name: "View Procurement Reports", description: "View procurement analytics and reports" },

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
  "integrations.view": { key: "integrations.view", category: "integrations", name: "View Integration Hub", description: "View the Integration Hub, connections, marketplace and health" },
  "integrations.manage": { key: "integrations.manage", category: "integrations", name: "Manage Integrations", description: "Connect, disconnect and configure integrations" },
  "integrations.sync": { key: "integrations.sync", category: "integrations", name: "Sync & Dispatch Integrations", description: "Trigger syncs and dispatch messages/tests via integrations" },
  "integrations.logs.view": { key: "integrations.logs.view", category: "integrations", name: "View Integration Logs", description: "View integration activity and event logs" },

  "ai.access": { key: "ai.access", category: "ai", name: "Access AI Features", description: "Use AI assistant features" },
  "ai.manage": { key: "ai.manage", category: "ai", name: "Manage AI", description: "Manage AI configuration and limits" },
  "automation.view": { key: "automation.view", category: "ai", name: "View Automations", description: "View workflow automations" },
  "automation.manage": { key: "automation.manage", category: "automation", name: "Manage Automations", description: "Create, edit and delete workflow automations" },
  "automation.execute": { key: "automation.execute", category: "automation", name: "Run Automations", description: "Manually trigger and run workflow automations" },
  "approvals.view": { key: "approvals.view", category: "automation", name: "View Approvals", description: "View approval workflows and requests" },
  "approvals.manage": { key: "approvals.manage", category: "automation", name: "Manage Approval Workflows", description: "Create and edit approval workflow definitions" },
  "approvals.approve": { key: "approvals.approve", category: "automation", name: "Approve Requests", description: "Approve or reject approval requests" },

  "team.view": { key: "team.view", category: "team", name: "View Team", description: "View team members" },
  "team.invite": { key: "team.invite", category: "team", name: "Invite Team", description: "Invite team members" },
  "team.manage": { key: "team.manage", category: "team", name: "Manage Team", description: "Manage team members and roles" },

  "roles.view": { key: "roles.view", category: "roles", name: "View Roles", description: "View roles and permissions" },
  "roles.manage": { key: "roles.manage", category: "roles", name: "Manage Roles", description: "Create/edit custom roles and permissions" },

  "api.keys.manage": { key: "api.keys.manage", category: "api", name: "Manage API Keys", description: "Create/revoke API keys" },
  "api.view": { key: "api.view", category: "api", name: "View API", description: "View API usage and docs" },
  "oauth.clients.manage": { key: "oauth.clients.manage", category: "api", name: "Manage OAuth Clients", description: "Create and manage OAuth 2.0 client applications" },
  "webhooks.manage": { key: "webhooks.manage", category: "api", name: "Manage Webhooks", description: "Create and manage webhook subscriptions" },
  "sandbox.manage": { key: "sandbox.manage", category: "api", name: "Manage Sandbox", description: "Manage API sandbox sessions" },
  "api.analytics.view": { key: "api.analytics.view", category: "api", name: "View API Analytics", description: "View API usage analytics and metrics" },
  "api.docs.view": { key: "api.docs.view", category: "api", name: "View API Docs", description: "View OpenAPI documentation" },
  "api.sdk.generate": { key: "api.sdk.generate", category: "api", name: "Generate SDKs", description: "Generate client SDKs from API schema" },

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
  "crm.view": { key: "crm.view", category: "crm", name: "View CRM", description: "View CRM companies, contacts, leads, deals, activities and quotations" },
  "crm.leads.manage": { key: "crm.leads.manage", category: "crm", name: "Manage Leads", description: "Capture, score, qualify and convert leads" },
  "crm.contacts.manage": { key: "crm.contacts.manage", category: "crm", name: "Manage Companies & Contacts", description: "Create and edit companies and contact persons" },
  "crm.deals.manage": { key: "crm.deals.manage", category: "crm", name: "Manage Deals", description: "Create and move deals through the sales pipeline" },
  "crm.activities.manage": { key: "crm.activities.manage", category: "crm", name: "Manage Activities", description: "Log calls, meetings, emails, tasks, notes and follow-ups" },
  "crm.quotations.manage": { key: "crm.quotations.manage", category: "crm", name: "Manage Quotations", description: "Create, version and convert quotations" },
  "crm.quotations.approve": { key: "crm.quotations.approve", category: "crm", name: "Approve Quotations", description: "Approve or reject quotations in the approval workflow" },
  "crm.reports.view": { key: "crm.reports.view", category: "crm", name: "View CRM Reports", description: "View CRM sales funnel, conversion and forecasting reports" },
  "crm.ai.access": { key: "crm.ai.access", category: "crm", name: "Access CRM AI", description: "Use the AI CRM assistant for prioritization, predictions and insights" },
  "pos.view": { key: "pos.view", category: "pos", name: "View POS", description: "View POS dashboard and sales" },
  "pos.sales.create": { key: "pos.sales.create", category: "pos", name: "Create Sales", description: "Create new POS sales and process payments" },
  "pos.sales.view": { key: "pos.sales.view", category: "pos", name: "View Sales", description: "View POS sales history and details" },
  "pos.sales.delete": { key: "pos.sales.delete", category: "pos", name: "Delete Sales", description: "Delete POS sales orders" },
  "pos.returns": { key: "pos.returns", category: "pos", name: "Process Returns", description: "Process returns and refunds at POS" },
  "pos.shift.manage": { key: "pos.shift.manage", category: "pos", name: "Manage Shifts", description: "Open and close cashier shifts/sessions" },
  "pos.settings.manage": { key: "pos.settings.manage", category: "pos", name: "Manage POS Settings", description: "Configure POS terminals, printers, and payment methods" },

  "hr.view": { key: "hr.view", category: "hr", name: "View HR", description: "View HR dashboard and employee records" },
  "hr.employees.manage": { key: "hr.employees.manage", category: "hr", name: "Manage Employees", description: "Create, edit, and manage employee records" },
  "hr.departments.manage": { key: "hr.departments.manage", category: "hr", name: "Manage Departments", description: "Create and manage departments" },
  "hr.positions.manage": { key: "hr.positions.manage", category: "hr", name: "Manage Positions", description: "Create and manage job positions" },
  "hr.attendance.manage": { key: "hr.attendance.manage", category: "hr", name: "Manage Attendance", description: "Track and manage employee attendance" },
  "hr.leave.manage": { key: "hr.leave.manage", category: "hr", name: "Manage Leave", description: "Approve and manage leave requests" },
  "hr.shifts.manage": { key: "hr.shifts.manage", category: "hr", name: "Manage Shifts", description: "Create and assign work shifts" },
  "hr.recruitment.manage": { key: "hr.recruitment.manage", category: "hr", name: "Manage Recruitment", description: "Manage applicants and recruitment pipeline" },
  "hr.onboarding.manage": { key: "hr.onboarding.manage", category: "hr", name: "Manage Onboarding", description: "Manage employee onboarding checklists" },
  "hr.offboarding.manage": { key: "hr.offboarding.manage", category: "hr", name: "Manage Offboarding", description: "Manage employee offboarding and exits" },
  "hr.performance.manage": { key: "hr.performance.manage", category: "hr", name: "Manage Performance", description: "Manage performance reviews and appraisals" },
  "hr.training.manage": { key: "hr.training.manage", category: "hr", name: "Manage Training", description: "Create and manage training programs" },
  "hr.documents.manage": { key: "hr.documents.manage", category: "hr", name: "Manage Documents", description: "Manage employee documents and files" },
  "hr.reports.view": { key: "hr.reports.view", category: "hr", name: "View HR Reports", description: "View HR analytics and reports" },
  "hr.ai.access": { key: "hr.ai.access", category: "hr", name: "Access HR AI", description: "Use AI HR insights and reminders" },

  "payroll.view": { key: "payroll.view", category: "payroll", name: "View Payroll", description: "View payroll dashboard and records" },
  "payroll.periods.manage": { key: "payroll.periods.manage", category: "payroll", name: "Manage Payroll Periods", description: "Create and manage payroll periods" },
  "payroll.salary_structures.manage": { key: "payroll.salary_structures.manage", category: "payroll", name: "Manage Salary Structures", description: "Create and manage salary structures and components" },
  "payroll.runs.manage": { key: "payroll.runs.manage", category: "payroll", name: "Manage Payroll Runs", description: "Create, process and manage payroll runs" },
  "payroll.runs.approve": { key: "payroll.runs.approve", category: "payroll", name: "Approve Payroll Runs", description: "Approve or reject payroll runs" },
  "payroll.payslips.view": { key: "payroll.payslips.view", category: "payroll", name: "View Payslips", description: "View employee payslips" },
  "payroll.payslips.manage": { key: "payroll.payslips.manage", category: "payroll", name: "Manage Payslips", description: "Generate and send payslips" },
  "payroll.reports.view": { key: "payroll.reports.view", category: "payroll", name: "View Payroll Reports", description: "View payroll analytics and reports" },
  "payroll.export": { key: "payroll.export", category: "payroll", name: "Export Payroll", description: "Export payroll data and bank files" },
  "payroll.settings.manage": { key: "payroll.settings.manage", category: "payroll", name: "Manage Payroll Settings", description: "Configure statutory rates and payroll defaults" },
  "analytics.view": { key: "analytics.view", category: "analytics", name: "View Analytics", description: "View enterprise analytics dashboards and reports" },
  "analytics.export": { key: "analytics.export", category: "analytics", name: "Export Analytics", description: "Export analytics data to PDF, Excel or CSV" },
  "analytics.dashboards.manage": { key: "analytics.dashboards.manage", category: "analytics", name: "Manage Dashboards", description: "Create, edit and delete custom analytics dashboards" },
  "analytics.scheduled_reports.manage": { key: "analytics.scheduled_reports.manage", category: "analytics", name: "Manage Scheduled Reports", description: "Create and manage scheduled analytics reports" },
  "enterprise.view": { key: "enterprise.view", category: "enterprise", name: "View Enterprise", description: "View enterprise dashboard and branch overview" },
  "enterprise.branches.manage": { key: "enterprise.branches.manage", category: "enterprise", name: "Manage Branches", description: "Create, edit and manage branches" },
  "enterprise.members.manage": { key: "enterprise.members.manage", category: "enterprise", name: "Manage Branch Members", description: "Assign users to branches and set branch permissions" },
  "enterprise.pricing.manage": { key: "enterprise.pricing.manage", category: "enterprise", name: "Manage Branch Pricing", description: "Set branch-specific pricing rules" },
  "enterprise.transfers.manage": { key: "enterprise.transfers.manage", category: "enterprise", name: "Manage Inter-Branch Transfers", description: "Create and manage inventory transfers between branches" },
  "enterprise.sales.manage": { key: "enterprise.sales.manage", category: "enterprise", name: "Manage Inter-Branch Sales", description: "Create and manage cross-branch sales orders" },
  "enterprise.procurement.manage": { key: "enterprise.procurement.manage", category: "enterprise", name: "Manage Centralized Procurement", description: "Oversee organization-wide procurement" },
  "enterprise.reports.view": { key: "enterprise.reports.view", category: "enterprise", name: "View Enterprise Reports", description: "View consolidated enterprise reporting" },
  "enterprise.approvals.manage": { key: "enterprise.approvals.manage", category: "enterprise", name: "Manage Branch Approvals", description: "Create and manage branch approval workflows" },
  "enterprise.approvals.approve": { key: "enterprise.approvals.approve", category: "enterprise", name: "Approve Branch Requests", description: "Approve or reject branch-level requests" },
  "enterprise.settings.manage": { key: "enterprise.settings.manage", category: "enterprise", name: "Manage Enterprise Settings", description: "Configure enterprise-level organization settings" },
  "enterprise.ai.access": { key: "enterprise.ai.access", category: "enterprise", name: "Access Enterprise AI", description: "Use AI insights for branch performance and recommendations" },
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

const CRM_PERMS: PermissionKey[] = [
  "crm.view",
  "crm.leads.manage",
  "crm.contacts.manage",
  "crm.deals.manage",
  "crm.activities.manage",
  "crm.quotations.manage",
  "crm.reports.view",
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
  "integrations.view",
  "integrations.manage",
  "integrations.sync",
  "integrations.logs.view",
];

const HR_PERMS: PermissionKey[] = [
  "hr.view",
  "hr.employees.manage",
  "hr.departments.manage",
  "hr.positions.manage",
  "hr.attendance.manage",
  "hr.leave.manage",
  "hr.shifts.manage",
  "hr.recruitment.manage",
  "hr.onboarding.manage",
  "hr.offboarding.manage",
  "hr.performance.manage",
  "hr.training.manage",
  "hr.documents.manage",
  "hr.reports.view",
  "hr.ai.access",
];

const HR_VIEW_PERMS: PermissionKey[] = [
  "hr.view",
  "hr.reports.view",
];

const PAYROLL_PERMS: PermissionKey[] = [
  "payroll.view",
  "payroll.periods.manage",
  "payroll.salary_structures.manage",
  "payroll.runs.manage",
  "payroll.runs.approve",
  "payroll.payslips.view",
  "payroll.payslips.manage",
  "payroll.reports.view",
  "payroll.export",
  "payroll.settings.manage",
];

const PAYROLL_VIEW_PERMS: PermissionKey[] = [
  "payroll.view",
  "payroll.payslips.view",
  "payroll.reports.view",
];

const ANALYTICS_PERMS: PermissionKey[] = [
  "analytics.view",
  "analytics.export",
  "analytics.dashboards.manage",
  "analytics.scheduled_reports.manage",
];

const ENTERPRISE_PERMS: PermissionKey[] = [
  "enterprise.view",
  "enterprise.branches.manage",
  "enterprise.members.manage",
  "enterprise.pricing.manage",
  "enterprise.transfers.manage",
  "enterprise.sales.manage",
  "enterprise.procurement.manage",
  "enterprise.reports.view",
  "enterprise.approvals.manage",
  "enterprise.approvals.approve",
  "enterprise.settings.manage",
  "enterprise.ai.access",
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
    "payments.delete",
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
    "purchasing.requests.manage",
    "purchasing.rfq.manage",
    "purchasing.quotations.manage",
    "purchasing.po.manage",
    "purchasing.grn.manage",
    "purchasing.returns.manage",
    "purchasing.invoices.manage",
    "purchasing.payments.manage",
    "purchasing.suppliers.manage",
    "purchasing.budget.manage",
    "purchasing.reports.view",
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
    ...CRM_PERMS,
    "crm.quotations.approve",
    "crm.ai.access",
    "pos.view",
    "pos.sales.create",
    "pos.sales.view",
    "pos.sales.delete",
    "pos.returns",
    "pos.shift.manage",
    "pos.settings.manage",
    ...HR_PERMS,
    ...PAYROLL_PERMS,
    ...ANALYTICS_PERMS,
    ...ENTERPRISE_PERMS,
    "api.keys.manage",
    "api.view",
    "api.analytics.view",
    "api.docs.view",
    "api.sdk.generate",
    "oauth.clients.manage",
    "webhooks.manage",
    "sandbox.manage",
    "automation.view",
    "automation.manage",
    "automation.execute",
    "approvals.view",
    "approvals.manage",
    "approvals.approve",
    "integrations.view",
    "integrations.manage",
    "integrations.sync",
    "integrations.logs.view",
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
    "purchasing.view",
    "purchasing.requests.manage",
    "purchasing.rfq.manage",
    "purchasing.quotations.manage",
    "purchasing.po.manage",
    "purchasing.invoices.manage",
    "purchasing.payments.manage",
    "purchasing.suppliers.manage",
    "purchasing.budget.manage",
    "purchasing.reports.view",
    ...FINANCIAL_REPORTING,
    ...COMPLIANCE_PERMS,
    "ai.access",
    "crm.view",
    "crm.reports.view",
    "crm.quotations.approve",
    "crm.ai.access",
    "notifications.view",
    "timeline.view",
    "notifications.manage",
    ...TASK_PERMS,
    ...PAYROLL_PERMS,
    ...ANALYTICS_PERMS,
    "automation.view",
    "approvals.view",
    "approvals.approve",
    "integrations.view",
    "integrations.sync",
    "integrations.logs.view",
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
    "purchasing.requests.manage",
    "purchasing.rfq.manage",
    "purchasing.quotations.manage",
    "purchasing.po.manage",
    "purchasing.grn.manage",
    "purchasing.returns.manage",
    "purchasing.suppliers.manage",
    "purchasing.budget.manage",
    "purchasing.reports.view",
    "reports.view_financial",
    ...ANALYTICS_PERMS,
    "crm.view",
    "crm.reports.view",
    "ai.access",
    "notifications.view",
    "timeline.view",
    "automation.view",
    "approvals.view",
    "approvals.approve",
    ...TASK_PERMS,
  ],

  cashier: [
    "organization.view",
    "clients.view",
    "clients.create",
    "invoices.view",
    "payments.view",
    "payments.create",
    "payments.receive",
    "payments.refund",
    "expenses.view",
    "inventory.view",
    "crm.view",
    "crm.contacts.manage",
    "notifications.view",
    "timeline.view",
    "pos.view",
    "pos.sales.create",
    "pos.sales.view",
    "pos.returns",
    "pos.shift.manage",
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
    "crm.view",
    "crm.leads.manage",
    "crm.contacts.manage",
    "crm.deals.manage",
    "crm.activities.manage",
    "crm.quotations.manage",
    "crm.reports.view",
    "crm.ai.access",
    "notifications.view",
    "timeline.view",
    "automation.view",
    ...TASK_PERMS,
    "pos.view",
    "pos.sales.create",
    "pos.sales.view",
    "pos.returns",
    "pos.shift.manage",
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
    "purchasing.requests.manage",
    "bookkeeping.view",
    "ai.access",
    "crm.view",
    "notifications.view",
    "timeline.view",
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "hr.view",
    "hr.ai.access",
    ...PAYROLL_VIEW_PERMS,
    "automation.view",
    "approvals.view",
    "integrations.view",
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
    "crm.view",
    "notifications.view",
    "timeline.view",
    "tasks.view",
    ...HR_VIEW_PERMS,
    ...PAYROLL_VIEW_PERMS,
    "automation.view",
    "approvals.view",
    "integrations.view",
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
