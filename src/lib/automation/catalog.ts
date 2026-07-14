/**
 * KaziFlow — Automation catalog
 * ------------------------------------------------------------------
 * Declarative metadata describing the available triggers and actions so the
 * Trigger → Action Builder UI can render forms without hard-coding fields.
 */

export interface CatalogField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "boolean";
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface CatalogAction {
  type: string;
  label: string;
  description: string;
  icon?: string;
  fields: CatalogField[];
}

export interface CatalogEvent {
  type: string;
  label: string;
  description: string;
  samplePayload: Record<string, unknown>;
}

/** Business events that can trigger an automation. */
export const TRIGGER_EVENTS: CatalogEvent[] = [
  { type: "invoice.created", label: "Invoice created", description: "When a new invoice is created", samplePayload: { invoice: { id: "id", status: "draft", total: 0 } } },
  { type: "invoice.paid", label: "Invoice paid", description: "When an invoice is fully paid", samplePayload: { invoice: { id: "id", amountPaid: 0 } } },
  { type: "invoice.overdue", label: "Invoice overdue", description: "When an invoice becomes overdue", samplePayload: { invoice: { id: "id" } } },
  { type: "payment.received", label: "Payment received", description: "When a payment is recorded", samplePayload: { payment: { id: "id", amount: 0 } } },
  { type: "client.created", label: "Client created", description: "When a new client is added", samplePayload: { client: { id: "id", name: "" } } },
  { type: "expense.created", label: "Expense created", description: "When an expense is logged", samplePayload: { expense: { id: "id", amount: 0 } } },
  { type: "inventory.low_stock", label: "Low stock", description: "When a product falls to/below its reorder point", samplePayload: { product: { id: "id", name: "" } } },
  { type: "crm.deal.won", label: "Deal won", description: "When a CRM deal is marked won", samplePayload: { deal: { id: "id", amount: 0 } } },
  { type: "crm.lead.created", label: "Lead created", description: "When a new lead is captured", samplePayload: { lead: { id: "id" } } },
  { type: "crm.quotation.created", label: "Quotation created", description: "When a quotation is created", samplePayload: { quotation: { id: "id" } } },
  { type: "pos.sale.completed", label: "POS sale completed", description: "When a POS sale is completed", samplePayload: { order: { id: "id", total: 0 } } },
  { type: "payroll.run.approved", label: "Payroll run approved", description: "When a payroll run is approved", samplePayload: { run: { id: "id" } } },
  { type: "procurement.po.ordered", label: "Purchase order ordered", description: "When a purchase order is placed", samplePayload: { po: { id: "id" } } },
  { type: "manual", label: "Manual trigger", description: "Run on demand from the UI or API", samplePayload: {} },
];

export const ACTION_CATALOG: CatalogAction[] = [
  {
    type: "notify",
    label: "Send notification",
    description: "Notify users in-app (and optionally by email).",
    icon: "Bell",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "e.g. Overdue invoice" },
      { key: "message", label: "Message", type: "textarea", placeholder: "Use {{invoice.total}} for values" },
      { key: "channel", label: "Channel", type: "select", options: [{ value: "inApp", label: "In-app" }, { value: "email", label: "Email" }, { value: "both", label: "Both" }] },
      { key: "priority", label: "Priority", type: "select", options: [{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }] },
      { key: "deepLink", label: "Deep link", type: "text", placeholder: "/dashboard/invoices/{{invoice.id}}" },
    ],
  },
  {
    type: "create_task",
    label: "Create task",
    description: "Create a follow-up task.",
    icon: "CheckSquare",
    fields: [
      { key: "taskTitle", label: "Title", type: "text", placeholder: "Follow up with {{client.name}}" },
      { key: "taskDescription", label: "Description", type: "textarea" },
      { key: "taskPriority", label: "Priority", type: "select", options: [{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }] },
      { key: "taskDueInDays", label: "Due in (days)", type: "number" },
      { key: "assignTo", label: "Assign to user id", type: "text" },
    ],
  },
  {
    type: "create_invoice",
    label: "Create invoice",
    description: "Generate an invoice for a client.",
    icon: "FileText",
    fields: [
      { key: "clientId", label: "Client id", type: "text" },
      { key: "taxRate", label: "Tax rate %", type: "number" },
      { key: "items", label: "Items (JSON)", type: "textarea", help: '[{ "description": "...", "quantity": 1, "unitPrice": 100 }]' },
    ],
  },
  {
    type: "create_quotation",
    label: "Create quotation",
    description: "Generate a CRM quotation for a company.",
    icon: "FileText",
    fields: [
      { key: "clientId", label: "CRM company id", type: "text" },
      { key: "taxRate", label: "Tax rate %", type: "number" },
      { key: "items", label: "Items (JSON)", type: "textarea" },
    ],
  },
  {
    type: "create_purchase_order",
    label: "Create purchase order",
    description: "Generate a purchase order for a supplier.",
    icon: "ShoppingCart",
    fields: [
      { key: "supplierId", label: "Supplier id", type: "text" },
      { key: "items", label: "Items (JSON)", type: "textarea" },
    ],
  },
  {
    type: "send_email",
    label: "Send email",
    description: "Send an email via the configured provider.",
    icon: "Mail",
    fields: [
      { key: "title", label: "Subject", type: "text" },
      { key: "message", label: "Body", type: "textarea" },
    ],
  },
  {
    type: "create_timeline_event",
    label: "Add timeline event",
    description: "Record a Business Timeline event.",
    icon: "Activity",
    fields: [
      { key: "eventType", label: "Event type", type: "text", placeholder: "automation.workflow.run" },
      { key: "timelineTitle", label: "Title", type: "text" },
      { key: "timelineDescription", label: "Description", type: "textarea" },
    ],
  },
  {
    type: "update_record",
    label: "Update record",
    description: "Update a field on a record (e.g. mark invoice sent).",
    icon: "Pencil",
    fields: [
      { key: "resourceType", label: "Resource type", type: "text", placeholder: "invoice" },
      { key: "resourceId", label: "Resource id", type: "text" },
      { key: "setFields", label: "Fields (JSON)", type: "textarea", help: '{ "status": "sent" }' },
    ],
  },
  {
    type: "webhook",
    label: "Call webhook",
    description: "POST/GET to an external URL.",
    icon: "Webhook",
    fields: [
      { key: "url", label: "URL", type: "text" },
      { key: "method", label: "Method", type: "select", options: [{ value: "POST", label: "POST" }, { value: "GET", label: "GET" }, { value: "PUT", label: "PUT" }] },
      { key: "bodyTemplate", label: "Body (JSON)", type: "textarea" },
    ],
  },
  {
    type: "ai_insight",
    label: "Generate AI insight",
    description: "Create an AI business insight from the event.",
    icon: "Sparkles",
    fields: [
      { key: "aiPrompt", label: "Instruction", type: "textarea", placeholder: "Summarize the impact of this invoice" },
    ],
  },
  {
    type: "ai_summarize",
    label: "AI summary",
    description: "Generate an AI summary and store as timeline note.",
    icon: "Sparkles",
    fields: [
      { key: "aiPrompt", label: "Instruction", type: "textarea" },
    ],
  },
  {
    type: "approval_request",
    label: "Request approval",
    description: "Route a resource through an approval workflow.",
    icon: "ShieldCheck",
    fields: [
      { key: "approvalWorkflowId", label: "Approval workflow id", type: "text" },
      { key: "approvalTitle", label: "Title", type: "text" },
      { key: "approvalResourceType", label: "Resource type", type: "text" },
      { key: "approvalResourceId", label: "Resource id", type: "text" },
    ],
  },
  {
    type: "delay",
    label: "Wait",
    description: "Pause before the next action.",
    icon: "Clock",
    fields: [
      { key: "delaySeconds", label: "Seconds", type: "number" },
    ],
  },
];

export function getActionMeta(type: string): CatalogAction | undefined {
  return ACTION_CATALOG.find((a) => a.type === type);
}

export function getTriggerEvent(type: string): CatalogEvent | undefined {
  return TRIGGER_EVENTS.find((e) => e.type === type);
}
