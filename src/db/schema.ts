import {
  pgTable,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// Enums
export const planEnum = pgEnum("plan", ["free", "pro", "business"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "viewed",
  "partial",
  "paid",
  "overdue",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "mpesa",
  "stripe",
  "cash",
  "bank_transfer",
  "other",
  "pesapal",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);
export const paymentLinkTypeEnum = pgEnum("payment_link_type", [
  "invoice",
  "deposit",
  "custom_amount",
  "subscription",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "cancelled",
  "incomplete",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
  "cancelled",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);

// Enterprise Analytics enums (Epic 9)
export const analyticsWidgetTypeEnum = pgEnum("analytics_widget_type", [
  "kpi_card",
  "line_chart",
  "bar_chart",
  "pie_chart",
  "table",
  "gauge",
  "progress",
  "heatmap",
  "ranking",
]);
export const analyticsPeriodEnum = pgEnum("analytics_period", [
  "today",
  "week",
  "month",
  "quarter",
  "year",
  "custom",
]);
export const reportFormatEnum = pgEnum("report_format", [
  "pdf",
  "excel",
  "csv",
  "json",
]);
export const scheduleFrequencyEnum = pgEnum("schedule_frequency", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);
export const scheduleStatusEnum = pgEnum("schedule_status", [
  "active",
  "paused",
  "completed",
  "failed",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "generating",
  "completed",
  "failed",
]);
export const analyticsInsightTypeEnum = pgEnum("analytics_insight_type", [
  "trend",
  "anomaly",
  "forecast",
  "recommendation",
  "alert",
]);

// Enterprise & Multi-Branch Management enums (Epic 10)
export const branchTypeEnum = pgEnum("branch_type", [
  "head_office",
  "retail",
  "warehouse",
  "office",
  "factory",
  "other",
]);

export const branchStatusEnum = pgEnum("branch_status", [
  "active",
  "inactive",
  "suspended",
  "closing",
]);

export const transferStatusEnum = pgEnum("transfer_status", [
  "draft",
  "pending",
  "in_transit",
  "received",
  "completed",
  "cancelled",
  "rejected",
]);

export const interBranchSaleStatusEnum = pgEnum("inter_branch_sale_status", [
  "draft",
  "pending",
  "approved",
  "completed",
  "cancelled",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Integration Hub enums (Epic 11)
// ─────────────────────────────────────────────────────────────────────────────

export const integrationCategoryEnum = pgEnum("integration_category", [
  "government",
  "payment",
  "email",
  "sms",
  "whatsapp",
  "push",
  "calendar",
  "accounting",
  "storage",
  "hardware",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "connected",
  "disconnected",
  "pending",
  "error",
  "expired",
]);

export const integrationAuthTypeEnum = pgEnum("integration_auth_type", [
  "oauth2",
  "api_key",
  "basic",
  "credentials",
  "none",
  "webhook",
]);

export const integrationHealthStatusEnum = pgEnum("integration_health_status", [
  "healthy",
  "degraded",
  "down",
  "unknown",
]);

export const integrationEventStatusEnum = pgEnum("integration_event_status", [
  "pending",
  "processing",
  "success",
  "failed",
  "retrying",
  "dead",
]);

// Inventory enums
export const inventoryItemTypeEnum = pgEnum("inventory_item_type", [
  "product",
  "service",
]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "purchase",
  "sale",
  "adjustment",
  "transfer",
  "return",
  "damage",
]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "ordered",
  "received",
  "cancelled",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Procurement enums (Epic 3)
// ─────────────────────────────────────────────────────────────────────────────

export const procurementRequestStatusEnum = pgEnum("procurement_request_status", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "ordered",
  "cancelled",
]);

export const rfqStatusEnum = pgEnum("rfq_status", [
  "draft",
  "sent",
  "closed",
  "cancelled",
]);

export const supplierQuotationStatusEnum = pgEnum("supplier_quotation_status", [
  "received",
  "accepted",
  "rejected",
  "expired",
]);

export const procurementPOStatusEnum = pgEnum("procurement_po_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
]);

export const grnStatusEnum = pgEnum("grn_status", [
  "draft",
  "completed",
]);

export const supplierReturnStatusEnum = pgEnum("supplier_return_status", [
  "draft",
  "completed",
  "cancelled",
]);

export const purchaseInvoiceStatusEnum = pgEnum("purchase_invoice_status", [
  "received",
  "partially_paid",
  "paid",
  "cancelled",
]);

export const supplierPaymentStatusEnum = pgEnum("supplier_payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const budgetPeriodEnum = pgEnum("budget_period", [
  "monthly",
  "quarterly",
  "annual",
]);

export const approvalLevelStatusEnum = pgEnum("approval_level_status", [
  "pending",
  "approved",
  "rejected",
  "skipped",
]);

export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "open",
  "dismissed",
  "applied",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Point of Sale (POS) enums (Epic 4)
// ─────────────────────────────────────────────────────────────────────────────

export const posOrderStatusEnum = pgEnum("pos_order_status", [
  "draft",
  "completed",
  "cancelled",
  "refunded",
]);
export const posPaymentStatusEnum = pgEnum("pos_payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);
export const posSessionStatusEnum = pgEnum("pos_session_status", [
  "open",
  "closed",
  "suspended",
]);
export const posReturnReasonEnum = pgEnum("pos_return_reason", [
  "damaged",
  "wrong_item",
  "customer_request",
  "expired",
  "other",
]);

// Bookkeeping enums
export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
]);
export const journalEntryStatusEnum = pgEnum("journal_entry_status", [
  "draft",
  "posted",
  "reversed",
]);

// eTIMS enums
export const etimsStatusEnum = pgEnum("etims_status", [
  "pending",
  "submitted",
  "validated",
  "failed",
  "cancelled",
]);

// Compliance Center enums
export const complianceHealthScoreEnum = pgEnum("compliance_health_score", [
  "excellent",
  "good",
  "fair",
  "poor",
]);
export const complianceAlertSeverityEnum = pgEnum("compliance_alert_severity", [
  "info",
  "warning",
  "critical",
]);
export const taxReportTypeEnum = pgEnum("tax_report_type", [
  "monthly",
  "quarterly",
  "annual",
]);

// AI Copilot enums
export const aiConversationStatusEnum = pgEnum("ai_conversation_status", [
  "active",
  "archived",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Enterprise CRM enums (Epic 2)
// ─────────────────────────────────────────────────────────────────────────────

export const leadSourceEnum = pgEnum("lead_source", [
  "website",
  "referral",
  "social_media",
  "cold_call",
  "email_campaign",
  "event",
  "partner",
  "advertisement",
  "other",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
  "lost",
]);

export const dealStatusEnum = pgEnum("deal_status", [
  "open",
  "won",
  "lost",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "meeting",
  "email",
  "task",
  "note",
  "follow_up",
]);

export const activityStatusEnum = pgEnum("activity_status", [
  "planned",
  "completed",
  "cancelled",
]);

export const quotationStatusEnum = pgEnum("quotation_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "converted",
]);

export const quotationApprovalStatusEnum = pgEnum("quotation_approval_status", [
  "not_required",
  "pending",
  "approved",
  "rejected",
]);

// Business Timeline enums
export const timelineEventTypeEnum = pgEnum("timeline_event_type", [
  "invoice.created",
  "invoice.updated",
  "invoice.deleted",
  "invoice.sent",
  "invoice.paid",
  "invoice.overdue",
  "payment.received",
  "payment.failed",
  "payment.refunded",
  "client.created",
  "client.updated",
  "client.deleted",
  "expense.created",
  "expense.updated",
  "expense.deleted",
  "inventory.stock_adjusted",
  "inventory.product_created",
  "inventory.product_updated",
  "inventory.low_stock",
  "journal.posted",
  "journal.reversed",
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
  "notification.created",
  "audit.logged",
  "compliance.submitted",
  "compliance.validated",
  "compliance.failed",
  "ai.insight_generated",
  "team.member_invited",
  "team.member_joined",
  "team.member_removed",
  "onboarding.step_completed",
  "crm.lead.created",
  "crm.lead.updated",
  "crm.lead.converted",
  "crm.company.created",
  "crm.company.updated",
  "crm.contact.created",
  "crm.deal.created",
  "crm.deal.updated",
  "crm.deal.won",
  "crm.deal.lost",
  "crm.quotation.created",
  "crm.quotation.converted",
  "crm.activity.completed",
  "procurement.request.created",
  "procurement.request.approved",
  "procurement.request.rejected",
  "procurement.rfq.created",
  "procurement.rfq.sent",
  "procurement.quotation.received",
  "procurement.quotation.accepted",
  "procurement.po.created",
  "procurement.po.submitted",
  "procurement.po.approved",
  "procurement.po.rejected",
  "procurement.po.ordered",
  "procurement.po.received",
  "procurement.grn.received",
  "procurement.return.created",
  "procurement.invoice.received",
  "procurement.payment.made",
  "procurement.budget.exceeded",
  "procurement.recommendation.created",
  "pos.sale.created",
  "pos.sale.completed",
  "pos.sale.cancelled",
  "pos.sale.refunded",
  "pos.shift.opened",
  "pos.shift.closed",
  "pos.payment.received",
  "hr.employee.created",
  "hr.employee.updated",
  "hr.employee.terminated",
  "hr.employee.resigned",
  "hr.department.created",
  "hr.department.updated",
  "hr.position.created",
  "hr.position.updated",
  "hr.attendance.recorded",
  "hr.leave.requested",
  "hr.leave.approved",
  "hr.leave.rejected",
  "hr.shift.assigned",
  "hr.applicant.created",
  "hr.applicant.hired",
  "hr.applicant.rejected",
  "hr.onboarding.started",
  "hr.onboarding.completed",
  "hr.offboarding.started",
  "hr.offboarding.completed",
  "hr.performance.review.completed",
  "hr.training.completed",
  "hr.contract.created",
  "hr.contract.expired",
  "payroll.period.created",
  "payroll.period.updated",
  "payroll.period.closed",
  "payroll.period.locked",
  "payroll.salary_structure.created",
  "payroll.salary_structure.updated",
  "payroll.assignment.created",
  "payroll.run.created",
  "payroll.run.processed",
  "payroll.run.approved",
  "payroll.run.rejected",
  "payroll.run.paid",
  "payroll.run.cancelled",
  "payroll.payslip.generated",
  "payroll.payslip.sent",
  "payroll.payment.exported",
  "payroll.journal.posted",
  "payroll.insight.generated",
  "automation.workflow.created",
  "automation.workflow.updated",
  "automation.workflow.deleted",
  "automation.workflow.run",
  "automation.workflow.failed",
  "automation.scheduled.run",
  "approval.workflow.created",
  "approval.requested",
  "approval.approved",
  "approval.rejected",
  "approval.escalated",
  "ai.forecast.generated",
  "ai.report.generated",
  "ai.document.generated",
  "ai.task.recommended",
  "ai.churn.predicted",
  "ai.nl_query.executed",
  "enterprise.branch.created",
  "enterprise.branch.updated",
  "enterprise.branch.deleted",
  "enterprise.branch.set_default",
  "enterprise.branch_member.added",
  "enterprise.transfer.created",
  "enterprise.transfer.in_transit",
  "enterprise.transfer.received",
  "enterprise.transfer.completed",
  "enterprise.transfer.cancelled",
  "enterprise.inter_branch_sale.created",
  "enterprise.sale.created",
  "enterprise.sale.approved",
  "enterprise.sale.completed",
  "enterprise.inter_branch_sale.approved",
  "enterprise.inter_branch_sale.completed",
  "enterprise.inter_branch_sale.cancelled",
  "enterprise.procurement.created",
  "enterprise.procurement.approved",
  "enterprise.procurement.received",
  "enterprise.branch.approval.requested",
  "enterprise.branch.approval.approved",
  "enterprise.branch.approval.rejected",
  "enterprise.approval_request.created",
  "enterprise.approval_request.approved",
  "enterprise.approval_request.rejected",
  "enterprise.ai.insight.generated",
  "integration.connected",
  "integration.disconnected",
  "integration.updated",
  "integration.sync.started",
  "integration.sync.completed",
  "integration.sync.failed",
  "integration.message.sent",
  "integration.message.failed",
  "integration.webhook.received",
  "integration.health.degraded",
  "integration.token.refreshed",
  "integration.marketplace.installed",
  "integration.ai.insights.generated",
  "integration.error",
]);

// Onboarding enums
export const onboardingStepStatusEnum = pgEnum("onboarding_step_status", [
  "pending",
  "completed",
  "skipped",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Compliance Center tables
// ─────────────────────────────────────────────────────────────────────────────

export const complianceAlerts = pgTable("compliance_alerts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  severity: complianceAlertSeverityEnum("severity").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  read: boolean("read").default(false).notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("compliance_alerts_org_idx").on(table.organizationId),
  userIdx: index("compliance_alerts_user_idx").on(table.userId),
}));

export const taxReports = pgTable("tax_reports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  type: taxReportTypeEnum("type").notNull(),
  periodStart: timestamp("period_start", { mode: "date" }).notNull(),
  periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
  totalTax: decimal("total_tax", { precision: 12, scale: 2 }).default("0"),
  invoiceCount: integer("invoice_count").default(0),
  status: text("status").default("draft").notNull(),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("tax_reports_org_idx").on(table.organizationId),
  userIdx: index("tax_reports_user_idx").on(table.userId),
}));

export const taxCalendar = pgTable("tax_calendar", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { mode: "date" }).notNull(),
  type: text("type").notNull(),
  recurring: boolean("recurring").default(false).notNull(),
  completed: boolean("completed").default(false).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("tax_calendar_org_idx").on(table.organizationId),
}));

export const complianceSettings = pgTable("compliance_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  autoSubmit: boolean("auto_submit").default(false).notNull(),
  notifyBeforeDeadline: boolean("notify_before_deadline").default(true).notNull(),
  notifyOnFailure: boolean("notify_on_failure").default(true).notNull(),
  retryFailedSubmissions: boolean("retry_failed_submissions").default(true).notNull(),
  maxRetries: integer("max_retries").default(3),
  retryDelayMinutes: integer("retry_delay_minutes").default(30),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Business Copilot tables
// ─────────────────────────────────────────────────────────────────────────────

export const aiConversations = pgTable("ai_conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  title: text("title"),
  status: aiConversationStatusEnum("status").default("active").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_conversations_org_idx").on(table.organizationId),
  userIdx: index("ai_conversations_user_idx").on(table.userId),
}));

export const aiMessages = pgTable("ai_messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used"),
  model: text("model"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index("ai_messages_conversation_idx").on(table.conversationId),
  orgIdx: index("ai_messages_org_idx").on(table.organizationId),
}));

export const aiInsights = pgTable("ai_insights", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("normal").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  read: boolean("read").default(false).notNull(),
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_insights_org_idx").on(table.organizationId),
  userIdx: index("ai_insights_user_idx").on(table.userId),
}));

export const aiBusinessHealth = pgTable("ai_business_health", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  score: integer("score").notNull(),
  cashFlowScore: integer("cash_flow_score"),
  revenueScore: integer("revenue_score"),
  expenseScore: integer("expense_score"),
  clientScore: integer("client_score"),
  inventoryScore: integer("inventory_score"),
  complianceScore: integer("compliance_score"),
  insights: jsonb("insights").$type<Record<string, unknown>>().default({}),
  calculatedAt: timestamp("calculated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_business_health_org_idx").on(table.organizationId),
  userIdx: index("ai_business_health_user_idx").on(table.userId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// AI & Automation Platform (Epic 8)
// ─────────────────────────────────────────────────────────────────────────────
// Workflow automation, approval workflows and AI forecasting/insights. Every
// table is multi-tenant (carries `organizationId`) and RBAC-gated. All runs are
// audited and emit Business Timeline events.

export const automationTriggerTypeEnum = pgEnum("automation_trigger_type", [
  "event",
  "schedule",
  "manual",
]);

export const automationStatusEnum = pgEnum("automation_status", [
  "draft",
  "active",
  "paused",
  "error",
]);

export const automationRunStatusEnum = pgEnum("automation_run_status", [
  "pending",
  "running",
  "success",
  "partial",
  "failed",
  "skipped",
]);

export const automationActionTypeEnum = pgEnum("automation_action_type", [
  "notify",
  "create_task",
  "create_invoice",
  "create_quotation",
  "create_purchase_order",
  "send_email",
  "create_timeline_event",
  "update_record",
  "webhook",
  "ai_insight",
  "ai_summarize",
  "approval_request",
  "delay",
]);

export const forecastTypeEnum = pgEnum("forecast_type", [
  "revenue",
  "cash_flow",
  "inventory",
  "churn",
  "sales",
]);

export const aiReportTypeEnum = pgEnum("ai_report_type", [
  "financial_summary",
  "profit_loss",
  "cash_flow",
  "tax_readiness",
  "custom",
]);

export const aiDocumentTypeEnum = pgEnum("ai_document_type", [
  "invoice",
  "quotation",
  "purchase_order",
]);

export const aiDocumentStatusEnum = pgEnum("ai_document_status", [
  "draft",
  "reviewed",
  "created",
  "rejected",
]);

export const aiTaskStatusEnum = pgEnum("ai_task_status", [
  "open",
  "accepted",
  "dismissed",
  "completed",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "escalated",
]);

export const churnRiskEnum = pgEnum("churn_risk", [
  "low",
  "medium",
  "high",
]);

/**
 * A workflow definition: one trigger + an ordered list of actions
 * (`automation_actions`). Triggers can be a business event, a cron schedule,
 * or manual invocation.
 */
export const automationWorkflows = pgTable("automation_workflows", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: automationStatusEnum("status").default("draft").notNull(),
  triggerType: automationTriggerTypeEnum("trigger_type").notNull(),
  // { event?: string, cron?: string, timezone?: string }
  triggerConfig: jsonb("trigger_config").$type<Record<string, unknown>>().default({}),
  // Top-level conditions (AND/OR groups) evaluated before the actions run.
  conditions: jsonb("conditions").$type<Record<string, unknown>>().default({}),
  version: integer("version").default(1).notNull(),
  runCount: integer("run_count").default(0).notNull(),
  lastRunAt: timestamp("last_run_at", { mode: "date" }),
  lastRunStatus: automationRunStatusEnum("last_run_status"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("automation_workflows_org_idx").on(table.organizationId),
  userIdx: index("automation_workflows_user_idx").on(table.userId),
  statusIdx: index("automation_workflows_status_idx").on(table.status),
  triggerIdx: index("automation_workflows_trigger_idx").on(table.triggerType),
}));

/** An ordered action within a workflow (the Trigger → Action builder's steps). */
export const automationActions = pgTable("automation_actions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => automationWorkflows.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  type: automationActionTypeEnum("type").notNull(),
  name: text("name"),
  // Action-specific parameters (recipients, template, target, payload, ...).
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  // Optional per-action conditions.
  conditions: jsonb("conditions").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: index("automation_actions_workflow_idx").on(table.workflowId),
  orgIdx: index("automation_actions_org_idx").on(table.organizationId),
}));

/** A single execution of a workflow. */
export const automationRuns = pgTable("automation_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => automationWorkflows.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  triggerType: automationTriggerTypeEnum("trigger_type").notNull(),
  triggerEvent: jsonb("trigger_event").$type<Record<string, unknown>>().default({}),
  status: automationRunStatusEnum("status").default("pending").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { mode: "date" }),
  error: text("error"),
  actionsTotal: integer("actions_total").default(0),
  actionsSucceeded: integer("actions_succeeded").default(0),
  actionsFailed: integer("actions_failed").default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: index("automation_runs_workflow_idx").on(table.workflowId),
  orgIdx: index("automation_runs_org_idx").on(table.organizationId),
  statusIdx: index("automation_runs_status_idx").on(table.status),
  createdIdx: index("automation_runs_created_idx").on(table.createdAt),
}));

/** Per-action log within a run (full audit of every automation step). */
export const automationRunLogs = pgTable("automation_run_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  runId: text("run_id")
    .notNull()
    .references(() => automationRuns.id, { onDelete: "cascade" }),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => automationWorkflows.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  actionId: text("action_id"),
  order: integer("order").notNull().default(0),
  actionType: automationActionTypeEnum("action_type"),
  status: automationRunStatusEnum("status").default("pending").notNull(),
  input: jsonb("input").$type<Record<string, unknown>>().default({}),
  output: jsonb("output").$type<Record<string, unknown>>().default({}),
  error: text("error"),
  startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  runIdx: index("automation_run_logs_run_idx").on(table.runId),
  orgIdx: index("automation_run_logs_org_idx").on(table.organizationId),
}));

/** Approval workflow definition (ordered approver steps per resource type). */
export const approvalWorkflows = pgTable("approval_workflows", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  // invoice | quotation | purchase_order | expense | payroll_run | procurement_request | inventory_adjustment
  resourceType: text("resource_type").notNull(),
  // [{ order, label, approverRole, approverUserId? }]
  steps: jsonb("steps").$type<Record<string, unknown>[]>().default([]),
  isDefault: boolean("is_default").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("approval_workflows_org_idx").on(table.organizationId),
  resourceIdx: index("approval_workflows_resource_idx").on(table.resourceType),
}));

/** An approval request instance routed through an `approval_workflows`. */
export const approvalRequests = pgTable("approval_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  approvalWorkflowId: text("approval_workflow_id").references(() => approvalWorkflows.id, {
    onDelete: "set null",
  }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  title: text("title").notNull(),
  status: approvalStatusEnum("status").default("pending").notNull(),
  currentStep: integer("current_step").default(0).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("approval_requests_org_idx").on(table.organizationId),
  resourceIdx: index("approval_requests_resource_idx").on(table.resourceType, table.resourceId),
  statusIdx: index("approval_requests_status_idx").on(table.status),
}));

/** Per-step decision records for an approval request. */
export const approvalSteps = pgTable("approval_steps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  approvalRequestId: text("approval_request_id")
    .notNull()
    .references(() => approvalRequests.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  label: text("label"),
  approverRole: text("approver_role"),
  approverUserId: text("approver_user_id"),
  status: approvalStatusEnum("status").default("pending").notNull(),
  decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { mode: "date" }),
  comment: text("comment"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  requestIdx: index("approval_steps_request_idx").on(table.approvalRequestId),
  orgIdx: index("approval_steps_org_idx").on(table.organizationId),
}));

/** Stored AI forecasts (revenue, cash flow, inventory, churn, sales). */
export const aiForecasts = pgTable("ai_forecasts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: forecastTypeEnum("type").notNull(),
  model: text("model").default("rules").notNull(),
  horizonDays: integer("horizon_days"),
  periodStart: timestamp("period_start", { mode: "date" }),
  periodEnd: timestamp("period_end", { mode: "date" }),
  // [{ date, value, lower?, upper? }]
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  confidence: integer("confidence"),
  summary: text("summary"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_forecasts_org_idx").on(table.organizationId),
  typeIdx: index("ai_forecasts_type_idx").on(table.type),
  createdIdx: index("ai_forecasts_created_idx").on(table.createdAt),
}));

/** AI-generated financial / business reports. */
export const aiReports = pgTable("ai_reports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: aiReportTypeEnum("type").notNull(),
  title: text("title").notNull(),
  periodStart: timestamp("period_start", { mode: "date" }),
  periodEnd: timestamp("period_end", { mode: "date" }),
  content: jsonb("content").$type<Record<string, unknown>>().default({}),
  narrative: text("narrative"),
  model: text("model").default("rules").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_reports_org_idx").on(table.organizationId),
  typeIdx: index("ai_reports_type_idx").on(table.type),
}));

/** AI-generated invoice/quotation/purchase-order drafts awaiting review. */
export const aiDocuments = pgTable("ai_documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  documentType: aiDocumentTypeEnum("document_type").notNull(),
  status: aiDocumentStatusEnum("status").default("draft").notNull(),
  title: text("title"),
  // Ready-to-create payload for the target record.
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  rationale: text("rationale"),
  createdResourceId: text("created_resource_id"),
  createdResourceType: text("created_resource_type"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_documents_org_idx").on(table.organizationId),
  typeIdx: index("ai_documents_type_idx").on(table.documentType),
  statusIdx: index("ai_documents_status_idx").on(table.status),
}));

/** AI task recommendations surfaced to users. */
export const aiTaskRecommendations = pgTable("ai_task_recommendations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  dueDate: timestamp("due_date", { mode: "date" }),
  category: text("category").default("follow_up"),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  status: aiTaskStatusEnum("status").default("open").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_task_recommendations_org_idx").on(table.organizationId),
  userIdx: index("ai_task_recommendations_user_idx").on(table.userId),
  statusIdx: index("ai_task_recommendations_status_idx").on(table.status),
}));

/** Natural-language business query log. */
export const aiQueryLogs = pgTable("ai_query_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  intent: text("intent"),
  entities: jsonb("entities").$type<Record<string, unknown>>().default({}),
  plan: jsonb("plan").$type<Record<string, unknown> | unknown[]>().default({}),
  answer: text("answer"),
  model: text("model").default("rules").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_query_logs_org_idx").on(table.organizationId),
  createdIdx: index("ai_query_logs_created_idx").on(table.createdAt),
}));

/** Customer churn predictions (clients, CRM companies, leads). */
export const aiChurnPredictions = pgTable("ai_churn_predictions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerType: text("customer_type").notNull(),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name"),
  risk: churnRiskEnum("risk").default("low").notNull(),
  score: integer("score").default(0).notNull(),
  factors: jsonb("factors").$type<string[]>().default([]),
  recommendedAction: text("recommended_action"),
  predictedAt: timestamp("predicted_at", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_churn_predictions_org_idx").on(table.organizationId),
  customerIdx: uniqueIndex("unique_org_customer_churn").on(
    table.organizationId,
    table.customerType,
    table.customerId
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Business Timeline table
// ─────────────────────────────────────────────────────────────────────────────

export const businessTimeline = pgTable("business_timeline", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  eventType: timelineEventTypeEnum("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("business_timeline_org_idx").on(table.organizationId),
  userIdx: index("business_timeline_user_idx").on(table.userId),
  eventTypeIdx: index("business_timeline_event_type_idx").on(table.eventType),
  createdIdx: index("business_timeline_created_idx").on(table.createdAt),
}));

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE — POINT OF SALE (POS) (Epic 4)
// ─────────────────────────────────────────────────────────────────────────────
// Every POS table is multi-tenant: it carries `organizationId` and user-scoped
// ownership. Cross-references to products/clients/invoices are scoped so a
// tenant can never read or mutate another tenant's POS data. All mutations are
// gated by RBAC, audited, and emit Business Timeline events.

export const posSessions = pgTable("pos_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  terminalName: text("terminal_name").default("Default Terminal"),
  status: posSessionStatusEnum("status").notNull().default("open"),
  openingFloat: decimal("opening_float", { precision: 12, scale: 2 }).notNull().default("0"),
  closingFloat: decimal("closing_float", { precision: 12, scale: 2 }),
  cashDeposited: decimal("cash_deposited", { precision: 12, scale: 2 }),
  notes: text("notes"),
  openedAt: timestamp("opened_at", { mode: "date" }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("pos_sessions_org_idx").on(table.organizationId),
  userIdx: index("pos_sessions_user_idx").on(table.userId),
  statusIdx: index("pos_sessions_status_idx").on(table.status),
  createdIdx: index("pos_sessions_created_idx").on(table.createdAt),
}));

export const posOrders = pgTable("pos_orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => posSessions.id, {
    onDelete: "set null",
  }),
  clientId: text("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  warehouseId: text("warehouse_id").references(() => inventoryWarehouses.id, {
    onDelete: "set null",
  }),
  orderNumber: text("order_number").notNull(),
  status: posOrderStatusEnum("status").notNull().default("draft"),
  currency: text("currency").notNull().default("KES"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("16"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  changeDue: decimal("change_due", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method"),
  paymentStatus: posPaymentStatusEnum("payment_status").notNull().default("pending"),
  notes: text("notes"),
  invoiceId: text("invoice_id").references(() => invoices.id, {
    onDelete: "set null",
  }),
  etimsStatus: etimsStatusEnum("etims_status").default("pending"),
  etimsInvoiceNumber: text("etims_invoice_number"),
  completedAt: timestamp("completed_at", { mode: "date" }),
  cancelledAt: timestamp("cancelled_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("pos_orders_org_idx").on(table.organizationId),
  userIdx: index("pos_orders_user_idx").on(table.userId),
  sessionIdx: index("pos_orders_session_idx").on(table.sessionId),
  orderNumberIdx: uniqueIndex("pos_orders_order_number_idx").on(table.orderNumber, table.organizationId),
  statusIdx: index("pos_orders_status_idx").on(table.status),
  createdIdx: index("pos_orders_created_idx").on(table.createdAt),
}));

export const posOrderItems = pgTable("pos_order_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => posOrders.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => inventoryProducts.id, { onDelete: "restrict" }),
  warehouseId: text("warehouse_id").references(() => inventoryWarehouses.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("16"),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("pos_order_items_org_idx").on(table.organizationId),
  orderIdx: index("pos_order_items_order_idx").on(table.orderId),
  productIdx: index("pos_order_items_product_idx").on(table.productId),
}));

export const posOrderPayments = pgTable("pos_order_payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => posOrders.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").notNull(),
  reference: text("reference"),
  phoneNumber: text("phone_number"),
  notes: text("notes"),
  status: posPaymentStatusEnum("status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  providerMetadata: jsonb("provider_metadata").$type<Record<string, unknown>>().default({}),
  paidAt: timestamp("paid_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("pos_order_payments_org_idx").on(table.organizationId),
  orderIdx: index("pos_order_payments_order_idx").on(table.orderId),
  statusIdx: index("pos_order_payments_status_idx").on(table.status),
}));

export const posReturns = pgTable("pos_returns", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => posOrders.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  returnNumber: text("return_number").notNull(),
  reason: posReturnReasonEnum("reason").notNull(),
  description: text("description"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  refundMethod: text("refund_method").notNull(),
  refundStatus: posPaymentStatusEnum("refund_status").notNull().default("pending"),
  refundReference: text("refund_reference"),
  processedAt: timestamp("processed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("pos_returns_org_idx").on(table.organizationId),
  orderIdx: index("pos_returns_order_idx").on(table.orderId),
  userIdx: index("pos_returns_user_idx").on(table.userId),
  returnNumberIdx: uniqueIndex("pos_returns_return_number_idx").on(table.returnNumber, table.organizationId),
}));

export const posReturnItems = pgTable("pos_return_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  returnId: text("return_id")
    .notNull()
    .references(() => posReturns.id, { onDelete: "cascade" }),
  orderItemId: text("order_item_id").references(() => posOrderItems.id, {
    onDelete: "set null",
  }),
  productId: text("product_id")
    .notNull()
    .references(() => inventoryProducts.id, { onDelete: "restrict" }),
  warehouseId: text("warehouse_id").references(() => inventoryWarehouses.id, {
    onDelete: "set null",
  }),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  returnIdx: index("pos_return_items_return_idx").on(table.returnId),
  productIdx: index("pos_return_items_product_idx").on(table.productId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE — ENTERPRISE CRM (Epic 2)
// ─────────────────────────────────────────────────────────────────────────────
// Every CRM table is multi-tenant: it carries `organizationId` and user-scoped
// ownership. Cross-references to leads/contacts/companies/deals are scoped so a
// tenant can never read or mutate another tenant's CRM data. All mutations are
// gated by RBAC, audited, and emit Business Timeline events.

// Companies (accounts) — the anchor of the B2B CRM graph.
export const crmCompanies = pgTable("crm_companies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  industry: text("industry"),
  size: text("size"),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Kenya"),
  taxId: text("tax_id"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("crm_companies_org_idx").on(table.organizationId),
  userIdx: index("crm_companies_user_idx").on(table.userId),
}));

// Contact persons — multiple per company, plus free-standing (companyless) contacts.
export const crmContacts = pgTable("crm_contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  companyId: text("company_id").references(() => crmCompanies.id, {
    onDelete: "set null",
  }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  jobTitle: text("job_title"),
  department: text("department"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("crm_contacts_org_idx").on(table.organizationId),
  userIdx: index("crm_contacts_user_idx").on(table.userId),
  companyIdx: index("crm_contacts_company_idx").on(table.companyId),
}));

// @ts-ignore
// Leads — captured prospects with scoring, qualification and conversion.
export let crmLeads = pgTable("crm_leads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  source: leadSourceEnum("source").default("other").notNull(),
  status: leadStatusEnum("status").default("new").notNull(),
  score: integer("score").default(0).notNull(),
  scoreReasons: jsonb("score_reasons").$type<string[]>().default([]),
  estimatedValue: decimal("estimated_value", { precision: 12, scale: 2 }).default("0"),
  qualificationNotes: text("qualification_notes"),
  assignedTo: text("assigned_to").references(() => users.id, {
    onDelete: "set null",
  }),
  // Conversion outcome — set when the lead becomes a company/contact/deal.
  convertedAt: timestamp("converted_at", { mode: "date" }),
  convertedCompanyId: text("converted_company_id").references(() => crmCompanies.id, {
    onDelete: "set null",
  }),
  convertedContactId: text("converted_contact_id").references(() => crmContacts.id, {
    onDelete: "set null",
  }),
  // @ts-ignore
  convertedDealId: text("converted_deal_id").references(() => crmDeals.id, {
    onDelete: "set null",
  }),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("crm_leads_org_idx").on(table.organizationId),
  userIdx: index("crm_leads_user_idx").on(table.userId),
  statusIdx: index("crm_leads_status_idx").on(table.status),
  scoreIdx: index("crm_leads_score_idx").on(table.score),
  assignedIdx: index("crm_leads_assigned_idx").on(table.assignedTo),
})) as any;

// Custom pipeline stages (per-tenant ordered stages for the sales Kanban).
export const crmPipelineStages = pgTable("crm_pipeline_stages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  // Default win probability for deals sitting in this stage.
  probability: integer("probability").default(0),
  color: text("color").default("#16a34a"),
  isDefault: boolean("is_default").default(false).notNull(),
  // Exactly one terminal "won" and one terminal "lost" stage drive win/loss.
  isWon: boolean("is_won").default(false).notNull(),
  isLost: boolean("is_lost").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("crm_pipeline_stages_org_idx").on(table.organizationId),
  orderIdx: index("crm_pipeline_stages_order_idx").on(table.organizationId, table.order),
}));

// Deals / opportunities in the sales pipeline.
export const crmDeals = pgTable("crm_deals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  companyId: text("company_id").references(() => crmCompanies.id, {
    onDelete: "set null",
  }),
  contactId: text("contact_id").references(() => crmContacts.id, {
    onDelete: "set null",
  }),
  leadId: text("lead_id").references(() => crmLeads.id, {
    onDelete: "set null",
  }),
  stageId: text("stage_id").references(() => crmPipelineStages.id, {
    onDelete: "set null",
  }),
  amount: decimal("amount", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").default("KES").notNull(),
  // Probability 0-100; falls back to the stage default when null.
  probability: integer("probability"),
  expectedCloseDate: timestamp("expected_close_date", { mode: "date" }),
  status: dealStatusEnum("status").default("open").notNull(),
  actualCloseDate: timestamp("actual_close_date", { mode: "date" }),
  lostReason: text("lost_reason"),
  ownerId: text("owner_id").references(() => users.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("crm_deals_org_idx").on(table.organizationId),
  userIdx: index("crm_deals_user_idx").on(table.userId),
  stageIdx: index("crm_deals_stage_idx").on(table.stageId),
  statusIdx: index("crm_deals_status_idx").on(table.status),
  ownerIdx: index("crm_deals_owner_idx").on(table.ownerId),
  companyIdx: index("crm_deals_company_idx").on(table.companyId),
}));

// Activities (calls, meetings, emails, tasks, notes, follow-ups) — optionally
// linked to a lead/contact/company/deal. Supports reminders and due dates.
export const crmActivities = pgTable("crm_activities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: activityTypeEnum("type").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  status: activityStatusEnum("status").default("planned").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  dueDate: timestamp("due_date", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  // When to surface a reminder notification (optional).
  remindAt: timestamp("remind_at", { mode: "date" }),
  assignedTo: text("assigned_to").references(() => users.id, {
    onDelete: "set null",
  }),
  leadId: text("lead_id").references(() => crmLeads.id, { onDelete: "set null" }),
  contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
  companyId: text("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
  dealId: text("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("crm_activities_org_idx").on(table.organizationId),
  userIdx: index("crm_activities_user_idx").on(table.userId),
  typeIdx: index("crm_activities_type_idx").on(table.type),
  dueIdx: index("crm_activities_due_idx").on(table.dueDate),
  remindIdx: index("crm_activities_remind_idx").on(table.remindAt),
}));

// @ts-ignore
// Quotations (estimates) — can be versioned and converted to invoices.
export let crmQuotations = pgTable("crm_quotations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  quotationNumber: text("quotation_number").notNull(),
  companyId: text("company_id").references(() => crmCompanies.id, {
    onDelete: "set null",
  }),
  contactId: text("contact_id").references(() => crmContacts.id, {
    onDelete: "set null",
  }),
  leadId: text("lead_id").references(() => crmLeads.id, {
    onDelete: "set null",
  }),
  dealId: text("deal_id").references(() => crmDeals.id, {
    onDelete: "set null",
  }),
  status: quotationStatusEnum("status").default("draft").notNull(),
  // Version history: each revision bumps `version` and links to its parent.
  version: integer("version").default(1).notNull(),
  // @ts-ignore
  parentQuotationId: text("parent_quotation_id").references(() => crmQuotations.id, {
    onDelete: "set null",
  }),
  validUntil: timestamp("valid_until", { mode: "date" }),
  currency: text("currency").default("KES").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  terms: text("terms"),
  // Approval workflow.
  approvalStatus: quotationApprovalStatusEnum("approval_status")
    .default("not_required")
    .notNull(),
  approvedBy: text("approved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  // Set once the quotation is converted into a KaziFlow invoice.
  convertedInvoiceId: text("converted_invoice_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("crm_quotations_org_idx").on(table.organizationId),
  userIdx: index("crm_quotations_user_idx").on(table.userId),
  numberIdx: uniqueIndex("unique_org_quotation_number").on(
    table.organizationId,
    table.quotationNumber
  ),
  statusIdx: index("crm_quotations_status_idx").on(table.status),
  companyIdx: index("crm_quotations_company_idx").on(table.companyId),
}));
export const crmQuotationsAny = crmQuotations as any;

export const crmQuotationItems = pgTable("crm_quotation_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  quotationId: text("quotation_id")
    .notNull()
    .references(() => crmQuotations.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
}, (table) => ({
  orgIdx: index("crm_quotation_items_org_idx").on(table.organizationId),
  quotationIdx: index("crm_quotation_items_quotation_idx").on(table.quotationId),
}));

// AI-generated CRM insights (cached recommendations per resource).
export const crmAiInsights = pgTable("crm_ai_insights", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // lead_priority, deal_success, follow_up, summary, upsell, inactive
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("normal").notNull(),
  resourceType: text("resource_type"), // lead | deal | contact | company
  resourceId: text("resource_id"),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("crm_ai_insights_org_idx").on(table.organizationId),
  userIdx: index("crm_ai_insights_user_idx").on(table.userId),
  typeIdx: index("crm_ai_insights_type_idx").on(table.type),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Guided Onboarding tables
// ─────────────────────────────────────────────────────────────────────────────

export const onboardingSteps = pgTable("onboarding_steps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  route: text("route").notNull(),
  order: integer("order").notNull(),
  required: boolean("required").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const onboardingProgress = pgTable("onboarding_progress", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  stepId: text("step_id")
    .notNull()
    .references(() => onboardingSteps.id, { onDelete: "cascade" }),
  status: onboardingStepStatusEnum("status").default("pending").notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userStepIdx: uniqueIndex("unique_user_step").on(table.userId, table.stepId),
  orgIdx: index("onboarding_progress_org_idx").on(table.organizationId),
}));

export const onboardingTips = pgTable("onboarding_tips", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  stepId: text("step_id").references(() => onboardingSteps.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  position: text("position").default("bottom").notNull(),
  order: integer("order").default(0).notNull(),
}, (table) => ({
  stepIdx: index("onboarding_tips_step_idx").on(table.stepId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

// RBAC system roles
export const roleTypeEnum = pgEnum("role_type", [
  "owner",
  "administrator",
  "manager",
  "accountant",
  "inventory_manager",
  "cashier",
  "sales_representative",
  "employee",
  "viewer",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "invited",
  "active",
  "suspended",
]);

export const permissionCategoryEnum = pgEnum("permission_category", [
  "organization",
  "clients",
  "invoices",
  "payments",
  "expenses",
  "inventory",
  "purchasing",
  "bookkeeping",
  "reports",
  "compliance",
  "integrations",
  "ai",
  "team",
  "roles",
  "api",
  "audit",
  "notifications",
  "settings",
  "subscription",
  "crm",
  "payroll",
  "enterprise",
]);

// Audit logging
export const auditCategoryEnum = pgEnum("audit_category", [
  "auth",
  "organization",
  "clients",
  "invoices",
  "payments",
  "expenses",
  "inventory",
  "purchasing",
  "bookkeeping",
  "reports",
  "compliance",
  "integrations",
  "ai",
  "team",
  "roles",
  "api",
  "subscription",
  "settings",
  "notifications",
  "tasks",
  "crm",
  "pos",
  "hr",
  "payroll",
  "enterprise",
]);

// Notifications
export const notificationCategoryEnum = pgEnum("notification_category", [
  "inventory",
  "finance",
  "invoices",
  "payments",
  "compliance",
  "security",
  "subscriptions",
  "ai",
  "system",
  "organization",
  "crm",
  "pos",
  "hr",
  "payroll",
  "enterprise",
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

// Public API
export const apiKeyStatusEnum = pgEnum("api_key_status", [
  "active",
  "inactive",
  "revoked",
]);

// NextAuth tables
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  plan: planEnum("plan").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// Business profile
export const businesses = pgTable("businesses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  type: text("type"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city").default("Nairobi"),
  country: text("country").default("Kenya"),
  currency: text("currency").default("KES").notNull(),
  taxId: text("tax_id"),
  logo: text("logo"),
  mpesaTill: text("mpesa_till"),
  mpesaPaybill: text("mpesa_paybill"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// Clients
export const clients = pgTable("clients", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("clients_org_idx").on(table.organizationId),
  userIdx: index("clients_user_idx").on(table.userId),
}));

// Client communication log
export const clientLogs = pgTable("client_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(), // email, call, meeting, note
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// Invoices
export const invoices = pgTable(
  "invoices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    invoiceNumber: text("invoice_number").notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    issueDate: timestamp("issue_date", { mode: "date" }).notNull(),
    dueDate: timestamp("due_date", { mode: "date" }).notNull(),
    currency: text("currency").default("KES").notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0"),
    notes: text("notes"),
    terms: text("terms"),
    sentAt: timestamp("sent_at", { mode: "date" }),
    paidAt: timestamp("paid_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (invoices) => [
    uniqueIndex("unique_org_invoice_number").on(invoices.organizationId, invoices.invoiceNumber),
    index("invoices_org_status_idx").on(invoices.organizationId, invoices.status),
  ]
);

export const invoiceItems = pgTable("invoice_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

// Payments
export const payments = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  invoiceId: text("invoice_id").references(() => invoices.id, {
    onDelete: "set null",
  }),
  clientId: text("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("KES").notNull(),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  reference: text("reference"),
  mpesaReceipt: text("mpesa_receipt"),
  mpesaPhone: text("mpesa_phone"),
  stripePaymentId: text("stripe_payment_id"),
  providerPaymentId: text("provider_payment_id"),
  providerStatus: text("provider_status"),
  providerMetadata: jsonb("provider_metadata").$type<Record<string, unknown>>(),
  notes: text("notes"),
  paidAt: timestamp("paid_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("payments_org_idx").on(table.organizationId),
  referenceIdx: index("payments_reference_idx").on(table.reference),
  orgStatusIdx: index("payments_org_status_idx").on(table.organizationId, table.status),
}));

// Payment Providers Configuration
export const paymentProviderConfigs = pgTable("payment_provider_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  webhookSecret: text("webhook_secret"),
  shortcode: text("shortcode"),
  passkey: text("passkey"),
  callbackUrl: text("callback_url"),
  environment: text("environment").default("sandbox").notNull(),
  merchantId: text("merchant_id"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgProviderIdx: uniqueIndex("unique_org_provider").on(table.organizationId, table.provider),
}));

// Payment Links
export const paymentLinks = pgTable("payment_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: paymentLinkTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("KES").notNull(),
  description: text("description"),
  invoiceId: text("invoice_id").references(() => invoices.id, {
    onDelete: "set null",
  }),
  clientId: text("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  provider: text("provider").default("mpesa").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  slug: text("slug").notNull().unique(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  provider: text("provider").default("stripe").notNull(),
  providerSubscriptionId: text("provider_subscription_id"),
  currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
  currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  trialEnd: timestamp("trial_end", { mode: "date" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// Payment Transactions Log
export const paymentTransactions = pgTable("payment_transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  provider: text("provider").notNull(),
  providerTransactionId: text("provider_transaction_id"),
  type: text("type").notNull(),
  status: text("status").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  currency: text("currency"),
  rawRequest: jsonb("raw_request").$type<Record<string, unknown>>(),
  rawResponse: jsonb("raw_response").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// Payment Webhooks Log
export const paymentWebhookLogs = pgTable("payment_webhook_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  signature: text("signature"),
  dedupeKey: text("dedupe_key"),
  processed: boolean("processed").default(false).notNull(),
  error: text("error"),
  receivedAt: timestamp("received_at", { mode: "date" }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { mode: "date" }),
}, (table) => ({
  dedupeKeyIdx: uniqueIndex("payment_webhook_logs_dedupe_key_idx").on(table.dedupeKey),
}));

// Expenses
export const expenses = pgTable("expenses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("KES").notNull(),
  date: timestamp("date", { mode: "date" }).notNull(),
  receipt: text("receipt"),
  taxDeductible: boolean("tax_deductible").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("expenses_org_idx").on(table.organizationId),
  userIdx: index("expenses_user_idx").on(table.userId),
}));

// Projects & Tasks
export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  clientId: text("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("todo").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  dueDate: timestamp("due_date", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("tasks_org_idx").on(table.organizationId),
  userIdx: index("tasks_user_idx").on(table.userId),
}));

// Usage tracking for freemium limits
export const usageRecords = pgTable("usage_records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  month: text("month").notNull(), // YYYY-MM
  invoicesCreated: integer("invoices_created").default(0).notNull(),
  aiRequests: integer("ai_requests").default(0).notNull(),
});

// Inventory tables
export const inventoryCategories = pgTable("inventory_categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  type: inventoryItemTypeEnum("type").default("product").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const inventoryBrands = pgTable("inventory_brands", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const inventorySuppliers = pgTable("inventory_suppliers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Kenya"),
  taxId: text("tax_id"),
  category: text("category"),
  notes: text("notes"),
  // Commercial terms
  paymentTerms: text("payment_terms"),
  leadTimeDays: integer("lead_time_days"),
  preferredCurrency: text("preferred_currency").default("KES"),
  // Banking for payments
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  // Performance / quality
  rating: integer("rating"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("inventory_suppliers_org_idx").on(table.organizationId),
}));

export const inventoryWarehouses = pgTable("inventory_warehouses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  location: text("location"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const inventoryProducts = pgTable("inventory_products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  categoryId: text("category_id").references(() => inventoryCategories.id, {
    onDelete: "set null",
  }),
  brandId: text("brand_id").references(() => inventoryBrands.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  sku: text("sku"),
  barcode: text("barcode"),
  description: text("description"),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).default("0"),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").default("pcs"),
  minStockLevel: integer("min_stock_level").default(0),
  maxStockLevel: integer("max_stock_level"),
  reorderPoint: integer("reorder_point").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("inventory_products_org_idx").on(table.organizationId),
  userIdx: index("inventory_products_user_idx").on(table.userId),
}));

export const inventoryStock = pgTable("inventory_stock", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  productId: text("product_id")
    .notNull()
    .references(() => inventoryProducts.id, { onDelete: "cascade" }),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => inventoryWarehouses.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).default("0").notNull(),
  reservedQuantity: decimal("reserved_quantity", { precision: 12, scale: 2 }).default("0").notNull(),
  avgCost: decimal("avg_cost", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  productWarehouseIdx: uniqueIndex("unique_product_warehouse").on(table.productId, table.warehouseId),
  orgIdx: index("inventory_stock_org_idx").on(table.organizationId),
}));

export const inventoryStockMovements = pgTable("inventory_stock_movements", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  productId: text("product_id")
    .notNull()
    .references(() => inventoryProducts.id, { onDelete: "cascade" }),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => inventoryWarehouses.id, { onDelete: "cascade" }),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  referenceId: text("reference_id"),
  referenceType: text("reference_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("inventory_stock_movements_org_idx").on(table.organizationId),
  productIdx: index("inventory_stock_movements_product_idx").on(table.productId),
}));

export const inventoryPurchaseOrders = pgTable("inventory_purchase_orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  supplierId: text("supplier_id").references(() => inventorySuppliers.id, {
    onDelete: "set null",
  }),
  status: purchaseOrderStatusEnum("status").default("draft").notNull(),
  orderDate: timestamp("order_date", { mode: "date" }).notNull(),
  expectedDate: timestamp("expected_date", { mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const inventoryPurchaseOrderItems = pgTable("inventory_purchase_order_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  purchaseOrderId: text("purchase_order_id")
    .notNull()
    .references(() => inventoryPurchaseOrders.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => inventoryProducts.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  receivedQuantity: decimal("received_quantity", { precision: 12, scale: 2 }).default("0"),
});

export const inventoryStockAdjustments = pgTable("inventory_stock_adjustments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  productId: text("product_id")
    .notNull()
    .references(() => inventoryProducts.id, { onDelete: "cascade" }),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => inventoryWarehouses.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// Bookkeeping tables
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  parentId: text("parent_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgCodeIdx: uniqueIndex("unique_org_account_code").on(table.organizationId, table.code),
  orgIdx: index("chart_of_accounts_org_idx").on(table.organizationId),
}));

export const journalEntries = pgTable("journal_entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  date: timestamp("date", { mode: "date" }).notNull(),
  description: text("description").notNull(),
  status: journalEntryStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  journalEntryId: text("journal_entry_id")
    .notNull()
    .references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => chartOfAccounts.id, { onDelete: "cascade" }),
  debit: decimal("debit", { precision: 12, scale: 2 }).default("0"),
  credit: decimal("credit", { precision: 12, scale: 2 }).default("0"),
  description: text("description"),
});

// eTIMS tables
export const etimsConfig = pgTable("etims_config", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  tin: text("tin").notNull(),
  pin: text("pin").notNull(),
  deviceId: text("device_id").notNull(),
  apiKey: text("api_key"),
  environment: text("environment").default("sandbox").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const etimsInvoices = pgTable("etims_invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  etimsInvoiceNumber: text("etims_invoice_number"),
  status: etimsStatusEnum("status").default("pending").notNull(),
  submissionResponse: jsonb("submission_response").$type<Record<string, unknown>>(),
  submittedAt: timestamp("submitted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const etimsComplianceLogs = pgTable("etims_compliance_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// Relations
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ one, many }) => ({
  business: one(businesses),
  clients: many(clients),
  invoices: many(invoices),
  payments: many(payments),
  expenses: many(expenses),
  tasks: many(tasks),
}));

export const businessesRelations = relations(businesses, ({ one }) => ({
  user: one(users, { fields: [businesses.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  invoices: many(invoices),
  logs: many(clientLogs),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [payments.clientId],
    references: [clients.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
}));

// Inventory relations
export const inventoryCategoriesRelations = relations(inventoryCategories, ({ one, many }) => ({
  user: one(users, { fields: [inventoryCategories.userId], references: [users.id] }),
  products: many(inventoryProducts),
}));

export const inventoryBrandsRelations = relations(inventoryBrands, ({ one, many }) => ({
  user: one(users, { fields: [inventoryBrands.userId], references: [users.id] }),
  products: many(inventoryProducts),
}));

export const inventorySuppliersRelations = relations(inventorySuppliers, ({ one, many }) => ({
  user: one(users, { fields: [inventorySuppliers.userId], references: [users.id] }),
  rfqSuppliers: many(procurementRfqSuppliers),
  quotations: many(procurementSupplierQuotations),
  purchaseOrders: many(procurementPurchaseOrders),
  grns: many(procurementGrns),
  returns: many(procurementSupplierReturns),
  invoices: many(procurementPurchaseInvoices),
  payments: many(procurementSupplierPayments),
  recommendations: many(procurementAiRecommendations),
}));

export const inventoryWarehousesRelations = relations(inventoryWarehouses, ({ one, many }) => ({
  user: one(users, { fields: [inventoryWarehouses.userId], references: [users.id] }),
  stock: many(inventoryStock),
  movements: many(inventoryStockMovements),
}));

export const inventoryProductsRelations = relations(inventoryProducts, ({ one, many }) => ({
  user: one(users, { fields: [inventoryProducts.userId], references: [users.id] }),
  category: one(inventoryCategories, {
    fields: [inventoryProducts.categoryId],
    references: [inventoryCategories.id],
  }),
  brand: one(inventoryBrands, {
    fields: [inventoryProducts.brandId],
    references: [inventoryBrands.id],
  }),
  stock: many(inventoryStock),
  movements: many(inventoryStockMovements),
  purchaseOrderItems: many(inventoryPurchaseOrderItems),
  adjustments: many(inventoryStockAdjustments),
}));

export const inventoryStockRelations = relations(inventoryStock, ({ one }) => ({
  user: one(users, { fields: [inventoryStock.userId], references: [users.id] }),
  product: one(inventoryProducts, {
    fields: [inventoryStock.productId],
    references: [inventoryProducts.id],
  }),
  warehouse: one(inventoryWarehouses, {
    fields: [inventoryStock.warehouseId],
    references: [inventoryWarehouses.id],
  }),
}));

export const inventoryStockMovementsRelations = relations(inventoryStockMovements, ({ one }) => ({
  user: one(users, { fields: [inventoryStockMovements.userId], references: [users.id] }),
  product: one(inventoryProducts, {
    fields: [inventoryStockMovements.productId],
    references: [inventoryProducts.id],
  }),
  warehouse: one(inventoryWarehouses, {
    fields: [inventoryStockMovements.warehouseId],
    references: [inventoryWarehouses.id],
  }),
}));

export const inventoryPurchaseOrdersRelations = relations(inventoryPurchaseOrders, ({ one, many }) => ({
  user: one(users, { fields: [inventoryPurchaseOrders.userId], references: [users.id] }),
  supplier: one(inventorySuppliers, {
    fields: [inventoryPurchaseOrders.supplierId],
    references: [inventorySuppliers.id],
  }),
  items: many(inventoryPurchaseOrderItems),
}));

export const inventoryPurchaseOrderItemsRelations = relations(inventoryPurchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(inventoryPurchaseOrders, {
    fields: [inventoryPurchaseOrderItems.purchaseOrderId],
    references: [inventoryPurchaseOrders.id],
  }),
  product: one(inventoryProducts, {
    fields: [inventoryPurchaseOrderItems.productId],
    references: [inventoryProducts.id],
  }),
}));

export const inventoryStockAdjustmentsRelations = relations(inventoryStockAdjustments, ({ one }) => ({
  user: one(users, { fields: [inventoryStockAdjustments.userId], references: [users.id] }),
  product: one(inventoryProducts, {
    fields: [inventoryStockAdjustments.productId],
    references: [inventoryProducts.id],
  }),
  warehouse: one(inventoryWarehouses, {
    fields: [inventoryStockAdjustments.warehouseId],
    references: [inventoryWarehouses.id],
  }),
}));

// Bookkeeping relations
export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
  user: one(users, { fields: [chartOfAccounts.userId], references: [users.id] }),
  parent: one(chartOfAccounts, {
    fields: [chartOfAccounts.parentId],
    references: [chartOfAccounts.id],
  }),
  journalLines: many(journalEntryLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  user: one(users, { fields: [journalEntries.userId], references: [users.id] }),
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [journalEntryLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));

// eTIMS relations
export const etimsConfigRelations = relations(etimsConfig, ({ one }) => ({
  user: one(users, { fields: [etimsConfig.userId], references: [users.id] }),
}));

export const etimsInvoicesRelations = relations(etimsInvoices, ({ one }) => ({
  user: one(users, { fields: [etimsInvoices.userId], references: [users.id] }),
  invoice: one(invoices, {
    fields: [etimsInvoices.invoiceId],
    references: [invoices.id],
  }),
}));

export const etimsComplianceLogsRelations = relations(etimsComplianceLogs, ({ one }) => ({
  user: one(users, { fields: [etimsComplianceLogs.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1 — MULTI-ORGANIZATION ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────

// Every organization is a fully isolated tenant. Business data is scoped by
// `organizationId`. A `branches` reference is intentionally omitted for now but
// the schema is branch-ready: organizations can later own branches, and data
// tables can gain an optional `branchId` without breaking tenant isolation.
export const organizations = pgTable("organizations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  // Billing/plan lives on the org so the whole tenant shares a subscription.
  plan: planEnum("plan").default("free").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Null while the invite is pending (matched by email on first login).
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    name: text("name"),
    // System role assigned to the member.
    roleType: roleTypeEnum("role_type").default("employee").notNull(),
    // Optional custom role that overrides the system role's permissions.
    customRoleId: text("custom_role_id").references(() => roles.id, {
      onDelete: "set null",
    }),
    status: memberStatusEnum("status").default("active").notNull(),
    invitedBy: text("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    joinedAt: timestamp("joined_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (member) => [
    // A user can only belong to an organization once.
    {
      uniqueOrgUser: uniqueIndex("unique_org_user").on(
        member.organizationId,
        member.userId
      ),
    },
    index("org_members_org_idx").on(member.organizationId),
    index("org_members_email_idx").on(member.email),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2 — ROLE-BASED ACCESS CONTROL (RBAC)
// ─────────────────────────────────────────────────────────────────────────────

// Roles can be system roles (organization_id null, is_system true) or custom
// org-specific roles. Permissions are stored as individual grant rows so every
// permission is independently assignable.
export const roles = pgTable(
  "roles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    // System roles are seeded and cannot be deleted; custom roles can.
    isSystem: boolean("is_system").default(false).notNull(),
    // For system roles, the canonical role type (owner, admin, ...).
    type: roleTypeEnum("type"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (role) => [
    {
      uniqueOrgRole: uniqueIndex("unique_org_role").on(
        role.organizationId,
        role.name
      ),
    },
  ]
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    // Permission key, e.g. "invoices.create" (catalogued in src/lib/rbac).
    permission: text("permission").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (rp) => [
    {
      uniqueRolePermission: uniqueIndex("unique_role_permission").on(
        rp.roleId,
        rp.permission
      ),
    },
  ]
);

// Catalog of every permission in the system. Seeded from the code catalog in
// src/lib/rbac/permissions.ts so the DB stays in sync with the source of truth.
export const permissions = pgTable(
  "permissions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull().unique(),
    category: permissionCategoryEnum("category").notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (p) => [
    {
      uniquePermissionKey: uniqueIndex("unique_permission_key").on(p.key),
    },
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3 — COMPREHENSIVE AUDIT LOGGING
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Short action identifier, e.g. "invoice.create".
    action: text("action").notNull(),
    category: auditCategoryEnum("category").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    description: text("description"),
    oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
    newValues: jsonb("new_values").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (log) => [
    index("audit_org_created").on(log.organizationId, log.createdAt),
    index("audit_resource").on(log.resourceType, log.resourceId),
    index("audit_category").on(log.organizationId, log.category),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 4 — INTELLIGENT NOTIFICATION CENTER
// ─────────────────────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Recipient user. Null = broadcast to the whole organization.
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    category: notificationCategoryEnum("category").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    priority: notificationPriorityEnum("priority").default("normal").notNull(),
    read: boolean("read").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    deepLink: text("deep_link"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (n) => [
    index("notif_user_unread").on(n.userId, n.read, n.createdAt),
    index("notif_org_created").on(n.organizationId, n.createdAt),
  ]
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: notificationCategoryEnum("category").notNull(),
    inApp: boolean("in_app").default(true).notNull(),
    email: boolean("email").default(false).notNull(),
    push: boolean("push").default(false).notNull(),
    sms: boolean("sms").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (np) => [
    uniqueIndex("unique_notif_pref").on(
      np.organizationId,
      np.userId,
      np.category
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 5 — PUBLIC API FOUNDATION
// ─────────────────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // First 8 chars of the secret, stored for display/identification only.
    keyPrefix: text("key_prefix").notNull(),
    // Bcrypt hash of the full secret. The plaintext secret is shown once.
    secretHash: text("secret_hash").notNull(),
    // OAuth-style scopes granted to this key (subset of permission keys).
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    status: apiKeyStatusEnum("status").default("active").notNull(),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    revokedBy: text("revoked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (k) => [index("apikey_org").on(k.organizationId)]
);

export const apiUsage = pgTable(
  "api_usage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull(),
    statusCode: integer("status_code").notNull(),
    responseTimeMs: integer("response_time_ms"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (u) => [
    index("apiusage_org_created").on(u.organizationId, u.createdAt),
    index("apiusage_key_created").on(u.apiKeyId, u.createdAt),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 6 — DEVELOPER PLATFORM & PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export const oauthClientStatusEnum = pgEnum("oauth_client_status", [
  "active",
  "revoked",
]);

export const webhookStatusEnum = pgEnum("webhook_status", [
  "active",
  "paused",
  "disabled",
]);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
  "retrying",
]);

export const oauthClients = pgTable(
  "oauth_clients",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    redirectUris: jsonb("redirect_uris").$type<string[]>().default([]).notNull(),
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    clientId: text("client_id").notNull().unique(),
    clientSecretHash: text("client_secret_hash").notNull(),
    status: oauthClientStatusEnum("status").default("active").notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (c) => [index("oauth_client_org").on(c.organizationId)]
);

export const oauthAccessTokens = pgTable(
  "oauth_access_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("oauth_accesstoken_org").on(t.organizationId),
    index("oauth_accesstoken_client").on(t.clientId),
  ]
);

export const oauthRefreshTokens = pgTable(
  "oauth_refresh_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    accessTokenId: text("access_token_id")
      .references(() => oauthAccessTokens.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("oauth_refreshtoken_org").on(t.organizationId),
    index("oauth_refreshtoken_access").on(t.accessTokenId),
  ]
);

export const oauthAuthorizationCodes = pgTable(
  "oauth_authorization_codes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    usedAt: timestamp("used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (c) => [
    index("oauth_authcode_org").on(c.organizationId),
    index("oauth_authcode_client").on(c.clientId),
  ]
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: jsonb("events").$type<string[]>().default([]).notNull(),
    status: webhookStatusEnum("status").default("active").notNull(),
    headers: jsonb("headers").$type<Record<string, string>>().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (w) => [index("webhook_org").on(w.organizationId)]
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: webhookDeliveryStatusEnum("status").default("pending").notNull(),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { mode: "date" }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (d) => [
    index("webhookdelivery_org").on(d.organizationId),
    index("webhookdelivery_webhook").on(d.webhookId),
    index("webhookdelivery_status").on(d.status),
  ]
);

export const apiSandboxSessions = pgTable(
  "api_sandbox_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    environment: text("environment").default("sandbox").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }),
  },
  (s) => [index("sandbox_org").on(s.organizationId)]
);

export const apiAnalyticsDaily = pgTable(
  "api_analytics_daily",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id")
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    totalRequests: integer("total_requests").default(0).notNull(),
    successfulRequests: integer("successful_requests").default(0).notNull(),
    failedRequests: integer("failed_requests").default(0).notNull(),
    avgResponseTimeMs: integer("avg_response_time_ms"),
    topEndpoints: jsonb("top_endpoints").$type<Record<string, number>>().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (a) => ({
    uniqueAnalytics: uniqueIndex("api_analytics_daily_unique").on(a.organizationId, a.apiKeyId, a.date),
    orgDateIdx: index("api_analytics_org_date").on(a.organizationId, a.date),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Enterprise Analytics (Epic 9)
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsDashboards = pgTable("analytics_dashboards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  layout: jsonb("layout").$type<Record<string, unknown>>().default({}).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isShared: boolean("is_shared").default(false).notNull(),
  sharedWithRoles: jsonb("shared_with_roles").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("analytics_dashboards_org_idx").on(table.organizationId),
  userIdx: index("analytics_dashboards_user_idx").on(table.userId),
  defaultIdx: index("analytics_dashboards_default_idx").on(table.isDefault),
}));

export const analyticsWidgets = pgTable("analytics_widgets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  dashboardId: text("dashboard_id")
    .notNull()
    .references(() => analyticsDashboards.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: analyticsWidgetTypeEnum("type").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  dataSource: text("data_source").notNull(),
  position: jsonb("position").$type<{ x: number; y: number; w: number; h: number }>().default({ x: 0, y: 0, w: 4, h: 4 }).notNull(),
  refreshInterval: integer("refresh_interval").default(300).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("analytics_widgets_org_idx").on(table.organizationId),
  dashboardIdx: index("analytics_widgets_dashboard_idx").on(table.dashboardId),
  typeIdx: index("analytics_widgets_type_idx").on(table.type),
}));

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  widgetId: text("widget_id").references(() => analyticsWidgets.id, { onDelete: "cascade" }),
  dashboardId: text("dashboard_id").references(() => analyticsDashboards.id, { onDelete: "cascade" }),
  period: analyticsPeriodEnum("period").notNull(),
  periodStart: timestamp("period_start", { mode: "date" }).notNull(),
  periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  computedAt: timestamp("computed_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("analytics_snapshots_org_idx").on(table.organizationId),
  widgetIdx: index("analytics_snapshots_widget_idx").on(table.widgetId),
  dashboardIdx: index("analytics_snapshots_dashboard_idx").on(table.dashboardId),
  periodIdx: index("analytics_snapshots_period_idx").on(table.period),
  createdIdx: index("analytics_snapshots_created_idx").on(table.computedAt),
}));

export const analyticsScheduledReports = pgTable("analytics_scheduled_reports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  reportType: text("report_type").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  format: reportFormatEnum("format").notNull().default("pdf"),
  frequency: scheduleFrequencyEnum("frequency").notNull(),
  status: scheduleStatusEnum("status").default("active").notNull(),
  recipients: jsonb("recipients").$type<string[]>().default([]).notNull(),
  lastRunAt: timestamp("last_run_at", { mode: "date" }),
  nextRunAt: timestamp("next_run_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("analytics_scheduled_reports_org_idx").on(table.organizationId),
  userIdx: index("analytics_scheduled_reports_user_idx").on(table.userId),
  statusIdx: index("analytics_scheduled_reports_status_idx").on(table.status),
  nextRunIdx: index("analytics_scheduled_reports_next_run_idx").on(table.nextRunAt),
}));

export const analyticsReportRuns = pgTable("analytics_report_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  scheduledReportId: text("scheduled_report_id").references(() => analyticsScheduledReports.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull(),
  format: reportFormatEnum("format").notNull(),
  status: reportStatusEnum("status").default("pending").notNull(),
  periodStart: timestamp("period_start", { mode: "date" }),
  periodEnd: timestamp("period_end", { mode: "date" }),
  parameters: jsonb("parameters").$type<Record<string, unknown>>().default({}).notNull(),
  resultUrl: text("result_url"),
  error: text("error"),
  fileSize: integer("file_size"),
  rowCount: integer("row_count"),
  startedAt: timestamp("started_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("analytics_report_runs_org_idx").on(table.organizationId),
  scheduledIdx: index("analytics_report_runs_scheduled_idx").on(table.scheduledReportId),
  statusIdx: index("analytics_report_runs_status_idx").on(table.status),
  createdIdx: index("analytics_report_runs_created_idx").on(table.createdAt),
}));

export const analyticsInsights = pgTable("analytics_insights", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: analyticsInsightTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").default("info").notNull(),
  confidence: integer("confidence").default(100).notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  isRead: boolean("is_read").default(false).notNull(),
  isDismissed: boolean("is_dismissed").default(false).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("analytics_insights_org_idx").on(table.organizationId),
  userIdx: index("analytics_insights_user_idx").on(table.userId),
  typeIdx: index("analytics_insights_type_idx").on(table.type),
  readIdx: index("analytics_insights_read_idx").on(table.isRead),
  createdIdx: index("analytics_insights_created_idx").on(table.createdAt),
}));

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE — ENTERPRISE & MULTI-BRANCH MANAGEMENT (Epic 10)
// ─────────────────────────────────────────────────────────────────────────────
// Every enterprise table is multi-tenant: it carries `organizationId` and
// user-scoped ownership. All mutations are gated by RBAC, audited, emit
// Business Timeline events, and integrate with Inventory, Procurement, POS,
// HR, Payroll, and the AI Business Copilot.

export const enterpriseBranches = pgTable("enterprise_branches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  type: branchTypeEnum("type").notNull().default("retail"),
  status: branchStatusEnum("status").notNull().default("active"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Kenya"),
  phone: text("phone"),
  email: text("email"),
  managerId: text("manager_id").references(() => users.id, {
    onDelete: "set null",
  }),
  timezone: text("timezone").default("Africa/Nairobi"),
  currency: text("currency").default("KES"),
  taxId: text("tax_id"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("enterprise_branches_org_idx").on(table.organizationId),
  userIdx: index("enterprise_branches_user_idx").on(table.userId),
  codeIdx: uniqueIndex("unique_org_branch_code").on(table.organizationId, table.code),
  managerIdx: index("enterprise_branches_manager_idx").on(table.managerId),
}));

export const branchMembers = pgTable("branch_members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleType: roleTypeEnum("role_type").notNull().default("employee"),
  customRoleId: text("custom_role_id").references(() => roles.id, {
    onDelete: "set null",
  }),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isPrimary: boolean("is_primary").default(false).notNull(),
  joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("branch_members_org_idx").on(table.organizationId),
  branchIdx: index("branch_members_branch_idx").on(table.branchId),
  userIdx: index("branch_members_user_idx").on(table.userId),
  uniqueUserBranch: uniqueIndex("unique_branch_user").on(table.branchId, table.userId),
}));

export const branchPricing = pgTable("branch_pricing", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => inventoryProducts.id, {
    onDelete: "set null",
  }),
  categoryId: text("category_id").references(() => inventoryCategories.id, {
    onDelete: "set null",
  }),
  priceAdjustmentType: text("price_adjustment_type").default("percentage"),
  priceAdjustmentValue: decimal("price_adjustment_value", { precision: 12, scale: 2 }).default("0"),
  minPrice: decimal("min_price", { precision: 12, scale: 2 }),
  maxPrice: decimal("max_price", { precision: 12, scale: 2 }),
  effectiveFrom: timestamp("effective_from", { mode: "date" }),
  effectiveTo: timestamp("effective_to", { mode: "date" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("branch_pricing_org_idx").on(table.organizationId),
  branchIdx: index("branch_pricing_branch_idx").on(table.branchId),
  productIdx: index("branch_pricing_product_idx").on(table.productId),
  uniqueBranchProduct: uniqueIndex("unique_branch_product_pricing").on(table.branchId, table.productId),
}));

export const branchTaxSettings = pgTable("branch_tax_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "cascade" }),
  taxName: text("tax_name").notNull(),
  taxType: text("tax_type").notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  isCompound: boolean("is_compound").default(false).notNull(),
  appliesTo: text("applies_to").default("all"),
  effectiveFrom: timestamp("effective_from", { mode: "date" }),
  effectiveTo: timestamp("effective_to", { mode: "date" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("branch_tax_settings_org_idx").on(table.organizationId),
  branchIdx: index("branch_tax_settings_branch_idx").on(table.branchId),
}));

export const interBranchTransfers = pgTable("inter_branch_transfers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  transferNumber: text("transfer_number").notNull(),
  fromBranchId: text("from_branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "restrict" }),
  toBranchId: text("to_branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "restrict" }),
  status: transferStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  approvedBy: text("approved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  receivedBy: text("received_by").references(() => users.id, {
    onDelete: "set null",
  }),
  receivedAt: timestamp("received_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("inter_branch_transfers_org_idx").on(table.organizationId),
  userIdx: index("inter_branch_transfers_user_idx").on(table.userId),
  fromIdx: index("inter_branch_transfers_from_idx").on(table.fromBranchId),
  toIdx: index("inter_branch_transfers_to_idx").on(table.toBranchId),
  numberIdx: uniqueIndex("unique_org_transfer_number").on(table.organizationId, table.transferNumber),
  statusIdx: index("inter_branch_transfers_status_idx").on(table.status),
}));

export const interBranchTransferItems = pgTable("inter_branch_transfer_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  transferId: text("transfer_id")
    .notNull()
    .references(() => interBranchTransfers.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => inventoryProducts.id, { onDelete: "restrict" }),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  receivedQuantity: decimal("received_quantity", { precision: 12, scale: 3 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("inter_branch_transfer_items_org_idx").on(table.organizationId),
  transferIdx: index("inter_branch_transfer_items_transfer_idx").on(table.transferId),
  productIdx: index("inter_branch_transfer_items_product_idx").on(table.productId),
}));

export const interBranchSales = pgTable("inter_branch_sales", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  saleNumber: text("sale_number").notNull(),
  fromBranchId: text("from_branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "restrict" }),
  toBranchId: text("to_branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "restrict" }),
  status: interBranchSaleStatusEnum("status").notNull().default("draft"),
  currency: text("currency").default("KES").notNull(),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
  taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0"),
  total: decimal("total", { precision: 14, scale: 2 }).default("0"),
  notes: text("notes"),
  approvedBy: text("approved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  cancelledAt: timestamp("cancelled_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("inter_branch_sales_org_idx").on(table.organizationId),
  userIdx: index("inter_branch_sales_user_idx").on(table.userId),
  fromIdx: index("inter_branch_sales_from_idx").on(table.fromBranchId),
  toIdx: index("inter_branch_sales_to_idx").on(table.toBranchId),
  numberIdx: uniqueIndex("unique_org_inter_branch_sale_number").on(table.organizationId, table.saleNumber),
  statusIdx: index("inter_branch_sales_status_idx").on(table.status),
}));

export const interBranchSaleItems = pgTable("inter_branch_sale_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  saleId: text("sale_id")
    .notNull()
    .references(() => interBranchSales.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => inventoryProducts.id, { onDelete: "restrict" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
  lineTotal: decimal("line_total", { precision: 14, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("inter_branch_sale_items_org_idx").on(table.organizationId),
  saleIdx: index("inter_branch_sale_items_sale_idx").on(table.saleId),
  productIdx: index("inter_branch_sale_items_product_idx").on(table.productId),
}));

export const branchApprovalWorkflows = pgTable("branch_approval_workflows", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  resourceType: text("resource_type").notNull(),
  steps: jsonb("steps").$type<Record<string, unknown>[]>().default([]),
  isDefault: boolean("is_default").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("branch_approval_workflows_org_idx").on(table.organizationId),
  branchIdx: index("branch_approval_workflows_branch_idx").on(table.branchId),
  resourceIdx: index("branch_approval_workflows_resource_idx").on(table.resourceType),
}));

export const branchApprovalRequests = pgTable("branch_approval_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "cascade" }),
  workflowId: text("workflow_id").references(() => branchApprovalWorkflows.id, {
    onDelete: "set null",
  }),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  title: text("title").notNull(),
  status: approvalStatusEnum("status").default("pending").notNull(),
  currentStep: integer("current_step").default(0).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("branch_approval_requests_org_idx").on(table.organizationId),
  branchIdx: index("branch_approval_requests_branch_idx").on(table.branchId),
  resourceIdx: index("branch_approval_requests_resource_idx").on(table.resourceType, table.resourceId),
  statusIdx: index("branch_approval_requests_status_idx").on(table.status),
}));

export const enterpriseSettings = pgTable("enterprise_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  consolidatedReporting: boolean("consolidated_reporting").default(true).notNull(),
  crossBranchInventoryVisibility: boolean("cross_branch_inventory_visibility").default(true).notNull(),
  centralizedProcurement: boolean("centralized_procurement").default(false).notNull(),
  branchApprovalRequired: boolean("branch_approval_required").default(false).notNull(),
  defaultTransferMethod: text("default_transfer_method").default("standard"),
  autoApproveTransfersBelow: decimal("auto_approve_transfers_below", { precision: 14, scale: 2 }),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: uniqueIndex("unique_org_enterprise_settings").on(table.organizationId),
}));

export const branchPerformanceSnapshots = pgTable("branch_performance_snapshots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => enterpriseBranches.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start", { mode: "date" }).notNull(),
  periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
  revenue: decimal("revenue", { precision: 14, scale: 2 }).default("0"),
  expenses: decimal("expenses", { precision: 14, scale: 2 }).default("0"),
  profit: decimal("profit", { precision: 14, scale: 2 }).default("0"),
  inventoryValue: decimal("inventory_value", { precision: 14, scale: 2 }).default("0"),
  salesCount: integer("sales_count").default(0),
  transferCount: integer("transfer_count").default(0),
  employeeCount: integer("employee_count").default(0),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  computedAt: timestamp("computed_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("branch_performance_snapshots_org_idx").on(table.organizationId),
  branchIdx: index("branch_performance_snapshots_branch_idx").on(table.branchId),
  periodIdx: index("branch_performance_snapshots_period_idx").on(table.periodStart, table.periodEnd),
  uniqueBranchPeriod: uniqueIndex("unique_branch_period").on(table.branchId, table.periodStart, table.periodEnd),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Integration Hub (Epic 11)
// ─────────────────────────────────────────────────────────────────────────────
// One connection per organization + provider (+ optional label). Secrets in
// `credentials` are encrypted at rest via encryptSecret (enc::). `provider` is
// stored as free text validated against the code catalog (catalog.ts) so the
// marketplace stays extensible without migrations.

export const integrations = pgTable("integrations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  category: integrationCategoryEnum("category").notNull(),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  authType: integrationAuthTypeEnum("auth_type").notNull().default("api_key"),
  status: integrationStatusEnum("status").notNull().default("pending"),
  enabled: boolean("enabled").notNull().default(true),
  environment: text("environment").notNull().default("production"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  credentials: jsonb("credentials").$type<Record<string, unknown>>().default({}),
  scopes: jsonb("scopes").$type<string[]>().default([]),
  healthStatus: integrationHealthStatusEnum("health_status").notNull().default("unknown"),
  lastCheckedAt: timestamp("last_checked_at", { mode: "date" }),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  errorMessage: text("error_message"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  linkedConfigId: text("linked_config_id").references(() => paymentProviderConfigs.id, {
    onDelete: "set null",
  }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgProviderNameIdx: uniqueIndex("integrations_org_provider_name_idx").on(
    table.organizationId,
    table.provider,
    table.name
  ),
  orgIdx: index("integrations_org_idx").on(table.organizationId),
  orgCategoryIdx: index("integrations_org_category_idx").on(table.organizationId, table.category),
  orgStatusIdx: index("integrations_org_status_idx").on(table.organizationId, table.status),
  orgHealthIdx: index("integrations_org_health_idx").on(table.organizationId, table.healthStatus),
}));

/** Encrypted OAuth token lifecycle. Tokens encrypted via encryptSecret. */
export const integrationOauthTokens = pgTable("integration_oauth_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  integrationId: text("integration_id")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  scope: text("scope"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  integrationIdx: index("integration_oauth_tokens_integration_idx").on(table.integrationId),
  orgIdx: index("integration_oauth_tokens_org_idx").on(table.organizationId),
}));

/** Immutable per-operation activity log. */
export const integrationActivityLogs = pgTable("integration_activity_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  integrationId: text("integration_id")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  message: text("message"),
  detail: jsonb("detail").$type<Record<string, unknown>>().default({}),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  integrationIdx: index("integration_activity_logs_integration_idx").on(table.integrationId),
  orgIdx: index("integration_activity_logs_org_idx").on(table.organizationId),
  orgCreatedIdx: index("integration_activity_logs_org_created_idx").on(
    table.organizationId,
    table.createdAt
  ),
}));

/** Outbound/inbound event queue with retry. */
export const integrationEvents = pgTable("integration_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  integrationId: text("integration_id")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  direction: text("direction").notNull().default("outbound"),
  type: text("type").notNull(),
  status: integrationEventStatusEnum("status").notNull().default("pending"),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  response: jsonb("response").$type<Record<string, unknown>>().default({}),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  nextRetryAt: timestamp("next_retry_at", { mode: "date" }),
  processedAt: timestamp("processed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  integrationIdx: index("integration_events_integration_idx").on(table.integrationId),
  orgIdx: index("integration_events_org_idx").on(table.organizationId),
  statusIdx: index("integration_events_status_idx").on(table.status, table.nextRetryAt),
}));

/** Inbound webhook records. */
export const integrationWebhookLogs = pgTable("integration_webhook_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  integrationId: text("integration_id")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  event: text("event"),
  verified: boolean("verified").notNull().default(false),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  headers: jsonb("headers").$type<Record<string, unknown>>().default({}),
  status: text("status").notNull().default("received"),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  integrationIdx: index("integration_webhook_logs_integration_idx").on(table.integrationId),
  orgIdx: index("integration_webhook_logs_org_idx").on(table.organizationId),
  orgCreatedIdx: index("integration_webhook_logs_org_created_idx").on(
    table.organizationId,
    table.createdAt
  ),
}));

/** Periodic health snapshots. */
export const integrationHealthChecks = pgTable("integration_health_checks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  integrationId: text("integration_id")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  status: integrationHealthStatusEnum("status").notNull().default("unknown"),
  latencyMs: integer("latency_ms"),
  detail: jsonb("detail").$type<Record<string, unknown>>().default({}),
  checkedAt: timestamp("checked_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  integrationIdx: index("integration_health_checks_integration_idx").on(table.integrationId),
  orgIdx: index("integration_health_checks_org_idx").on(table.organizationId),
  checkedIdx: index("integration_health_checks_checked_idx").on(table.checkedAt),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Tenant scoping helper columns on existing business tables
// ─────────────────────────────────────────────────────────────────────────────
// `organizationId` is added to every business table so all data is isolated per
// tenant. It is nullable at the DB level to keep `db:push` non-destructive; the
// application always sets it from the session and the backfill script (see
// scripts/backfill-organizations.mjs) attributes existing rows to a per-user
// organization. New tables above require organizationId (empty tables).

// ─────────────────────────────────────────────────────────────────────────────
// Enterprise foundation relations
// ─────────────────────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
  members: many(organizationMembers),
  roles: many(roles),
  apiKeys: many(apiKeys),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  customRole: one(roles, {
    fields: [organizationMembers.customRoleId],
    references: [roles.id],
  }),
  inviter: one(users, {
    fields: [organizationMembers.invitedBy],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
  permissions: many(rolePermissions),
  members: many(organizationMembers),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [notificationPreferences.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  })
);

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
  usage: many(apiUsage),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiUsage.apiKeyId],
    references: [apiKeys.id],
  }),
  organization: one(organizations, {
    fields: [apiUsage.organizationId],
    references: [organizations.id],
  }),
}));

export const businessTimelineRelations = relations(businessTimeline, ({ one }) => ({
  organization: one(organizations, {
    fields: [businessTimeline.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [businessTimeline.userId],
    references: [users.id],
  }),
}));

// Integration Hub relations
export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [integrations.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
  linkedConfig: one(paymentProviderConfigs, {
    fields: [integrations.linkedConfigId],
    references: [paymentProviderConfigs.id],
  }),
  oauthTokens: many(integrationOauthTokens),
  activityLogs: many(integrationActivityLogs),
  events: many(integrationEvents),
  webhookLogs: many(integrationWebhookLogs),
  healthChecks: many(integrationHealthChecks),
}));

export const integrationOauthTokensRelations = relations(integrationOauthTokens, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationOauthTokens.integrationId],
    references: [integrations.id],
  }),
  organization: one(organizations, {
    fields: [integrationOauthTokens.organizationId],
    references: [organizations.id],
  }),
}));

export const integrationActivityLogsRelations = relations(integrationActivityLogs, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationActivityLogs.integrationId],
    references: [integrations.id],
  }),
  organization: one(organizations, {
    fields: [integrationActivityLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [integrationActivityLogs.userId],
    references: [users.id],
  }),
}));

export const integrationEventsRelations = relations(integrationEvents, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationEvents.integrationId],
    references: [integrations.id],
  }),
  organization: one(organizations, {
    fields: [integrationEvents.organizationId],
    references: [organizations.id],
  }),
}));

export const integrationWebhookLogsRelations = relations(integrationWebhookLogs, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationWebhookLogs.integrationId],
    references: [integrations.id],
  }),
  organization: one(organizations, {
    fields: [integrationWebhookLogs.organizationId],
    references: [organizations.id],
  }),
}));

export const integrationHealthChecksRelations = relations(integrationHealthChecks, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationHealthChecks.integrationId],
    references: [integrations.id],
  }),
  organization: one(organizations, {
    fields: [integrationHealthChecks.organizationId],
    references: [organizations.id],
  }),
}));

// Enterprise CRM relations
export const crmCompaniesRelations = relations(crmCompanies, ({ one, many }) => ({
  user: one(users, { fields: [crmCompanies.userId], references: [users.id] }),
  contacts: many(crmContacts),
  leads: many(crmLeads),
  deals: many(crmDeals),
  quotations: many(crmQuotations),
  activities: many(crmActivities),
}));

export const crmContactsRelations = relations(crmContacts, ({ one, many }) => ({
  user: one(users, { fields: [crmContacts.userId], references: [users.id] }),
  company: one(crmCompanies, {
    fields: [crmContacts.companyId],
    references: [crmCompanies.id],
  }),
  activities: many(crmActivities),
  quotations: many(crmQuotations),
  deals: many(crmDeals),
}));

export const crmLeadsRelations = relations(crmLeads, ({ one, many }) => ({
  user: one(users, { fields: [crmLeads.userId], references: [users.id] }),
  assigned: one(users, {
    fields: [crmLeads.assignedTo],
    references: [users.id],
  }),
  convertedCompany: one(crmCompanies, {
    fields: [crmLeads.convertedCompanyId],
    references: [crmCompanies.id],
  }),
  convertedContact: one(crmContacts, {
    fields: [crmLeads.convertedContactId],
    references: [crmContacts.id],
  }),
  convertedDeal: one(crmDeals, {
    fields: [crmLeads.convertedDealId],
    references: [crmDeals.id],
  }),
  activities: many(crmActivities),
  quotations: many(crmQuotations),
  deals: many(crmDeals),
}));

export const crmPipelineStagesRelations = relations(crmPipelineStages, ({ one, many }) => ({
  user: one(users, { fields: [crmPipelineStages.userId], references: [users.id] }),
  deals: many(crmDeals),
}));

export const crmDealsRelations = relations(crmDeals, ({ one, many }) => ({
  user: one(users, { fields: [crmDeals.userId], references: [users.id] }),
  company: one(crmCompanies, {
    fields: [crmDeals.companyId],
    references: [crmCompanies.id],
  }),
  contact: one(crmContacts, {
    fields: [crmDeals.contactId],
    references: [crmContacts.id],
  }),
  lead: one(crmLeads, {
    fields: [crmDeals.leadId],
    references: [crmLeads.id],
  }),
  stage: one(crmPipelineStages, {
    fields: [crmDeals.stageId],
    references: [crmPipelineStages.id],
  }),
  owner: one(users, {
    fields: [crmDeals.ownerId],
    references: [users.id],
  }),
  activities: many(crmActivities),
  quotations: many(crmQuotations),
}));

export const crmActivitiesRelations = relations(crmActivities, ({ one }) => ({
  user: one(users, { fields: [crmActivities.userId], references: [users.id] }),
  assigned: one(users, {
    fields: [crmActivities.assignedTo],
    references: [users.id],
  }),
  lead: one(crmLeads, {
    fields: [crmActivities.leadId],
    references: [crmLeads.id],
  }),
  contact: one(crmContacts, {
    fields: [crmActivities.contactId],
    references: [crmContacts.id],
  }),
  company: one(crmCompanies, {
    fields: [crmActivities.companyId],
    references: [crmCompanies.id],
  }),
  deal: one(crmDeals, {
    fields: [crmActivities.dealId],
    references: [crmDeals.id],
  }),
}));

export const crmQuotationsRelations = relations(crmQuotations, ({ one, many }) => ({
  user: one(users, { fields: [crmQuotations.userId], references: [users.id] }),
  company: one(crmCompanies, {
    fields: [crmQuotations.companyId],
    references: [crmCompanies.id],
  }),
  contact: one(crmContacts, {
    fields: [crmQuotations.contactId],
    references: [crmContacts.id],
  }),
  lead: one(crmLeads, {
    fields: [crmQuotations.leadId],
    references: [crmLeads.id],
  }),
  deal: one(crmDeals, {
    fields: [crmQuotations.dealId],
    references: [crmDeals.id],
  }),
  approvedByUser: one(users, {
    fields: [crmQuotations.approvedBy],
    references: [users.id],
  }),
  parent: one(crmQuotations, {
    fields: [crmQuotations.parentQuotationId],
    references: [crmQuotations.id],
  }),
  items: many(crmQuotationItems),
}));

export const crmQuotationItemsRelations = relations(crmQuotationItems, ({ one }) => ({
  quotation: one(crmQuotations, {
    fields: [crmQuotationItems.quotationId],
    references: [crmQuotations.id],
  }),
}));

export const crmAiInsightsRelations = relations(crmAiInsights, ({ one }) => ({
  user: one(users, { fields: [crmAiInsights.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [crmAiInsights.organizationId],
    references: [organizations.id],
  }),
}));

// Payment engine relations
export const paymentProviderConfigsRelations = relations(paymentProviderConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentProviderConfigs.organizationId],
    references: [organizations.id],
  }),
}));

export const paymentLinksRelations = relations(paymentLinks, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentLinks.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [paymentLinks.userId],
    references: [users.id],
  }),
  invoice: one(invoices, {
    fields: [paymentLinks.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [paymentLinks.clientId],
    references: [clients.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentTransactions.paymentId],
    references: [payments.id],
  }),
  organization: one(organizations, {
    fields: [paymentTransactions.organizationId],
    references: [organizations.id],
  }),
}));

// Compliance Center relations
export const complianceAlertsRelations = relations(complianceAlerts, ({ one }) => ({
  user: one(users, {
    fields: [complianceAlerts.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [complianceAlerts.organizationId],
    references: [organizations.id],
  }),
}));

export const taxReportsRelations = relations(taxReports, ({ one }) => ({
  user: one(users, {
    fields: [taxReports.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [taxReports.organizationId],
    references: [organizations.id],
  }),
}));

export const taxCalendarRelations = relations(taxCalendar, ({ one }) => ({
  organization: one(organizations, {
    fields: [taxCalendar.organizationId],
    references: [organizations.id],
  }),
}));

export const complianceSettingsRelations = relations(complianceSettings, ({ one }) => ({
  user: one(users, {
    fields: [complianceSettings.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [complianceSettings.organizationId],
    references: [organizations.id],
  }),
}));

// AI Copilot relations
export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiConversations.organizationId],
    references: [organizations.id],
  }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
  user: one(users, {
    fields: [aiMessages.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiMessages.organizationId],
    references: [organizations.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  user: one(users, {
    fields: [aiInsights.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiInsights.organizationId],
    references: [organizations.id],
  }),
}));

export const aiBusinessHealthRelations = relations(aiBusinessHealth, ({ one }) => ({
  user: one(users, {
    fields: [aiBusinessHealth.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiBusinessHealth.organizationId],
    references: [organizations.id],
  }),
}));

// Onboarding relations
export const onboardingStepsRelations = relations(onboardingSteps, ({ many }) => ({
  progress: many(onboardingProgress),
  tips: many(onboardingTips),
}));

export const onboardingProgressRelations = relations(onboardingProgress, ({ one }) => ({
  user: one(users, {
    fields: [onboardingProgress.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [onboardingProgress.organizationId],
    references: [organizations.id],
  }),
  step: one(onboardingSteps, {
    fields: [onboardingProgress.stepId],
    references: [onboardingSteps.id],
  }),
}));

export const onboardingTipsRelations = relations(onboardingTips, ({ one }) => ({
  step: one(onboardingSteps, {
    fields: [onboardingTips.stepId],
    references: [onboardingSteps.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type InventoryBrand = typeof inventoryBrands.$inferSelect;
export type InventorySupplier = typeof inventorySuppliers.$inferSelect;
export type InventoryWarehouse = typeof inventoryWarehouses.$inferSelect;
export type InventoryProduct = typeof inventoryProducts.$inferSelect;
export type InventoryStock = typeof inventoryStock.$inferSelect;
export type InventoryStockMovement = typeof inventoryStockMovements.$inferSelect;
export type InventoryPurchaseOrder = typeof inventoryPurchaseOrders.$inferSelect;
export type InventoryPurchaseOrderItem = typeof inventoryPurchaseOrderItems.$inferSelect;
export type InventoryStockAdjustment = typeof inventoryStockAdjustments.$inferSelect;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type EtimsConfig = typeof etimsConfig.$inferSelect;
export type EtimsInvoice = typeof etimsInvoices.$inferSelect;
export type EtimsComplianceLog = typeof etimsComplianceLogs.$inferSelect;

// Enterprise foundation types
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApiUsage = typeof apiUsage.$inferSelect;

// Business timeline types
export type BusinessTimelineEvent = typeof businessTimeline.$inferSelect;
export type NewBusinessTimelineEvent = typeof businessTimeline.$inferInsert;
export type TimelineEventType = (typeof timelineEventTypeEnum.enumValues)[number];

// Payment engine types
export type PaymentProviderConfig = typeof paymentProviderConfigs.$inferSelect;
export type PaymentLink = typeof paymentLinks.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type PaymentWebhookLog = typeof paymentWebhookLogs.$inferSelect;

// Compliance Center types
export type ComplianceAlert = typeof complianceAlerts.$inferSelect;
export type TaxReport = typeof taxReports.$inferSelect;
export type TaxCalendar = typeof taxCalendar.$inferSelect;
export type ComplianceSettings = typeof complianceSettings.$inferSelect;

// AI Copilot types
export type AiConversation = typeof aiConversations.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
export type AiInsight = typeof aiInsights.$inferSelect;
export type AiBusinessHealth = typeof aiBusinessHealth.$inferSelect;

// Business Timeline types
export type BusinessTimeline = typeof businessTimeline.$inferSelect;

// Enterprise CRM types
export type CrmCompany = typeof crmCompanies.$inferSelect;
export type CrmContact = typeof crmContacts.$inferSelect;
export type CrmLead = typeof crmLeads.$inferSelect;
export type CrmPipelineStage = typeof crmPipelineStages.$inferSelect;
export type CrmDeal = typeof crmDeals.$inferSelect;
export type CrmActivity = typeof crmActivities.$inferSelect;
export type CrmQuotation = typeof crmQuotations.$inferSelect;
export type CrmQuotationItem = typeof crmQuotationItems.$inferSelect;
export type CrmAiInsight = typeof crmAiInsights.$inferSelect;

// Enterprise CRM enums (TypeScript unions)
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
export type DealStatus = (typeof dealStatusEnum.enumValues)[number];
export type ActivityType = (typeof activityTypeEnum.enumValues)[number];
export type ActivityStatus = (typeof activityStatusEnum.enumValues)[number];
export type QuotationStatus = (typeof quotationStatusEnum.enumValues)[number];
export type QuotationApprovalStatus =
  (typeof quotationApprovalStatusEnum.enumValues)[number];

// Onboarding types
export type OnboardingStep = typeof onboardingSteps.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type OnboardingTip = typeof onboardingTips.$inferSelect;

// Enterprise foundation enums (TypeScript unions)
export type RoleType = (typeof roleTypeEnum.enumValues)[number];
export type MemberStatus = (typeof memberStatusEnum.enumValues)[number];
export type PermissionCategory =
  (typeof permissionCategoryEnum.enumValues)[number];
export type AuditCategory = (typeof auditCategoryEnum.enumValues)[number];
export type NotificationCategory =
  (typeof notificationCategoryEnum.enumValues)[number];
export type NotificationPriority =
  (typeof notificationPriorityEnum.enumValues)[number];
export type ApiKeyStatus = (typeof apiKeyStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type ComplianceHealthScore =
  (typeof complianceHealthScoreEnum.enumValues)[number];
export type ComplianceAlertSeverity =
  (typeof complianceAlertSeverityEnum.enumValues)[number];
export type TaxReportType = (typeof taxReportTypeEnum.enumValues)[number];
export type AiConversationStatus =
  (typeof aiConversationStatusEnum.enumValues)[number];
export type OnboardingStepStatus =
  (typeof onboardingStepStatusEnum.enumValues)[number];

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE — PROCUREMENT (Epic 3)
// ─────────────────────────────────────────────────────────────────────────────
// Every procurement table is multi-tenant: it carries `organizationId` and
// user-scoped ownership. Cross-references to products/suppliers/POs are scoped
// so a tenant can never read or mutate another tenant's procurement data. All
// mutations are gated by RBAC, audited, emit Business Timeline events, and
// integrate with Inventory (stock movements), Bookkeeping (journal entries) and
// the AI Business Copilot (recommendations).

// Purchase Requests
export const procurementPurchaseRequests = pgTable(
  "procurement_purchase_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    requestNumber: text("request_number").notNull(),
    title: text("title").notNull(),
    department: text("department"),
    requesterId: text("requester_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: procurementRequestStatusEnum("status").default("draft").notNull(),
    priority: text("priority").default("medium").notNull(),
    notes: text("notes"),
    requestedDate: timestamp("requested_date", { mode: "date" }).notNull(),
    neededBy: timestamp("needed_by", { mode: "date" }),
    currency: text("currency").default("KES").notNull(),
    totalEstimated: decimal("total_estimated", { precision: 14, scale: 2 }).default("0"),
    approvedBy: text("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("ppr_org_idx").on(table.organizationId),
    userIdx: index("ppr_user_idx").on(table.userId),
    numberIdx: uniqueIndex("unique_org_ppr_number").on(
      table.organizationId,
      table.requestNumber
    ),
    statusIdx: index("ppr_status_idx").on(table.status),
  })
);

export const procurementPurchaseRequestItems = pgTable(
  "procurement_purchase_request_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    requestId: text("request_id")
      .notNull()
      .references(() => procurementPurchaseRequests.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => inventoryProducts.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
    unit: text("unit").default("pcs"),
    estUnitCost: decimal("est_unit_cost", { precision: 12, scale: 2 }).default("0"),
    lineTotal: decimal("line_total", { precision: 14, scale: 2 }).default("0"),
  },
  (table) => ({
    orgIdx: index("ppri_org_idx").on(table.organizationId),
    requestIdx: index("ppri_request_idx").on(table.requestId),
  })
);

// Request for Quotations (RFQs)
export const procurementRfqs = pgTable(
  "procurement_rfqs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    rfqNumber: text("rfq_number").notNull(),
    title: text("title").notNull(),
    status: rfqStatusEnum("status").default("draft").notNull(),
    issuedDate: timestamp("issued_date", { mode: "date" }),
    validUntil: timestamp("valid_until", { mode: "date" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("prfq_org_idx").on(table.organizationId),
    userIdx: index("prfq_user_idx").on(table.userId),
    numberIdx: uniqueIndex("unique_org_rfq_number").on(
      table.organizationId,
      table.rfqNumber
    ),
    statusIdx: index("prfq_status_idx").on(table.status),
  })
);

export const procurementRfqItems = pgTable(
  "procurement_rfq_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    rfqId: text("rfq_id")
      .notNull()
      .references(() => procurementRfqs.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => inventoryProducts.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
    unit: text("unit").default("pcs"),
  },
  (table) => ({
    orgIdx: index("prfqi_org_idx").on(table.organizationId),
    rfqIdx: index("prfqi_rfq_idx").on(table.rfqId),
  })
);

export const procurementRfqSuppliers = pgTable(
  "procurement_rfq_suppliers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    rfqId: text("rfq_id")
      .notNull()
      .references(() => procurementRfqs.id, { onDelete: "cascade" }),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => inventorySuppliers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("prfqs_org_idx").on(table.organizationId),
    rfqIdx: index("prfqs_rfq_idx").on(table.rfqId),
    supplierIdx: index("prfqs_supplier_idx").on(table.supplierId),
    uniqueRfqSupplier: uniqueIndex("unique_rfq_supplier").on(
      table.rfqId,
      table.supplierId
    ),
  })
);

// Supplier Quotations
export const procurementSupplierQuotations = pgTable(
  "procurement_supplier_quotations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    rfqId: text("rfq_id").references(() => procurementRfqs.id, {
      onDelete: "set null",
    }),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => inventorySuppliers.id, { onDelete: "cascade" }),
    quotationNumber: text("quotation_number").notNull(),
    status: supplierQuotationStatusEnum("status").default("received").notNull(),
    receivedDate: timestamp("received_date", { mode: "date" }).notNull(),
    validUntil: timestamp("valid_until", { mode: "date" }),
    currency: text("currency").default("KES").notNull(),
    subtotal: decimal("subtotal", { precision: 14, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0"),
    total: decimal("total", { precision: 14, scale: 2 }).default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("psq_org_idx").on(table.organizationId),
    userIdx: index("psq_user_idx").on(table.userId),
    rfqIdx: index("psq_rfq_idx").on(table.rfqId),
    supplierIdx: index("psq_supplier_idx").on(table.supplierId),
    numberIdx: uniqueIndex("unique_org_psq_number").on(
      table.organizationId,
      table.quotationNumber
    ),
    statusIdx: index("psq_status_idx").on(table.status),
  })
);

export const procurementSupplierQuotationItems = pgTable(
  "procurement_supplier_quotation_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    quotationId: text("quotation_id")
      .notNull()
      .references(() => procurementSupplierQuotations.id, { onDelete: "cascade" }),
    rfqItemId: text("rfq_item_id").references(() => procurementRfqItems.id, {
      onDelete: "set null",
    }),
    productId: text("product_id").references(() => inventoryProducts.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
    unit: text("unit").default("pcs"),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    lineTotal: decimal("line_total", { precision: 14, scale: 2 }).default("0"),
  },
  (table) => ({
    orgIdx: index("psqi_org_idx").on(table.organizationId),
    quotationIdx: index("psqi_quotation_idx").on(table.quotationId),
  })
);

// Purchase Orders (full procurement POs; integrated with inventory)
export const procurementPurchaseOrders = pgTable(
  "procurement_purchase_orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    poNumber: text("po_number").notNull(),
    requestId: text("request_id").references(() => procurementPurchaseRequests.id, {
      onDelete: "set null",
    }),
    rfqId: text("rfq_id").references(() => procurementRfqs.id, {
      onDelete: "set null",
    }),
    supplierId: text("supplier_id").references(() => inventorySuppliers.id, {
      onDelete: "set null",
    }),
    status: procurementPOStatusEnum("status").default("draft").notNull(),
    orderDate: timestamp("order_date", { mode: "date" }).notNull(),
    expectedDate: timestamp("expected_date", { mode: "date" }),
    currency: text("currency").default("KES").notNull(),
    subtotal: decimal("subtotal", { precision: 14, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0"),
    total: decimal("total", { precision: 14, scale: 2 }).default("0"),
    notes: text("notes"),
    // Approval workflow
    approvalStatus: approvalLevelStatusEnum("approval_status").default("pending").notNull(),
    currentApprovalLevel: integer("current_approval_level").default(0),
    approvedBy: text("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    rejectionReason: text("rejection_reason"),
    budgetId: text("budget_id").references(() => procurementBudgets.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("ppo_org_idx").on(table.organizationId),
    userIdx: index("ppo_user_idx").on(table.userId),
    supplierIdx: index("ppo_supplier_idx").on(table.supplierId),
    requestIdx: index("ppo_request_idx").on(table.requestId),
    numberIdx: uniqueIndex("unique_org_ppo_number").on(
      table.organizationId,
      table.poNumber
    ),
    statusIdx: index("ppo_status_idx").on(table.status),
  })
);

export const procurementPurchaseOrderItems = pgTable(
  "procurement_purchase_order_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    purchaseOrderId: text("purchase_order_id")
      .notNull()
      .references(() => procurementPurchaseOrders.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => inventoryProducts.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
    unit: text("unit").default("pcs"),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0"),
    lineTotal: decimal("line_total", { precision: 14, scale: 2 }).default("0"),
    receivedQuantity: decimal("received_quantity", { precision: 12, scale: 2 }).default("0"),
    warehouseId: text("warehouse_id").references(() => inventoryWarehouses.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    orgIdx: index("ppoi_org_idx").on(table.organizationId),
    poIdx: index("ppoi_po_idx").on(table.purchaseOrderId),
    productIdx: index("ppoi_product_idx").on(table.productId),
  })
);

// Multi-level approval workflow (generic, used by purchase requests and POs)
export const procurementApprovals = pgTable(
  "procurement_approvals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    resourceType: text("resource_type").notNull(), // purchase_request | purchase_order
    resourceId: text("resource_id").notNull(),
    level: integer("level").notNull(),
    requiredRoleType: roleTypeEnum("required_role_type").notNull(),
    status: approvalLevelStatusEnum("status").default("pending").notNull(),
    approverId: text("approver_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { mode: "date" }),
    comments: text("comments"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("pa_org_idx").on(table.organizationId),
    resourceIdx: index("pa_resource_idx").on(table.resourceType, table.resourceId),
    statusIdx: index("pa_status_idx").on(table.status),
  })
);

// Goods Received Notes (GRN)
export const procurementGrns = pgTable(
  "procurement_grns",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    grnNumber: text("grn_number").notNull(),
    purchaseOrderId: text("purchase_order_id")
      .notNull()
      .references(() => procurementPurchaseOrders.id, { onDelete: "cascade" }),
    supplierId: text("supplier_id").references(() => inventorySuppliers.id, {
      onDelete: "set null",
    }),
    receivedDate: timestamp("received_date", { mode: "date" }).notNull(),
    status: grnStatusEnum("status").default("draft").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("pgrn_org_idx").on(table.organizationId),
    userIdx: index("pgrn_user_idx").on(table.userId),
    poIdx: index("pgrn_po_idx").on(table.purchaseOrderId),
    numberIdx: uniqueIndex("unique_org_grn_number").on(
      table.organizationId,
      table.grnNumber
    ),
    statusIdx: index("pgrn_status_idx").on(table.status),
  })
);

export const procurementGrnItems = pgTable(
  "procurement_grn_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    grnId: text("grn_id")
      .notNull()
      .references(() => procurementGrns.id, { onDelete: "cascade" }),
    poItemId: text("po_item_id")
      .notNull()
      .references(() => procurementPurchaseOrderItems.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => inventoryProducts.id, {
      onDelete: "set null",
    }),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => inventoryWarehouses.id, { onDelete: "cascade" }),
    quantityReceived: decimal("quantity_received", { precision: 12, scale: 2 }).notNull(),
    quantityDamaged: decimal("quantity_damaged", { precision: 12, scale: 2 }).default("0"),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).default("0"),
  },
  (table) => ({
    orgIdx: index("pgrni_org_idx").on(table.organizationId),
    grnIdx: index("pgrni_grn_idx").on(table.grnId),
    poItemIdx: index("pgrni_po_item_idx").on(table.poItemId),
  })
);

// Supplier Returns
export const procurementSupplierReturns = pgTable(
  "procurement_supplier_returns",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    returnNumber: text("return_number").notNull(),
    grnId: text("grn_id").references(() => procurementGrns.id, {
      onDelete: "set null",
    }),
    purchaseOrderId: text("purchase_order_id").references(() => procurementPurchaseOrders.id, {
      onDelete: "set null",
    }),
    supplierId: text("supplier_id").references(() => inventorySuppliers.id, {
      onDelete: "set null",
    }),
    returnDate: timestamp("return_date", { mode: "date" }).notNull(),
    status: supplierReturnStatusEnum("status").default("draft").notNull(),
    reason: text("reason"),
    total: decimal("total", { precision: 14, scale: 2 }).default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("psr_org_idx").on(table.organizationId),
    userIdx: index("psr_user_idx").on(table.userId),
    grnIdx: index("psr_grn_idx").on(table.grnId),
    supplierIdx: index("psr_supplier_idx").on(table.supplierId),
    numberIdx: uniqueIndex("unique_org_sr_number").on(
      table.organizationId,
      table.returnNumber
    ),
    statusIdx: index("psr_status_idx").on(table.status),
  })
);

export const procurementSupplierReturnItems = pgTable(
  "procurement_supplier_return_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    returnId: text("return_id")
      .notNull()
      .references(() => procurementSupplierReturns.id, { onDelete: "cascade" }),
    grnItemId: text("grn_item_id").references(() => procurementGrnItems.id, {
      onDelete: "set null",
    }),
    productId: text("product_id").references(() => inventoryProducts.id, {
      onDelete: "set null",
    }),
    warehouseId: text("warehouse_id").references(() => inventoryWarehouses.id, {
      onDelete: "set null",
    }),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).default("0"),
    lineTotal: decimal("line_total", { precision: 14, scale: 2 }).default("0"),
  },
  (table) => ({
    orgIdx: index("psri_org_idx").on(table.organizationId),
    returnIdx: index("psri_return_idx").on(table.returnId),
  })
);

// Purchase Invoices (from suppliers)
export const procurementPurchaseInvoices = pgTable(
  "procurement_purchase_invoices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => inventorySuppliers.id, { onDelete: "cascade" }),
    purchaseOrderId: text("purchase_order_id").references(() => procurementPurchaseOrders.id, {
      onDelete: "set null",
    }),
    grnId: text("grn_id").references(() => procurementGrns.id, {
      onDelete: "set null",
    }),
    issueDate: timestamp("issue_date", { mode: "date" }).notNull(),
    dueDate: timestamp("due_date", { mode: "date" }).notNull(),
    currency: text("currency").default("KES").notNull(),
    subtotal: decimal("subtotal", { precision: 14, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0"),
    total: decimal("total", { precision: 14, scale: 2 }).default("0"),
    amountPaid: decimal("amount_paid", { precision: 14, scale: 2 }).default("0"),
    status: purchaseInvoiceStatusEnum("status").default("received").notNull(),
    journalEntryId: text("journal_entry_id").references(() => journalEntries.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("ppi_org_idx").on(table.organizationId),
    userIdx: index("ppi_user_idx").on(table.userId),
    supplierIdx: index("ppi_supplier_idx").on(table.supplierId),
    poIdx: index("ppi_po_idx").on(table.purchaseOrderId),
    numberIdx: uniqueIndex("unique_org_ppi_number").on(
      table.organizationId,
      table.invoiceNumber
    ),
    statusIdx: index("ppi_status_idx").on(table.status),
  })
);

export const procurementPurchaseInvoiceItems = pgTable(
  "procurement_purchase_invoice_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    purchaseInvoiceId: text("purchase_invoice_id")
      .notNull()
      .references(() => procurementPurchaseInvoices.id, { onDelete: "cascade" }),
    poItemId: text("po_item_id").references(() => procurementPurchaseOrderItems.id, {
      onDelete: "set null",
    }),
    productId: text("product_id").references(() => inventoryProducts.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("16"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0"),
    lineTotal: decimal("line_total", { precision: 14, scale: 2 }).default("0"),
  },
  (table) => ({
    orgIdx: index("ppii_org_idx").on(table.organizationId),
    invoiceIdx: index("ppii_invoice_idx").on(table.purchaseInvoiceId),
  })
);

// Supplier Payments
export const procurementSupplierPayments = pgTable(
  "procurement_supplier_payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    paymentNumber: text("payment_number").notNull(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => inventorySuppliers.id, { onDelete: "cascade" }),
    purchaseInvoiceId: text("purchase_invoice_id").references(() => procurementPurchaseInvoices.id, {
      onDelete: "set null",
    }),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").default("KES").notNull(),
    method: paymentMethodEnum("method").notNull(),
    status: supplierPaymentStatusEnum("status").default("pending").notNull(),
    paymentDate: timestamp("payment_date", { mode: "date" }).notNull(),
    reference: text("reference"),
    journalEntryId: text("journal_entry_id").references(() => journalEntries.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("psp_org_idx").on(table.organizationId),
    userIdx: index("psp_user_idx").on(table.userId),
    supplierIdx: index("psp_supplier_idx").on(table.supplierId),
    invoiceIdx: index("psp_invoice_idx").on(table.purchaseInvoiceId),
    numberIdx: uniqueIndex("unique_org_psp_number").on(
      table.organizationId,
      table.paymentNumber
    ),
    statusIdx: index("psp_status_idx").on(table.status),
  })
);

// Budget Control
export const procurementBudgets = pgTable(
  "procurement_budgets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    period: budgetPeriodEnum("period").default("monthly").notNull(),
    periodStart: timestamp("period_start", { mode: "date" }).notNull(),
    periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
    currency: text("currency").default("KES").notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    spent: decimal("spent", { precision: 14, scale: 2 }).default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("pb_org_idx").on(table.organizationId),
    userIdx: index("pb_user_idx").on(table.userId),
    periodIdx: index("pb_period_idx").on(table.periodStart, table.periodEnd),
  })
);

// AI Purchase Recommendations & Low-stock Suggestions
export const procurementAiRecommendations = pgTable(
  "procurement_ai_recommendations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(), // reorder | low_stock | consolidate | substitute | supplier
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: text("priority").default("normal").notNull(),
    productId: text("product_id").references(() => inventoryProducts.id, {
      onDelete: "set null",
    }),
    recommendedSupplierId: text("recommended_supplier_id").references(() => inventorySuppliers.id, {
      onDelete: "set null",
    }),
    recommendedQty: decimal("recommended_qty", { precision: 12, scale: 2 }),
    estimatedCost: decimal("estimated_cost", { precision: 14, scale: 2 }),
    status: recommendationStatusEnum("status").default("open").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("par_org_idx").on(table.organizationId),
    typeIdx: index("par_type_idx").on(table.type),
    statusIdx: index("par_status_idx").on(table.status),
    productIdx: index("par_product_idx").on(table.productId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE — HUMAN RESOURCE MANAGEMENT (HR) (Epic 5)
// ─────────────────────────────────────────────────────────────────────────────
// Every HR table is multi-tenant: it carries `organizationId` and user-scoped
// ownership. Cross-references to employees/departments/positions are scoped so
// a tenant can never read or mutate another tenant's HR data. All mutations are
// gated by RBAC, audited, emit Business Timeline events, and integrate with
// Notifications for reminders and approvals.

// HR Enums
export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "on_leave",
  "suspended",
  "terminated",
  "resigned",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "permanent",
  "contract",
  "part_time",
  "intern",
  "casual",
]);

export const contractTypeEnum = pgEnum("contract_type", [
  "permanent",
  "fixed_term",
  "probation",
  "internship",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "annual",
  "sick",
  "maternity",
  "paternity",
  "compassionate",
  "unpaid",
  "study",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "half_day",
  "on_leave",
]);

export const shiftStatusEnum = pgEnum("shift_status", [
  "scheduled",
  "active",
  "completed",
  "cancelled",
]);

export const applicantStatusEnum = pgEnum("applicant_status", [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
]);

export const onboardingTaskStatusEnum = pgEnum("onboarding_task_status", [
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);

export const offboardingTypeEnum = pgEnum("offboarding_type", [
  "resignation",
  "termination",
  "retirement",
  "contract_end",
]);

export const performanceReviewStatusEnum = pgEnum("performance_review_status", [
  "draft",
  "in_progress",
  "completed",
  "cancelled",
]);

export const trainingStatusEnum = pgEnum("training_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "id",
  "passport",
  "kra_pin",
  "nssf",
  "nhif",
  "contract",
  "certificate",
  "resume",
  "other",
]);

export const orgChartNodeTypeEnum = pgEnum("org_chart_node_type", [
  "department",
  "position",
  "employee",
]);

export const aiHrInsightTypeEnum = pgEnum("ai_hr_insight_type", [
  "turnover_risk",
  "leave_pattern",
  "training_gap",
  "attendance_anomaly",
  "performance_trend",
  "headcount_forecast",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Payroll enums (Epic 6)
// ─────────────────────────────────────────────────────────────────────────────

export const payrollPeriodStatusEnum = pgEnum("payroll_period_status", [
  "open",
  "processing",
  "closed",
  "locked",
]);

export const payrollRunStatusEnum = pgEnum("payroll_run_status", [
  "draft",
  "calculated",
  "pending_approval",
  "approved",
  "rejected",
  "paid",
  "cancelled",
]);

export const payslipStatusEnum = pgEnum("payslip_status", [
  "draft",
  "generated",
  "sent",
  "viewed",
]);

export const payrollItemTypeEnum = pgEnum("payroll_item_type", [
  "earnings",
  "allowance",
  "deduction",
  "tax_paye",
  "tax_nssf",
  "tax_nhif",
  "tax_pension",
  "tax_housing_levy",
  "overtime",
  "bonus",
]);

export const salaryStructureTypeEnum = pgEnum("salary_structure_type", [
  "monthly",
  "bi_weekly",
  "weekly",
  "daily",
  "contract",
]);

export const pensionProviderTypeEnum = pgEnum("pension_provider_type", [
  "nssf",
  "private_provider",
  "corporate_scheme",
]);

// Departments
export const hrDepartments = pgTable("hr_departments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  parentDepartmentId: text("parent_department_id").references(() => hrDepartments as any, {
    onDelete: "set null",
  }),
  managerId: text("manager_id").references(() => hrEmployees as any, {
    onDelete: "set null",
  }),
  costCenter: text("cost_center"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_departments_org_idx").on(table.organizationId),
  userIdx: index("hr_departments_user_idx").on(table.userId),
  parentIdx: index("hr_departments_parent_idx").on(table.parentDepartmentId),
})) as any;

// Positions
export const hrPositions = pgTable("hr_positions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  departmentId: text("department_id")
    .notNull()
    .references(() => hrDepartments as any, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  employmentType: employmentTypeEnum("employment_type").notNull(),
  contractType: contractTypeEnum("contract_type"),
  salaryMin: decimal("salary_min", { precision: 12, scale: 2 }),
  salaryMax: decimal("salary_max", { precision: 12, scale: 2 }),
  currency: text("currency").default("KES").notNull(),
  reportsToPositionId: text("reports_to_position_id").references(() => hrPositions as any, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_positions_org_idx").on(table.organizationId),
  userIdx: index("hr_positions_user_idx").on(table.userId),
  deptIdx: index("hr_positions_dept_idx").on(table.departmentId),
})) as any;

// Employees
export const hrEmployees = pgTable("hr_employees", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeNumber: text("employee_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Kenya"),
  dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
  gender: text("gender"),
  maritalStatus: text("marital_status"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  departmentId: text("department_id").references(() => hrDepartments as any, {
    onDelete: "set null",
  }),
  positionId: text("position_id").references(() => hrPositions as any, {
    onDelete: "set null",
  }),
  managerId: text("manager_id").references(() => hrEmployees as any, {
    onDelete: "set null",
  }),
  employmentType: employmentTypeEnum("employment_type").notNull(),
  status: employeeStatusEnum("status").default("active").notNull(),
  hireDate: timestamp("hire_date", { mode: "date" }).notNull(),
  terminationDate: timestamp("termination_date", { mode: "date" }),
  probationEndDate: timestamp("probation_end_date", { mode: "date" }),
  contractEndDate: timestamp("contract_end_date", { mode: "date" }),
  salary: decimal("salary", { precision: 12, scale: 2 }),
  currency: text("currency").default("KES").notNull(),
  avatar: text("avatar"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_employees_org_idx").on(table.organizationId),
  userIdx: index("hr_employees_user_idx").on(table.userId),
  numberIdx: uniqueIndex("unique_org_employee_number").on(table.organizationId, table.employeeNumber),
  deptIdx: index("hr_employees_dept_idx").on(table.departmentId),
  positionIdx: index("hr_employees_position_idx").on(table.positionId),
  statusIdx: index("hr_employees_status_idx").on(table.status),
})) as any;

// Employment Contracts
export const hrEmploymentContracts = pgTable("hr_employment_contracts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  contractNumber: text("contract_number").notNull(),
  contractType: contractTypeEnum("contract_type").notNull(),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }),
  salary: decimal("salary", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("KES").notNull(),
  benefits: jsonb("benefits").$type<Record<string, unknown>>().default({}),
  terms: text("terms"),
  status: text("status").default("active").notNull(),
  signedAt: timestamp("signed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_contracts_org_idx").on(table.organizationId),
  userIdx: index("hr_contracts_user_idx").on(table.userId),
  employeeIdx: index("hr_contracts_employee_idx").on(table.employeeId),
  numberIdx: uniqueIndex("unique_org_contract_number").on(table.organizationId, table.contractNumber),
}));

// Attendance Records
export const hrAttendanceRecords = pgTable("hr_attendance_records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  status: attendanceStatusEnum("status").notNull(),
  clockIn: timestamp("clock_in", { mode: "date" }),
  clockOut: timestamp("clock_out", { mode: "date" }),
  breakMinutes: integer("break_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_attendance_org_idx").on(table.organizationId),
  userIdx: index("hr_attendance_user_idx").on(table.userId),
  employeeIdx: index("hr_attendance_employee_idx").on(table.employeeId),
  dateIdx: index("hr_attendance_date_idx").on(table.date),
  employeeDateIdx: uniqueIndex("unique_hr_attendance_employee_date").on(table.employeeId, table.date),
}));

// Leave Requests
export const hrLeaveRequests = pgTable("hr_leave_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }).notNull(),
  days: decimal("days", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").default("pending").notNull(),
  approvedBy: text("approved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_leave_org_idx").on(table.organizationId),
  userIdx: index("hr_leave_user_idx").on(table.userId),
  employeeIdx: index("hr_leave_employee_idx").on(table.employeeId),
  statusIdx: index("hr_leave_status_idx").on(table.status),
}));

// Leave Balances
export const hrLeaveBalances = pgTable("hr_leave_balances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  year: integer("year").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).notNull(),
  usedDays: decimal("used_days", { precision: 5, scale: 2 }).default("0").notNull(),
  carriedDays: decimal("carried_days", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_leave_balances_org_idx").on(table.organizationId),
  userIdx: index("hr_leave_balances_user_idx").on(table.userId),
  employeeIdx: index("hr_leave_balances_employee_idx").on(table.employeeId),
  employeeYearIdx: uniqueIndex("unique_hr_leave_balance").on(table.employeeId, table.leaveType, table.year),
}));

// Shifts
export const hrShifts = pgTable("hr_shifts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakMinutes: integer("break_minutes").default(0),
  color: text("color").default("#16a34a"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_shifts_org_idx").on(table.organizationId),
  userIdx: index("hr_shifts_user_idx").on(table.userId),
}));

// Shift Assignments
export const hrShiftAssignments = pgTable("hr_shift_assignments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  shiftId: text("shift_id")
    .notNull()
    .references(() => hrShifts.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  status: shiftStatusEnum("status").default("scheduled").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_shift_assignments_org_idx").on(table.organizationId),
  userIdx: index("hr_shift_assignments_user_idx").on(table.userId),
  shiftIdx: index("hr_shift_assignments_shift_idx").on(table.shiftId),
  employeeIdx: index("hr_shift_assignments_employee_idx").on(table.employeeId),
  dateIdx: index("hr_shift_assignments_date_idx").on(table.date),
  employeeDateIdx: uniqueIndex("unique_hr_shift_assignment").on(table.employeeId, table.date),
}));

// Applicants
export const hrApplicants = pgTable("hr_applicants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  positionId: text("position_id").references(() => hrPositions.id, {
    onDelete: "set null",
  }),
  departmentId: text("department_id").references(() => hrDepartments.id, {
    onDelete: "set null",
  }),
  status: applicantStatusEnum("status").default("applied").notNull(),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  expectedSalary: decimal("expected_salary", { precision: 12, scale: 2 }),
  availabilityDate: timestamp("availability_date", { mode: "date" }),
  source: text("source"),
  tags: jsonb("tags").$type<string[]>().default([]),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_applicants_org_idx").on(table.organizationId),
  userIdx: index("hr_applicants_user_idx").on(table.userId),
  positionIdx: index("hr_applicants_position_idx").on(table.positionId),
  statusIdx: index("hr_applicants_status_idx").on(table.status),
}));

// Applicant Documents
export const hrApplicantDocuments = pgTable("hr_applicant_documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  applicantId: text("applicant_id")
    .notNull()
    .references(() => hrApplicants.id, { onDelete: "cascade" }),
  documentType: documentTypeEnum("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_applicant_docs_org_idx").on(table.organizationId),
  applicantIdx: index("hr_applicant_docs_applicant_idx").on(table.applicantId),
}));

// Onboarding Checklists
export const hrOnboardingChecklists = pgTable("hr_onboarding_checklists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  task: text("task").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { mode: "date" }),
  status: onboardingTaskStatusEnum("status").default("pending").notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_onboarding_org_idx").on(table.organizationId),
  userIdx: index("hr_onboarding_user_idx").on(table.userId),
  employeeIdx: index("hr_onboarding_employee_idx").on(table.employeeId),
}));

// Offboarding Records
export const hrOffboardingRecords = pgTable("hr_offboarding_records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  offboardingType: offboardingTypeEnum("offboarding_type").notNull(),
  lastWorkingDate: timestamp("last_working_date", { mode: "date" }).notNull(),
  reason: text("reason"),
  noticePeriodDays: integer("notice_period_days"),
  returnEquipment: jsonb("return_equipment").$type<Record<string, unknown>>().default({}),
  exitInterviewNotes: text("exit_interview_notes"),
  clearanceCompleted: boolean("clearance_completed").default(false).notNull(),
  clearedAt: timestamp("cleared_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_offboarding_org_idx").on(table.organizationId),
  userIdx: index("hr_offboarding_user_idx").on(table.userId),
  employeeIdx: index("hr_offboarding_employee_idx").on(table.employeeId),
}));

// Performance Reviews
export const hrPerformanceReviews = pgTable("hr_performance_reviews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewPeriodStart: timestamp("review_period_start", { mode: "date" }).notNull(),
  reviewPeriodEnd: timestamp("review_period_end", { mode: "date" }).notNull(),
  overallRating: decimal("overall_rating", { precision: 3, scale: 1 }),
  status: performanceReviewStatusEnum("status").default("draft").notNull(),
  strengths: text("strengths"),
  areasForImprovement: text("areas_for_improvement"),
  goals: jsonb("goals").$type<Record<string, unknown>[]>().default([]),
  comments: text("comments"),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_reviews_org_idx").on(table.organizationId),
  userIdx: index("hr_reviews_user_idx").on(table.userId),
  employeeIdx: index("hr_reviews_employee_idx").on(table.employeeId),
  reviewerIdx: index("hr_reviews_reviewer_idx").on(table.reviewerId),
  statusIdx: index("hr_reviews_status_idx").on(table.status),
}));

// Trainings
export const hrTrainings = pgTable("hr_trainings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  trainer: text("trainer"),
  location: text("location"),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }).notNull(),
  capacity: integer("capacity"),
  cost: decimal("cost", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").default("KES").notNull(),
  status: trainingStatusEnum("status").default("scheduled").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_trainings_org_idx").on(table.organizationId),
  userIdx: index("hr_trainings_user_idx").on(table.userId),
  statusIdx: index("hr_trainings_status_idx").on(table.status),
}));

// Training Enrollments
export const hrTrainingEnrollments = pgTable("hr_training_enrollments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  trainingId: text("training_id")
    .notNull()
    .references(() => hrTrainings.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  status: trainingStatusEnum("status").default("scheduled").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }),
  feedback: text("feedback"),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_training_enrollments_org_idx").on(table.organizationId),
  userIdx: index("hr_training_enrollments_user_idx").on(table.userId),
  trainingIdx: index("hr_training_enrollments_training_idx").on(table.trainingId),
  employeeIdx: index("hr_training_enrollments_employee_idx").on(table.employeeId),
  trainingEmployeeIdx: uniqueIndex("unique_hr_training_enrollment").on(table.trainingId, table.employeeId),
}));

// Employee Documents
export const hrEmployeeDocuments = pgTable("hr_employee_documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  documentType: documentTypeEnum("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_employee_docs_org_idx").on(table.organizationId),
  userIdx: index("hr_employee_docs_user_idx").on(table.userId),
  employeeIdx: index("hr_employee_docs_employee_idx").on(table.employeeId),
}));

// Organization Chart
export const hrOrganizationChart = pgTable("hr_organization_chart", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  nodeType: orgChartNodeTypeEnum("node_type").notNull(),
  nodeId: text("node_id").notNull(),
  parentNodeId: text("parent_node_id"),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_org_chart_org_idx").on(table.organizationId),
  userIdx: index("hr_org_chart_user_idx").on(table.userId),
  nodeIdx: index("hr_org_chart_node_idx").on(table.nodeType, table.nodeId),
  parentIdx: index("hr_org_chart_parent_idx").on(table.parentNodeId),
}));

// HR AI Insights
export const hrAiInsights = pgTable("hr_ai_insights", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: aiHrInsightTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("normal").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  read: boolean("read").default(false).notNull(),
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_ai_insights_org_idx").on(table.organizationId),
  userIdx: index("hr_ai_insights_user_idx").on(table.userId),
  typeIdx: index("hr_ai_insights_type_idx").on(table.type),
}));

// HR AI Reminders
export const hrAiReminders = pgTable("hr_ai_reminders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  reminderType: text("reminder_type").notNull(),
  dueDate: timestamp("due_date", { mode: "date" }).notNull(),
  relatedResourceType: text("related_resource_type"),
  relatedResourceId: text("related_resource_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  sent: boolean("sent").default(false).notNull(),
  sentAt: timestamp("sent_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("hr_ai_reminders_org_idx").on(table.organizationId),
  userIdx: index("hr_ai_reminders_user_idx").on(table.userId),
  dueIdx: index("hr_ai_reminders_due_idx").on(table.dueDate),
}));

// ── HR relations ───────────────────────────────────────────────────────────────

export const hrDepartmentsRelations = relations(hrDepartments, ({ one, many }) => ({
  user: one(users, { fields: [hrDepartments.userId], references: [users.id] }),
  parent: one(hrDepartments, {
    fields: [hrDepartments.parentDepartmentId],
    references: [hrDepartments.id],
  }),
  children: many(hrDepartments),
  positions: many(hrPositions),
  employees: many(hrEmployees),
  manager: one(hrEmployees, {
    fields: [hrDepartments.managerId],
    references: [hrEmployees.id],
  }),
}));

export const hrPositionsRelations = relations(hrPositions, ({ one, many }) => ({
  user: one(users, { fields: [hrPositions.userId], references: [users.id] }),
  department: one(hrDepartments, {
    fields: [hrPositions.departmentId],
    references: [hrDepartments.id],
  }),
  reportsTo: one(hrPositions, {
    fields: [hrPositions.reportsToPositionId],
    references: [hrPositions.id],
  }),
  employees: many(hrEmployees),
  applicants: many(hrApplicants),
}));

export const hrEmployeesRelations = relations(hrEmployees, ({ one, many }) => ({
  user: one(users, { fields: [hrEmployees.userId], references: [users.id] }),
  department: one(hrDepartments, {
    fields: [hrEmployees.departmentId],
    references: [hrDepartments.id],
  }),
  position: one(hrPositions, {
    fields: [hrEmployees.positionId],
    references: [hrPositions.id],
  }),
  manager: one(hrEmployees, {
    fields: [hrEmployees.managerId],
    references: [hrEmployees.id],
  }),
  contracts: many(hrEmploymentContracts),
  attendanceRecords: many(hrAttendanceRecords),
  leaveRequests: many(hrLeaveRequests),
  leaveBalances: many(hrLeaveBalances),
  shiftAssignments: many(hrShiftAssignments),
  performanceReviews: many(hrPerformanceReviews),
  trainingEnrollments: many(hrTrainingEnrollments),
  documents: many(hrEmployeeDocuments),
  onboardingChecklists: many(hrOnboardingChecklists),
  offboardingRecords: many(hrOffboardingRecords),
  directReports: many(hrEmployees),
}));

export const hrEmploymentContractsRelations = relations(hrEmploymentContracts, ({ one }) => ({
  user: one(users, { fields: [hrEmploymentContracts.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [hrEmploymentContracts.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const hrAttendanceRecordsRelations = relations(hrAttendanceRecords, ({ one }) => ({
  user: one(users, { fields: [hrAttendanceRecords.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [hrAttendanceRecords.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const hrLeaveRequestsRelations = relations(hrLeaveRequests, ({ one }) => ({
  user: one(users, { fields: [hrLeaveRequests.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [hrLeaveRequests.employeeId],
    references: [hrEmployees.id],
  }),
  approver: one(users, {
    fields: [hrLeaveRequests.approvedBy],
    references: [users.id],
  }),
}));

export const hrLeaveBalancesRelations = relations(hrLeaveBalances, ({ one }) => ({
  user: one(users, { fields: [hrLeaveBalances.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [hrLeaveBalances.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const hrShiftsRelations = relations(hrShifts, ({ one, many }) => ({
  user: one(users, { fields: [hrShifts.userId], references: [users.id] }),
  assignments: many(hrShiftAssignments),
}));

export const hrShiftAssignmentsRelations = relations(hrShiftAssignments, ({ one }) => ({
  user: one(users, { fields: [hrShiftAssignments.userId], references: [users.id] }),
  shift: one(hrShifts, {
    fields: [hrShiftAssignments.shiftId],
    references: [hrShifts.id],
  }),
  employee: one(hrEmployees, {
    fields: [hrShiftAssignments.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const hrApplicantsRelations = relations(hrApplicants, ({ one, many }) => ({
  user: one(users, { fields: [hrApplicants.userId], references: [users.id] }),
  position: one(hrPositions, {
    fields: [hrApplicants.positionId],
    references: [hrPositions.id],
  }),
  department: one(hrDepartments, {
    fields: [hrApplicants.departmentId],
    references: [hrDepartments.id],
  }),
  documents: many(hrApplicantDocuments),
}));

export const hrApplicantDocumentsRelations = relations(hrApplicantDocuments, ({ one }) => ({
  applicant: one(hrApplicants, {
    fields: [hrApplicantDocuments.applicantId],
    references: [hrApplicants.id],
  }),
}));

export const hrOnboardingChecklistsRelations = relations(hrOnboardingChecklists, ({ one }) => ({
  user: one(users, { fields: [hrOnboardingChecklists.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [hrOnboardingChecklists.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const hrOffboardingRecordsRelations = relations(hrOffboardingRecords, ({ one }) => ({
  user: one(users, { fields: [hrOffboardingRecords.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [hrOffboardingRecords.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const hrPerformanceReviewsRelations = relations(hrPerformanceReviews, ({ one }) => ({
  user: one(users, { fields: [hrPerformanceReviews.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [hrPerformanceReviews.employeeId],
    references: [hrEmployees.id],
  }),
  reviewer: one(users, {
    fields: [hrPerformanceReviews.reviewerId],
    references: [users.id],
  }),
}));

export const hrTrainingsRelations = relations(hrTrainings, ({ one, many }) => ({
  user: one(users, { fields: [hrTrainings.userId], references: [users.id] }),
  enrollments: many(hrTrainingEnrollments),
}));

export const hrTrainingEnrollmentsRelations = relations(hrTrainingEnrollments, ({ one }) => ({
  user: one(users, { fields: [hrTrainingEnrollments.userId], references: [users.id] }),
  training: one(hrTrainings, {
    fields: [hrTrainingEnrollments.trainingId],
    references: [hrTrainings.id],
  }),
  employee: one(hrEmployees, {
    fields: [hrTrainingEnrollments.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const hrEmployeeDocumentsRelations = relations(hrEmployeeDocuments, ({ one }) => ({
  user: one(users, { fields: [hrEmployeeDocuments.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [hrEmployeeDocuments.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const hrOrganizationChartRelations = relations(hrOrganizationChart, ({ one }) => ({
  user: one(users, { fields: [hrOrganizationChart.userId], references: [users.id] }),
}));

export const hrAiInsightsRelations = relations(hrAiInsights, ({ one }) => ({
  user: one(users, { fields: [hrAiInsights.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [hrAiInsights.organizationId],
    references: [organizations.id],
  }),
}));

export const hrAiRemindersRelations = relations(hrAiReminders, ({ one }) => ({
  user: one(users, { fields: [hrAiReminders.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [hrAiReminders.organizationId],
    references: [organizations.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE — PAYROLL (Epic 6)
// ─────────────────────────────────────────────────────────────────────────────
// Every payroll table is multi-tenant: it carries `organizationId` and user-scoped
// ownership. Cross-references to employees/salary-structures are scoped so a
// tenant can never read or mutate another tenant's payroll data. All mutations are
// gated by RBAC, audited, and emit Business Timeline events.

// Payroll Periods
export const payrollPeriods = pgTable("payroll_periods", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }).notNull(),
  status: payrollPeriodStatusEnum("status").notNull().default("open"),
  isLocked: boolean("is_locked").default(false).notNull(),
  closedAt: timestamp("closed_at", { mode: "date" }),
  closedBy: text("closed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("payroll_periods_org_idx").on(table.organizationId),
  userIdx: index("payroll_periods_user_idx").on(table.userId),
  statusIdx: index("payroll_periods_status_idx").on(table.status),
  dateIdx: index("payroll_periods_date_idx").on(table.startDate, table.endDate),
}));

// Salary Structures
export const salaryStructures = pgTable("salary_structures", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: salaryStructureTypeEnum("type").notNull().default("monthly"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("salary_structures_org_idx").on(table.organizationId),
  userIdx: index("salary_structures_user_idx").on(table.userId),
  nameIdx: uniqueIndex("unique_org_structure_name").on(table.organizationId, table.name),
}));

// Salary Structure Components (allowances & deductions)
export const salaryStructureComponents = pgTable("salary_structure_components", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  salaryStructureId: text("salary_structure_id")
    .notNull()
    .references(() => salaryStructures.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: payrollItemTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  isPercentage: boolean("is_percentage").default(false).notNull(),
  isRecurring: boolean("is_recurring").default(true).notNull(),
  isTaxable: boolean("is_taxable").default(true).notNull(),
  isStatutory: boolean("is_statutory").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  structureIdx: index("salary_structure_components_structure_idx").on(table.salaryStructureId),
  orgIdx: index("salary_structure_components_org_idx").on(table.organizationId),
}));

// Employee Salary Assignments
export const employeeSalaryAssignments = pgTable("employee_salary_assignments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  salaryStructureId: text("salary_structure_id")
    .notNull()
    .references(() => salaryStructures.id, { onDelete: "cascade" }),
  effectiveDate: timestamp("effective_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }),
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("KES").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("employee_salary_assignments_org_idx").on(table.organizationId),
  employeeIdx: index("employee_salary_assignments_employee_idx").on(table.employeeId),
  structureIdx: index("employee_salary_assignments_structure_idx").on(table.salaryStructureId),
  dateIdx: index("employee_salary_assignments_date_idx").on(table.effectiveDate, table.endDate),
}));

// Payroll Runs
export const payrollRuns = pgTable("payroll_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  payrollPeriodId: text("payroll_period_id")
    .notNull()
    .references(() => payrollPeriods.id, { onDelete: "cascade" }),
  runNumber: text("run_number").notNull(),
  status: payrollRunStatusEnum("status").notNull().default("draft"),
  totalEmployees: integer("total_employees").default(0).notNull(),
  totalGross: decimal("total_gross", { precision: 12, scale: 2 }).default("0").notNull(),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).default("0").notNull(),
  totalNet: decimal("total_net", { precision: 12, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  processedAt: timestamp("processed_at", { mode: "date" }),
  approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  paidAt: timestamp("paid_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("payroll_runs_org_idx").on(table.organizationId),
  userIdx: index("payroll_runs_user_idx").on(table.userId),
  periodIdx: index("payroll_runs_period_idx").on(table.payrollPeriodId),
  statusIdx: index("payroll_runs_status_idx").on(table.status),
  runNumberIdx: uniqueIndex("unique_org_run_number").on(table.organizationId, table.runNumber),
}));

// Payroll Run Employees (employee-level summary for each run)
export const payrollRunEmployees = pgTable("payroll_run_employees", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  payrollRunId: text("payroll_run_id")
    .notNull()
    .references(() => payrollRuns.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  grossEarnings: decimal("gross_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAllowances: decimal("total_allowances", { precision: 12, scale: 2 }).notNull().default("0"),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  totalTax: decimal("total_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  netPay: decimal("net_pay", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").default("bank_transfer"),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  runIdx: index("payroll_run_employees_run_idx").on(table.payrollRunId),
  employeeIdx: index("payroll_run_employees_employee_idx").on(table.employeeId),
  orgIdx: index("payroll_run_employees_org_idx").on(table.organizationId),
}));

// Payroll Run Details (line items for each employee)
export const payrollRunDetails = pgTable("payroll_run_details", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  payrollRunEmployeeId: text("payroll_run_employee_id")
    .notNull()
    .references(() => payrollRunEmployees.id, { onDelete: "cascade" }),
  itemType: payrollItemTypeEnum("item_type").notNull(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  isPercentage: boolean("is_percentage").default(false).notNull(),
  baseAmount: decimal("base_amount", { precision: 12, scale: 2 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  runEmployeeIdx: index("payroll_run_details_run_employee_idx").on(table.payrollRunEmployeeId),
  orgIdx: index("payroll_run_details_org_idx").on(table.organizationId),
}));

// Payslips
export const payslips = pgTable("payslips", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  payrollRunEmployeeId: text("payroll_run_employee_id")
    .notNull()
    .references(() => payrollRunEmployees.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => hrEmployees.id, { onDelete: "cascade" }),
  payslipNumber: text("payslip_number").notNull(),
  status: payslipStatusEnum("status").notNull().default("draft"),
  periodStart: timestamp("period_start", { mode: "date" }).notNull(),
  periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  grossEarnings: decimal("gross_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAllowances: decimal("total_allowances", { precision: 12, scale: 2 }).notNull().default("0"),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  totalTax: decimal("total_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  netPay: decimal("net_pay", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").default("bank_transfer"),
  paymentReference: text("payment_reference"),
  sentAt: timestamp("sent_at", { mode: "date" }),
  viewedAt: timestamp("viewed_at", { mode: "date" }),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("payslips_org_idx").on(table.organizationId),
  userIdx: index("payslips_user_idx").on(table.userId),
  employeeIdx: index("payslips_employee_idx").on(table.employeeId),
  periodIdx: index("payslips_period_idx").on(table.periodStart, table.periodEnd),
  numberIdx: uniqueIndex("unique_org_payslip_number").on(table.organizationId, table.payslipNumber),
}));

// Payroll Payment Exports (bank file exports)
export const payrollPaymentExports = pgTable("payroll_payment_exports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  payrollRunId: text("payroll_run_id")
    .notNull()
    .references(() => payrollRuns.id, { onDelete: "cascade" }),
  exportNumber: text("export_number").notNull(),
  format: text("format").notNull().default("csv"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  employeeCount: integer("employee_count").notNull(),
  fileUrl: text("file_url"),
  generatedAt: timestamp("generated_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("payroll_payment_exports_org_idx").on(table.organizationId),
  runIdx: index("payroll_payment_exports_run_idx").on(table.payrollRunId),
  exportNumberIdx: uniqueIndex("unique_org_export_number").on(table.organizationId, table.exportNumber),
}));

// Payroll Approval Workflow
export const payrollApprovalWorkflows = pgTable("payroll_approval_workflows", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  payrollRunId: text("payroll_run_id")
    .notNull()
    .references(() => payrollRuns.id, { onDelete: "cascade" }),
  approverId: text("approver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  comment: text("comment"),
  actedAt: timestamp("acted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  runIdx: index("payroll_approval_workflows_run_idx").on(table.payrollRunId),
  approverIdx: index("payroll_approval_workflows_approver_idx").on(table.approverId),
  orgIdx: index("payroll_approval_workflows_org_idx").on(table.organizationId),
}));

// AI Payroll Insights
export const payrollAiInsights = pgTable("payroll_ai_insights", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("normal").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  read: boolean("read").default(false).notNull(),
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("payroll_ai_insights_org_idx").on(table.organizationId),
  userIdx: index("payroll_ai_insights_user_idx").on(table.userId),
}));

// ── Payroll relations ──────────────────────────────────────────────────────────

export const payrollPeriodsRelations = relations(payrollPeriods, ({ one, many }) => ({
  user: one(users, { fields: [payrollPeriods.userId], references: [users.id] }),
  runs: many(payrollRuns),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one, many }) => ({
  user: one(users, { fields: [salaryStructures.userId], references: [users.id] }),
  components: many(salaryStructureComponents),
  assignments: many(employeeSalaryAssignments),
}));

export const salaryStructureComponentsRelations = relations(salaryStructureComponents, ({ one }) => ({
  structure: one(salaryStructures, {
    fields: [salaryStructureComponents.salaryStructureId],
    references: [salaryStructures.id],
  }),
}));

export const employeeSalaryAssignmentsRelations = relations(employeeSalaryAssignments, ({ one }) => ({
  user: one(users, { fields: [employeeSalaryAssignments.userId], references: [users.id] }),
  employee: one(hrEmployees, {
    fields: [employeeSalaryAssignments.employeeId],
    references: [hrEmployees.id],
  }),
  structure: one(salaryStructures, {
    fields: [employeeSalaryAssignments.salaryStructureId],
    references: [salaryStructures.id],
  }),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  user: one(users, { fields: [payrollRuns.userId], references: [users.id] }),
  period: one(payrollPeriods, {
    fields: [payrollRuns.payrollPeriodId],
    references: [payrollPeriods.id],
  }),
  employees: many(payrollRunEmployees),
  approvals: many(payrollApprovalWorkflows),
  exports: many(payrollPaymentExports),
}));

export const payrollRunEmployeesRelations = relations(payrollRunEmployees, ({ one, many }) => ({
  run: one(payrollRuns, {
    fields: [payrollRunEmployees.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(hrEmployees, {
    fields: [payrollRunEmployees.employeeId],
    references: [hrEmployees.id],
  }),
  details: many(payrollRunDetails),
  payslips: many(payslips),
}));

export const payrollRunDetailsRelations = relations(payrollRunDetails, ({ one }) => ({
  runEmployee: one(payrollRunEmployees, {
    fields: [payrollRunDetails.payrollRunEmployeeId],
    references: [payrollRunEmployees.id],
  }),
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  user: one(users, { fields: [payslips.userId], references: [users.id] }),
  runEmployee: one(payrollRunEmployees, {
    fields: [payslips.payrollRunEmployeeId],
    references: [payrollRunEmployees.id],
  }),
  employee: one(hrEmployees, {
    fields: [payslips.employeeId],
    references: [hrEmployees.id],
  }),
}));

export const payrollPaymentExportsRelations = relations(payrollPaymentExports, ({ one }) => ({
  user: one(users, { fields: [payrollPaymentExports.userId], references: [users.id] }),
  run: one(payrollRuns, {
    fields: [payrollPaymentExports.payrollRunId],
    references: [payrollRuns.id],
  }),
}));

export const payrollApprovalWorkflowsRelations = relations(payrollApprovalWorkflows, ({ one }) => ({
  user: one(users, { fields: [payrollApprovalWorkflows.userId], references: [users.id] }),
  run: one(payrollRuns, {
    fields: [payrollApprovalWorkflows.payrollRunId],
    references: [payrollRuns.id],
  }),
  approver: one(users, {
    fields: [payrollApprovalWorkflows.approverId],
    references: [users.id],
  }),
}));

export const payrollAiInsightsRelations = relations(payrollAiInsights, ({ one }) => ({
  user: one(users, { fields: [payrollAiInsights.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [payrollAiInsights.organizationId],
    references: [organizations.id],
  }),
}));

// ── Procurement relations ──────────────────────────────────────────────────────

export const procurementPurchaseRequestsRelations = relations(
  procurementPurchaseRequests,
  ({ one, many }) => ({
    user: one(users, { fields: [procurementPurchaseRequests.userId], references: [users.id] }),
    approver: one(users, { fields: [procurementPurchaseRequests.approvedBy], references: [users.id] }),
    requester: one(users, { fields: [procurementPurchaseRequests.requesterId], references: [users.id] }),
    items: many(procurementPurchaseRequestItems),
    approvals: many(procurementApprovals),
  })
);

export const procurementPurchaseRequestItemsRelations = relations(
  procurementPurchaseRequestItems,
  ({ one }) => ({
    request: one(procurementPurchaseRequests, {
      fields: [procurementPurchaseRequestItems.requestId],
      references: [procurementPurchaseRequests.id],
    }),
    product: one(inventoryProducts, {
      fields: [procurementPurchaseRequestItems.productId],
      references: [inventoryProducts.id],
    }),
  })
);

export const procurementRfqsRelations = relations(procurementRfqs, ({ one, many }) => ({
  user: one(users, { fields: [procurementRfqs.userId], references: [users.id] }),
  items: many(procurementRfqItems),
  suppliers: many(procurementRfqSuppliers),
  quotations: many(procurementSupplierQuotations),
  approvals: many(procurementApprovals),
}));

export const procurementRfqItemsRelations = relations(procurementRfqItems, ({ one, many }) => ({
  rfq: one(procurementRfqs, {
    fields: [procurementRfqItems.rfqId],
    references: [procurementRfqs.id],
  }),
  product: one(inventoryProducts, {
    fields: [procurementRfqItems.productId],
    references: [inventoryProducts.id],
  }),
  quotationItems: many(procurementSupplierQuotationItems),
}));

export const procurementRfqSuppliersRelations = relations(procurementRfqSuppliers, ({ one }) => ({
  rfq: one(procurementRfqs, {
    fields: [procurementRfqSuppliers.rfqId],
    references: [procurementRfqs.id],
  }),
  supplier: one(inventorySuppliers, {
    fields: [procurementRfqSuppliers.supplierId],
    references: [inventorySuppliers.id],
  }),
}));

export const procurementSupplierQuotationsRelations = relations(
  procurementSupplierQuotations,
  ({ one, many }) => ({
    user: one(users, { fields: [procurementSupplierQuotations.userId], references: [users.id] }),
    rfq: one(procurementRfqs, {
      fields: [procurementSupplierQuotations.rfqId],
      references: [procurementRfqs.id],
    }),
    supplier: one(inventorySuppliers, {
      fields: [procurementSupplierQuotations.supplierId],
      references: [inventorySuppliers.id],
    }),
    items: many(procurementSupplierQuotationItems),
  })
);

export const procurementSupplierQuotationItemsRelations = relations(
  procurementSupplierQuotationItems,
  ({ one }) => ({
    quotation: one(procurementSupplierQuotations, {
      fields: [procurementSupplierQuotationItems.quotationId],
      references: [procurementSupplierQuotations.id],
    }),
    rfqItem: one(procurementRfqItems, {
      fields: [procurementSupplierQuotationItems.rfqItemId],
      references: [procurementRfqItems.id],
    }),
    product: one(inventoryProducts, {
      fields: [procurementSupplierQuotationItems.productId],
      references: [inventoryProducts.id],
    }),
  })
);

export const procurementPurchaseOrdersRelations = relations(
  procurementPurchaseOrders,
  ({ one, many }) => ({
    user: one(users, { fields: [procurementPurchaseOrders.userId], references: [users.id] }),
    supplier: one(inventorySuppliers, {
      fields: [procurementPurchaseOrders.supplierId],
      references: [inventorySuppliers.id],
    }),
    request: one(procurementPurchaseRequests, {
      fields: [procurementPurchaseOrders.requestId],
      references: [procurementPurchaseRequests.id],
    }),
    rfq: one(procurementRfqs, {
      fields: [procurementPurchaseOrders.rfqId],
      references: [procurementRfqs.id],
    }),
    budget: one(procurementBudgets, {
      fields: [procurementPurchaseOrders.budgetId],
      references: [procurementBudgets.id],
    }),
    approver: one(users, { fields: [procurementPurchaseOrders.approvedBy], references: [users.id] }),
    items: many(procurementPurchaseOrderItems),
    approvals: many(procurementApprovals),
    grns: many(procurementGrns),
    invoices: many(procurementPurchaseInvoices),
  })
);

export const procurementPurchaseOrderItemsRelations = relations(
  procurementPurchaseOrderItems,
  ({ one, many }) => ({
    purchaseOrder: one(procurementPurchaseOrders, {
      fields: [procurementPurchaseOrderItems.purchaseOrderId],
      references: [procurementPurchaseOrders.id],
    }),
    product: one(inventoryProducts, {
      fields: [procurementPurchaseOrderItems.productId],
      references: [inventoryProducts.id],
    }),
    warehouse: one(inventoryWarehouses, {
      fields: [procurementPurchaseOrderItems.warehouseId],
      references: [inventoryWarehouses.id],
    }),
    grnItems: many(procurementGrnItems),
    invoiceItems: many(procurementPurchaseInvoiceItems),
  })
);

export const procurementApprovalsRelations = relations(procurementApprovals, ({ one }) => ({
  organization: one(organizations, {
    fields: [procurementApprovals.organizationId],
    references: [organizations.id],
  }),
  approver: one(users, {
    fields: [procurementApprovals.approverId],
    references: [users.id],
  }),
}));

export const procurementGrnsRelations = relations(procurementGrns, ({ one, many }) => ({
  user: one(users, { fields: [procurementGrns.userId], references: [users.id] }),
  purchaseOrder: one(procurementPurchaseOrders, {
    fields: [procurementGrns.purchaseOrderId],
    references: [procurementPurchaseOrders.id],
  }),
  supplier: one(inventorySuppliers, {
    fields: [procurementGrns.supplierId],
    references: [inventorySuppliers.id],
  }),
  items: many(procurementGrnItems),
  returns: many(procurementSupplierReturns),
  invoices: many(procurementPurchaseInvoices),
}));

export const procurementGrnItemsRelations = relations(procurementGrnItems, ({ one, many }) => ({
  grn: one(procurementGrns, {
    fields: [procurementGrnItems.grnId],
    references: [procurementGrns.id],
  }),
  poItem: one(procurementPurchaseOrderItems, {
    fields: [procurementGrnItems.poItemId],
    references: [procurementPurchaseOrderItems.id],
  }),
  product: one(inventoryProducts, {
    fields: [procurementGrnItems.productId],
    references: [inventoryProducts.id],
  }),
  warehouse: one(inventoryWarehouses, {
    fields: [procurementGrnItems.warehouseId],
    references: [inventoryWarehouses.id],
  }),
  returnItems: many(procurementSupplierReturnItems),
}));

export const procurementSupplierReturnsRelations = relations(
  procurementSupplierReturns,
  ({ one, many }) => ({
    user: one(users, { fields: [procurementSupplierReturns.userId], references: [users.id] }),
    grn: one(procurementGrns, {
      fields: [procurementSupplierReturns.grnId],
      references: [procurementGrns.id],
    }),
    purchaseOrder: one(procurementPurchaseOrders, {
      fields: [procurementSupplierReturns.purchaseOrderId],
      references: [procurementPurchaseOrders.id],
    }),
    supplier: one(inventorySuppliers, {
      fields: [procurementSupplierReturns.supplierId],
      references: [inventorySuppliers.id],
    }),
    items: many(procurementSupplierReturnItems),
  })
);

export const procurementSupplierReturnItemsRelations = relations(
  procurementSupplierReturnItems,
  ({ one }) => ({
    returnRecord: one(procurementSupplierReturns, {
      fields: [procurementSupplierReturnItems.returnId],
      references: [procurementSupplierReturns.id],
    }),
    grnItem: one(procurementGrnItems, {
      fields: [procurementSupplierReturnItems.grnItemId],
      references: [procurementGrnItems.id],
    }),
    product: one(inventoryProducts, {
      fields: [procurementSupplierReturnItems.productId],
      references: [inventoryProducts.id],
    }),
    warehouse: one(inventoryWarehouses, {
      fields: [procurementSupplierReturnItems.warehouseId],
      references: [inventoryWarehouses.id],
    }),
  })
);

export const procurementPurchaseInvoicesRelations = relations(
  procurementPurchaseInvoices,
  ({ one, many }) => ({
    user: one(users, { fields: [procurementPurchaseInvoices.userId], references: [users.id] }),
    supplier: one(inventorySuppliers, {
      fields: [procurementPurchaseInvoices.supplierId],
      references: [inventorySuppliers.id],
    }),
    purchaseOrder: one(procurementPurchaseOrders, {
      fields: [procurementPurchaseInvoices.purchaseOrderId],
      references: [procurementPurchaseOrders.id],
    }),
    grn: one(procurementGrns, {
      fields: [procurementPurchaseInvoices.grnId],
      references: [procurementGrns.id],
    }),
    journalEntry: one(journalEntries, {
      fields: [procurementPurchaseInvoices.journalEntryId],
      references: [journalEntries.id],
    }),
    items: many(procurementPurchaseInvoiceItems),
    payments: many(procurementSupplierPayments),
  })
);

export const procurementPurchaseInvoiceItemsRelations = relations(
  procurementPurchaseInvoiceItems,
  ({ one }) => ({
    purchaseInvoice: one(procurementPurchaseInvoices, {
      fields: [procurementPurchaseInvoiceItems.purchaseInvoiceId],
      references: [procurementPurchaseInvoices.id],
    }),
    poItem: one(procurementPurchaseOrderItems, {
      fields: [procurementPurchaseInvoiceItems.poItemId],
      references: [procurementPurchaseOrderItems.id],
    }),
    product: one(inventoryProducts, {
      fields: [procurementPurchaseInvoiceItems.productId],
      references: [inventoryProducts.id],
    }),
  })
);

export const procurementSupplierPaymentsRelations = relations(
  procurementSupplierPayments,
  ({ one }) => ({
    user: one(users, { fields: [procurementSupplierPayments.userId], references: [users.id] }),
    supplier: one(inventorySuppliers, {
      fields: [procurementSupplierPayments.supplierId],
      references: [inventorySuppliers.id],
    }),
    purchaseInvoice: one(procurementPurchaseInvoices, {
      fields: [procurementSupplierPayments.purchaseInvoiceId],
      references: [procurementPurchaseInvoices.id],
    }),
    journalEntry: one(journalEntries, {
      fields: [procurementSupplierPayments.journalEntryId],
      references: [journalEntries.id],
    }),
  })
);

export const procurementBudgetsRelations = relations(procurementBudgets, ({ one, many }) => ({
  user: one(users, { fields: [procurementBudgets.userId], references: [users.id] }),
  orders: many(procurementPurchaseOrders),
}));

export const procurementAiRecommendationsRelations = relations(
  procurementAiRecommendations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [procurementAiRecommendations.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [procurementAiRecommendations.userId],
      references: [users.id],
    }),
    product: one(inventoryProducts, {
      fields: [procurementAiRecommendations.productId],
      references: [inventoryProducts.id],
    }),
    recommendedSupplier: one(inventorySuppliers, {
      fields: [procurementAiRecommendations.recommendedSupplierId],
      references: [inventorySuppliers.id],
    }),
  })
);

export const posSessionsRelations = relations(posSessions, ({ one, many }) => ({
  user: one(users, { fields: [posSessions.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [posSessions.organizationId],
    references: [organizations.id],
  }),
  orders: many(posOrders),
}));

export const posOrdersRelations = relations(posOrders, ({ one, many }) => ({
  user: one(users, { fields: [posOrders.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [posOrders.organizationId],
    references: [organizations.id],
  }),
  session: one(posSessions, {
    fields: [posOrders.sessionId],
    references: [posSessions.id],
  }),
  client: one(clients, {
    fields: [posOrders.clientId],
    references: [clients.id],
  }),
  warehouse: one(inventoryWarehouses, {
    fields: [posOrders.warehouseId],
    references: [inventoryWarehouses.id],
  }),
  invoice: one(invoices, {
    fields: [posOrders.invoiceId],
    references: [invoices.id],
  }),
  items: many(posOrderItems),
  payments: many(posOrderPayments),
  returns: many(posReturns),
}));

export const posOrderItemsRelations = relations(posOrderItems, ({ one }) => ({
  order: one(posOrders, {
    fields: [posOrderItems.orderId],
    references: [posOrders.id],
  }),
  product: one(inventoryProducts, {
    fields: [posOrderItems.productId],
    references: [inventoryProducts.id],
  }),
  warehouse: one(inventoryWarehouses, {
    fields: [posOrderItems.warehouseId],
    references: [inventoryWarehouses.id],
  }),
}));

export const posOrderPaymentsRelations = relations(posOrderPayments, ({ one }) => ({
  order: one(posOrders, {
    fields: [posOrderPayments.orderId],
    references: [posOrders.id],
  }),
}));

export const posReturnsRelations = relations(posReturns, ({ one, many }) => ({
  order: one(posOrders, {
    fields: [posReturns.orderId],
    references: [posOrders.id],
  }),
  user: one(users, {
    fields: [posReturns.userId],
    references: [users.id],
  }),
  items: many(posReturnItems),
}));

export const posReturnItemsRelations = relations(posReturnItems, ({ one }) => ({
  returnRecord: one(posReturns, {
    fields: [posReturnItems.returnId],
    references: [posReturns.id],
  }),
  orderItem: one(posOrderItems, {
    fields: [posReturnItems.orderItemId],
    references: [posOrderItems.id],
  }),
  product: one(inventoryProducts, {
    fields: [posReturnItems.productId],
    references: [inventoryProducts.id],
  }),
  warehouse: one(inventoryWarehouses, {
    fields: [posReturnItems.warehouseId],
    references: [inventoryWarehouses.id],
  }),
}));

// Developer Platform relations
export const oauthClientsRelations = relations(oauthClients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [oauthClients.organizationId],
    references: [organizations.id],
  }),
  accessTokens: many(oauthAccessTokens),
  refreshTokens: many(oauthRefreshTokens),
  authorizationCodes: many(oauthAuthorizationCodes),
}));

export const oauthAccessTokensRelations = relations(oauthAccessTokens, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [oauthAccessTokens.organizationId],
    references: [organizations.id],
  }),
  client: one(oauthClients, {
    fields: [oauthAccessTokens.clientId],
    references: [oauthClients.id],
  }),
  refreshTokens: many(oauthRefreshTokens),
}));

export const oauthRefreshTokensRelations = relations(oauthRefreshTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [oauthRefreshTokens.organizationId],
    references: [organizations.id],
  }),
  client: one(oauthClients, {
    fields: [oauthRefreshTokens.clientId],
    references: [oauthClients.id],
  }),
  accessToken: one(oauthAccessTokens, {
    fields: [oauthRefreshTokens.accessTokenId],
    references: [oauthAccessTokens.id],
  }),
}));

export const oauthAuthorizationCodesRelations = relations(oauthAuthorizationCodes, ({ one }) => ({
  organization: one(organizations, {
    fields: [oauthAuthorizationCodes.organizationId],
    references: [organizations.id],
  }),
  client: one(oauthClients, {
    fields: [oauthAuthorizationCodes.clientId],
    references: [oauthClients.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [webhooks.organizationId],
    references: [organizations.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  organization: one(organizations, {
    fields: [webhookDeliveries.organizationId],
    references: [organizations.id],
  }),
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));

export const apiSandboxSessionsRelations = relations(apiSandboxSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiSandboxSessions.organizationId],
    references: [organizations.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiSandboxSessions.apiKeyId],
    references: [apiKeys.id],
  }),
}));

export const apiAnalyticsDailyRelations = relations(apiAnalyticsDaily, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiAnalyticsDaily.organizationId],
    references: [organizations.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiAnalyticsDaily.apiKeyId],
    references: [apiKeys.id],
  }),
}));

export const analyticsDashboardsRelations = relations(analyticsDashboards, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [analyticsDashboards.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [analyticsDashboards.userId],
    references: [users.id],
  }),
  widgets: many(analyticsWidgets),
}));

export const analyticsWidgetsRelations = relations(analyticsWidgets, ({ one }) => ({
  dashboard: one(analyticsDashboards, {
    fields: [analyticsWidgets.dashboardId],
    references: [analyticsDashboards.id],
  }),
  organization: one(organizations, {
    fields: [analyticsWidgets.organizationId],
    references: [organizations.id],
  }),
}));

export const analyticsSnapshotsRelations = relations(analyticsSnapshots, ({ one }) => ({
  organization: one(organizations, {
    fields: [analyticsSnapshots.organizationId],
    references: [organizations.id],
  }),
  widget: one(analyticsWidgets, {
    fields: [analyticsSnapshots.widgetId],
    references: [analyticsWidgets.id],
  }),
  dashboard: one(analyticsDashboards, {
    fields: [analyticsSnapshots.dashboardId],
    references: [analyticsDashboards.id],
  }),
}));

export const analyticsScheduledReportsRelations = relations(analyticsScheduledReports, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [analyticsScheduledReports.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [analyticsScheduledReports.userId],
    references: [users.id],
  }),
  runs: many(analyticsReportRuns),
}));

export const analyticsReportRunsRelations = relations(analyticsReportRuns, ({ one }) => ({
  scheduledReport: one(analyticsScheduledReports, {
    fields: [analyticsReportRuns.scheduledReportId],
    references: [analyticsScheduledReports.id],
  }),
  organization: one(organizations, {
    fields: [analyticsReportRuns.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [analyticsReportRuns.userId],
    references: [users.id],
  }),
}));

export const analyticsInsightsRelations = relations(analyticsInsights, ({ one }) => ({
  organization: one(organizations, {
    fields: [analyticsInsights.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [analyticsInsights.userId],
    references: [users.id],
  }),
}));

// ── Enterprise & Multi-Branch Management relations ─────────────────────────────

export const enterpriseBranchesRelations = relations(enterpriseBranches, ({ one, many }) => ({
  user: one(users, { fields: [enterpriseBranches.userId], references: [users.id] }),
  manager: one(users, { fields: [enterpriseBranches.managerId], references: [users.id] }),
  members: many(branchMembers),
  pricing: many(branchPricing),
  taxSettings: many(branchTaxSettings),
  approvalWorkflows: many(branchApprovalWorkflows),
  approvalRequests: many(branchApprovalRequests),
  performanceSnapshots: many(branchPerformanceSnapshots),
}));

export const branchMembersRelations = relations(branchMembers, ({ one }) => ({
  branch: one(enterpriseBranches, {
    fields: [branchMembers.branchId],
    references: [enterpriseBranches.id],
  }),
  user: one(users, {
    fields: [branchMembers.userId],
    references: [users.id],
  }),
  customRole: one(roles, {
    fields: [branchMembers.customRoleId],
    references: [roles.id],
  }),
}));

export const branchPricingRelations = relations(branchPricing, ({ one }) => ({
  branch: one(enterpriseBranches, {
    fields: [branchPricing.branchId],
    references: [enterpriseBranches.id],
  }),
  product: one(inventoryProducts, {
    fields: [branchPricing.productId],
    references: [inventoryProducts.id],
  }),
  category: one(inventoryCategories, {
    fields: [branchPricing.categoryId],
    references: [inventoryCategories.id],
  }),
}));

export const branchTaxSettingsRelations = relations(branchTaxSettings, ({ one }) => ({
  branch: one(enterpriseBranches, {
    fields: [branchTaxSettings.branchId],
    references: [enterpriseBranches.id],
  }),
}));

export const interBranchTransfersRelations = relations(interBranchTransfers, ({ one, many }) => ({
  user: one(users, { fields: [interBranchTransfers.userId], references: [users.id] }),
  fromBranch: one(enterpriseBranches, {
    fields: [interBranchTransfers.fromBranchId],
    references: [enterpriseBranches.id],
  }),
  toBranch: one(enterpriseBranches, {
    fields: [interBranchTransfers.toBranchId],
    references: [enterpriseBranches.id],
  }),
  approver: one(users, {
    fields: [interBranchTransfers.approvedBy],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [interBranchTransfers.receivedBy],
    references: [users.id],
  }),
  items: many(interBranchTransferItems),
}));

export const interBranchTransferItemsRelations = relations(interBranchTransferItems, ({ one }) => ({
  transfer: one(interBranchTransfers, {
    fields: [interBranchTransferItems.transferId],
    references: [interBranchTransfers.id],
  }),
  product: one(inventoryProducts, {
    fields: [interBranchTransferItems.productId],
    references: [inventoryProducts.id],
  }),
}));

export const interBranchSalesRelations = relations(interBranchSales, ({ one, many }) => ({
  user: one(users, { fields: [interBranchSales.userId], references: [users.id] }),
  fromBranch: one(enterpriseBranches, {
    fields: [interBranchSales.fromBranchId],
    references: [enterpriseBranches.id],
  }),
  toBranch: one(enterpriseBranches, {
    fields: [interBranchSales.toBranchId],
    references: [enterpriseBranches.id],
  }),
  approver: one(users, {
    fields: [interBranchSales.approvedBy],
    references: [users.id],
  }),
  items: many(interBranchSaleItems),
}));

export const interBranchSaleItemsRelations = relations(interBranchSaleItems, ({ one }) => ({
  sale: one(interBranchSales, {
    fields: [interBranchSaleItems.saleId],
    references: [interBranchSales.id],
  }),
  product: one(inventoryProducts, {
    fields: [interBranchSaleItems.productId],
    references: [inventoryProducts.id],
  }),
}));

export const branchApprovalWorkflowsRelations = relations(branchApprovalWorkflows, ({ one, many }) => ({
  user: one(users, { fields: [branchApprovalWorkflows.userId], references: [users.id] }),
  branch: one(enterpriseBranches, {
    fields: [branchApprovalWorkflows.branchId],
    references: [enterpriseBranches.id],
  }),
  requests: many(branchApprovalRequests),
}));

export const branchApprovalRequestsRelations = relations(branchApprovalRequests, ({ one }) => ({
  branch: one(enterpriseBranches, {
    fields: [branchApprovalRequests.branchId],
    references: [enterpriseBranches.id],
  }),
  workflow: one(branchApprovalWorkflows, {
    fields: [branchApprovalRequests.workflowId],
    references: [branchApprovalWorkflows.id],
  }),
  decidedByUser: one(users, {
    fields: [branchApprovalRequests.decidedBy],
    references: [users.id],
  }),
}));

export const enterpriseSettingsRelations = relations(enterpriseSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [enterpriseSettings.organizationId],
    references: [organizations.id],
  }),
}));

export const branchPerformanceSnapshotsRelations = relations(branchPerformanceSnapshots, ({ one }) => ({
  organization: one(organizations, {
    fields: [branchPerformanceSnapshots.organizationId],
    references: [organizations.id],
  }),
  branch: one(enterpriseBranches, {
    fields: [branchPerformanceSnapshots.branchId],
    references: [enterpriseBranches.id],
  }),
}));

// ── Procurement types ──────────────────────────────────────────────────────────
export type ProcurementPurchaseRequest =
  typeof procurementPurchaseRequests.$inferSelect;
export type ProcurementPurchaseRequestItem =
  typeof procurementPurchaseRequestItems.$inferSelect;
export type ProcurementRfq = typeof procurementRfqs.$inferSelect;
export type ProcurementRfqItem = typeof procurementRfqItems.$inferSelect;
export type ProcurementRfqSupplier = typeof procurementRfqSuppliers.$inferSelect;
export type ProcurementSupplierQuotation =
  typeof procurementSupplierQuotations.$inferSelect;
export type ProcurementSupplierQuotationItem =
  typeof procurementSupplierQuotationItems.$inferSelect;
export type ProcurementPurchaseOrder =
  typeof procurementPurchaseOrders.$inferSelect;
export type ProcurementPurchaseOrderItem =
  typeof procurementPurchaseOrderItems.$inferSelect;
export type ProcurementApproval = typeof procurementApprovals.$inferSelect;
export type ProcurementGrn = typeof procurementGrns.$inferSelect;
export type ProcurementGrnItem = typeof procurementGrnItems.$inferSelect;
export type ProcurementSupplierReturn =
  typeof procurementSupplierReturns.$inferSelect;
export type ProcurementSupplierReturnItem =
  typeof procurementSupplierReturnItems.$inferSelect;
export type ProcurementPurchaseInvoice =
  typeof procurementPurchaseInvoices.$inferSelect;
export type ProcurementPurchaseInvoiceItem =
  typeof procurementPurchaseInvoiceItems.$inferSelect;
export type ProcurementSupplierPayment =
  typeof procurementSupplierPayments.$inferSelect;
export type ProcurementBudget = typeof procurementBudgets.$inferSelect;
export type ProcurementAiRecommendation =
  typeof procurementAiRecommendations.$inferSelect;

// Procurement enums (TypeScript unions)
export type ProcurementRequestStatus =
  (typeof procurementRequestStatusEnum.enumValues)[number];
export type RfqStatus = (typeof rfqStatusEnum.enumValues)[number];
export type SupplierQuotationStatus =
  (typeof supplierQuotationStatusEnum.enumValues)[number];
export type ProcurementPOStatus =
  (typeof procurementPOStatusEnum.enumValues)[number];
export type GrnStatus = (typeof grnStatusEnum.enumValues)[number];
export type SupplierReturnStatus =
  (typeof supplierReturnStatusEnum.enumValues)[number];
export type PurchaseInvoiceStatus =
  (typeof purchaseInvoiceStatusEnum.enumValues)[number];
export type SupplierPaymentStatus =
  (typeof supplierPaymentStatusEnum.enumValues)[number];
export type BudgetPeriod = (typeof budgetPeriodEnum.enumValues)[number];
export type ApprovalLevelStatus =
  (typeof approvalLevelStatusEnum.enumValues)[number];
export type RecommendationStatus =
  (typeof recommendationStatusEnum.enumValues)[number];
export type PosOrderStatus = (typeof posOrderStatusEnum.enumValues)[number];
export type PosPaymentStatus = (typeof posPaymentStatusEnum.enumValues)[number];
export type PosSessionStatus = (typeof posSessionStatusEnum.enumValues)[number];
export type PosReturnReason = (typeof posReturnReasonEnum.enumValues)[number];

// POS Types
export type PosSession = typeof posSessions.$inferSelect;
export type PosOrder = typeof posOrders.$inferSelect;
export type PosOrderItem = typeof posOrderItems.$inferSelect;
export type PosOrderPayment = typeof posOrderPayments.$inferSelect;
export type PosReturn = typeof posReturns.$inferSelect;
export type PosReturnItem = typeof posReturnItems.$inferSelect;

// ── HR types ───────────────────────────────────────────────────────────────────
export type HrDepartment = typeof hrDepartments.$inferSelect;
export type HrPosition = typeof hrPositions.$inferSelect;
export type HrEmployee = typeof hrEmployees.$inferSelect;
export type HrEmploymentContract = typeof hrEmploymentContracts.$inferSelect;
export type HrAttendanceRecord = typeof hrAttendanceRecords.$inferSelect;
export type HrLeaveRequest = typeof hrLeaveRequests.$inferSelect;
export type HrLeaveBalance = typeof hrLeaveBalances.$inferSelect;
export type HrShift = typeof hrShifts.$inferSelect;
export type HrShiftAssignment = typeof hrShiftAssignments.$inferSelect;
export type HrApplicant = typeof hrApplicants.$inferSelect;
export type HrApplicantDocument = typeof hrApplicantDocuments.$inferSelect;
export type HrOnboardingChecklist = typeof hrOnboardingChecklists.$inferSelect;
export type HrOffboardingRecord = typeof hrOffboardingRecords.$inferSelect;
export type HrPerformanceReview = typeof hrPerformanceReviews.$inferSelect;
export type HrTraining = typeof hrTrainings.$inferSelect;
export type HrTrainingEnrollment = typeof hrTrainingEnrollments.$inferSelect;
export type HrEmployeeDocument = typeof hrEmployeeDocuments.$inferSelect;
export type HrOrganizationChart = typeof hrOrganizationChart.$inferSelect;
export type HrAiInsight = typeof hrAiInsights.$inferSelect;
export type HrAiReminder = typeof hrAiReminders.$inferSelect;

// HR enums (TypeScript unions)
export type EmployeeStatus = (typeof employeeStatusEnum.enumValues)[number];
export type EmploymentType = (typeof employmentTypeEnum.enumValues)[number];
export type ContractType = (typeof contractTypeEnum.enumValues)[number];
export type LeaveType = (typeof leaveTypeEnum.enumValues)[number];
export type LeaveStatus = (typeof leaveStatusEnum.enumValues)[number];
export type AttendanceStatus = (typeof attendanceStatusEnum.enumValues)[number];
export type ShiftStatus = (typeof shiftStatusEnum.enumValues)[number];
export type ApplicantStatus = (typeof applicantStatusEnum.enumValues)[number];
export type OnboardingTaskStatus = (typeof onboardingTaskStatusEnum.enumValues)[number];
export type OffboardingType = (typeof offboardingTypeEnum.enumValues)[number];
export type PerformanceReviewStatus = (typeof performanceReviewStatusEnum.enumValues)[number];
export type TrainingStatus = (typeof trainingStatusEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type OrgChartNodeType = (typeof orgChartNodeTypeEnum.enumValues)[number];
export type AiHrInsightType = (typeof aiHrInsightTypeEnum.enumValues)[number];

// ── Payroll types ───────────────────────────────────────────────────────────────
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type SalaryStructureComponent = typeof salaryStructureComponents.$inferSelect;
export type EmployeeSalaryAssignment = typeof employeeSalaryAssignments.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type PayrollRunEmployee = typeof payrollRunEmployees.$inferSelect;
export type PayrollRunDetail = typeof payrollRunDetails.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
export type PayrollPaymentExport = typeof payrollPaymentExports.$inferSelect;
export type PayrollApprovalWorkflow = typeof payrollApprovalWorkflows.$inferSelect;
export type PayrollAiInsight = typeof payrollAiInsights.$inferSelect;

// Payroll enums (TypeScript unions)
export type PayrollPeriodStatus = (typeof payrollPeriodStatusEnum.enumValues)[number];
export type PayrollRunStatus = (typeof payrollRunStatusEnum.enumValues)[number];
export type PayslipStatus = (typeof payslipStatusEnum.enumValues)[number];
export type PayrollItemType = (typeof payrollItemTypeEnum.enumValues)[number];
export type SalaryStructureType = (typeof salaryStructureTypeEnum.enumValues)[number];
export type PensionProviderType = (typeof pensionProviderTypeEnum.enumValues)[number];

// Developer Platform types
export type OauthClient = typeof oauthClients.$inferSelect;
export type OauthAccessToken = typeof oauthAccessTokens.$inferSelect;
export type OauthRefreshToken = typeof oauthRefreshTokens.$inferSelect;
export type OauthAuthorizationCode = typeof oauthAuthorizationCodes.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type ApiSandboxSession = typeof apiSandboxSessions.$inferSelect;
export type ApiAnalyticsDaily = typeof apiAnalyticsDaily.$inferSelect;

// Developer Platform enums
export type OauthClientStatus = (typeof oauthClientStatusEnum.enumValues)[number];
export type WebhookStatus = (typeof webhookStatusEnum.enumValues)[number];
export type WebhookDeliveryStatus = (typeof webhookDeliveryStatusEnum.enumValues)[number];

// Enterprise Analytics types
export type AnalyticsDashboard = typeof analyticsDashboards.$inferSelect;
export type AnalyticsWidget = typeof analyticsWidgets.$inferSelect;
export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type AnalyticsScheduledReport = typeof analyticsScheduledReports.$inferSelect;
export type AnalyticsReportRun = typeof analyticsReportRuns.$inferSelect;
export type AnalyticsInsight = typeof analyticsInsights.$inferSelect;

// Enterprise Analytics enums (TypeScript unions)
export type AnalyticsWidgetType = (typeof analyticsWidgetTypeEnum.enumValues)[number];
export type AnalyticsPeriod = (typeof analyticsPeriodEnum.enumValues)[number];
export type ReportFormat = (typeof reportFormatEnum.enumValues)[number];
export type ScheduleFrequency = (typeof scheduleFrequencyEnum.enumValues)[number];
export type ScheduleStatus = (typeof scheduleStatusEnum.enumValues)[number];
export type ReportStatus = (typeof reportStatusEnum.enumValues)[number];
export type AnalyticsInsightType = (typeof analyticsInsightTypeEnum.enumValues)[number];

// Enterprise & Multi-Branch Management types
export type EnterpriseBranch = typeof enterpriseBranches.$inferSelect;
export type BranchMember = typeof branchMembers.$inferSelect;
export type BranchPricing = typeof branchPricing.$inferSelect;
export type BranchTaxSetting = typeof branchTaxSettings.$inferSelect;
export type InterBranchTransfer = typeof interBranchTransfers.$inferSelect;
export type InterBranchTransferItem = typeof interBranchTransferItems.$inferSelect;
export type InterBranchSale = typeof interBranchSales.$inferSelect;
export type InterBranchSaleItem = typeof interBranchSaleItems.$inferSelect;
export type BranchApprovalWorkflow = typeof branchApprovalWorkflows.$inferSelect;
export type BranchApprovalRequest = typeof branchApprovalRequests.$inferSelect;
export type EnterpriseSetting = typeof enterpriseSettings.$inferSelect;
export type BranchPerformanceSnapshot = typeof branchPerformanceSnapshots.$inferSelect;

// Enterprise & Multi-Branch Management enums (TypeScript unions)
export type BranchType = (typeof branchTypeEnum.enumValues)[number];
export type BranchStatus = (typeof branchStatusEnum.enumValues)[number];
export type TransferStatus = (typeof transferStatusEnum.enumValues)[number];
export type InterBranchSaleStatus = (typeof interBranchSaleStatusEnum.enumValues)[number];

// Integration Hub types
export type Integration = typeof integrations.$inferSelect;
export type IntegrationOauthToken = typeof integrationOauthTokens.$inferSelect;
export type IntegrationActivityLog = typeof integrationActivityLogs.$inferSelect;
export type IntegrationEvent = typeof integrationEvents.$inferSelect;
export type IntegrationWebhookLog = typeof integrationWebhookLogs.$inferSelect;
export type IntegrationHealthCheck = typeof integrationHealthChecks.$inferSelect;

// Integration Hub enums (TypeScript unions)
export type IntegrationCategory = (typeof integrationCategoryEnum.enumValues)[number];
export type IntegrationStatus = (typeof integrationStatusEnum.enumValues)[number];
export type IntegrationAuthType = (typeof integrationAuthTypeEnum.enumValues)[number];
export type IntegrationHealthStatus = (typeof integrationHealthStatusEnum.enumValues)[number];
export type IntegrationEventStatus = (typeof integrationEventStatusEnum.enumValues)[number];
