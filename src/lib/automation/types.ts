/**
 * KaziFlow — Automation Platform types
 * ------------------------------------------------------------------
 * Shared types for the workflow automation engine: triggers, conditions,
 * actions and runs. These mirror the Drizzle schema but are decoupled so the
 * engine can be unit-tested in isolation.
 */

export type TriggerType = "event" | "schedule" | "manual";
export type WorkflowStatus = "draft" | "active" | "paused" | "error";
export type RunStatus =
  | "pending"
  | "running"
  | "success"
  | "partial"
  | "failed"
  | "skipped";

export type ActionType =
  | "notify"
  | "create_task"
  | "create_invoice"
  | "create_quotation"
  | "create_purchase_order"
  | "send_email"
  | "create_timeline_event"
  | "update_record"
  | "webhook"
  | "ai_insight"
  | "ai_summarize"
  | "approval_request"
  | "delay";

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "in"
  | "not_in"
  | "is_empty"
  | "is_not_empty";

export interface ConditionRule {
  field: string; // dot-path into the run context, e.g. "invoice.status"
  op: ConditionOperator;
  value?: unknown;
}

export interface ConditionGroup {
  operator: "and" | "or";
  rules: (ConditionRule | ConditionGroup)[];
}

export interface TriggerConfig {
  event?: string; // business event type, e.g. "invoice.created"
  cron?: string; // standard cron expression (minute hour day month weekday)
  timezone?: string; // IANA timezone
  // event filters: only fire when the event matches
  eventFilters?: ConditionGroup;
}

export interface WorkflowActionConfig {
  // notify
  channel?: "inApp" | "email" | "both";
  recipients?: string[]; // user ids; empty => broadcast
  title?: string;
  message?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  deepLink?: string;
  // create_task
  taskTitle?: string;
  taskDescription?: string;
  taskPriority?: "low" | "medium" | "high";
  taskDueInDays?: number;
  assignTo?: string;
  // create_invoice / create_quotation / create_purchase_order
  clientId?: string;
  supplierId?: string;
  items?: { description: string; quantity: number; unitPrice: number }[];
  taxRate?: number;
  // create_timeline_event
  eventType?: string;
  timelineTitle?: string;
  timelineDescription?: string;
  // update_record
  resourceType?: string;
  resourceId?: string;
  setFields?: Record<string, unknown>;
  // webhook
  url?: string;
  method?: "GET" | "POST" | "PUT";
  headers?: Record<string, string>;
  bodyTemplate?: string;
  // ai_insight / ai_summarize
  aiPrompt?: string;
  aiInstruction?: string;
  // approval_request
  approvalWorkflowId?: string;
  approvalTitle?: string;
  approvalResourceType?: string;
  approvalResourceId?: string;
  // delay
  delaySeconds?: number;
  // generic template fields (support {{path}} interpolation)
  [key: string]: unknown;
}

export interface WorkflowAction {
  id: string;
  workflowId: string;
  organizationId: string;
  order: number;
  type: ActionType;
  name?: string | null;
  config: WorkflowActionConfig;
  conditions: ConditionGroup | Record<string, never>;
}

export interface Workflow {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  conditions: ConditionGroup | Record<string, never>;
  actions: WorkflowAction[];
  lastRunAt?: Date | string | null;
}

export interface AutomationEvent {
  type: string; // event type, e.g. "invoice.created"
  organizationId: string;
  userId?: string | null;
  payload: Record<string, unknown>;
}

export interface RunContext {
  event: AutomationEvent;
  /** Resolved org/scoped data available to conditions & template interpolation. */
  data: Record<string, unknown>;
}

export interface ActionResult {
  actionId: string;
  type: ActionType;
  order: number;
  status: RunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string;
}
