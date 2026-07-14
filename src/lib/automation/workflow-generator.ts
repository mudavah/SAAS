/**
 * KaziFlow — AI Workflow Generation
 * ------------------------------------------------------------------
 * Turns a natural-language description into a structured workflow definition
 * (trigger + ordered actions). Uses OpenAI when configured, with a deterministic
 * rule-based fallback so generation works offline and is fully testable.
 */
import { callOpenAI } from "@/lib/ai/copilot";
import type { Workflow, WorkflowActionConfig } from "./types";

export interface GeneratedWorkflow {
  name: string;
  description: string;
  triggerType: "event" | "schedule" | "manual";
  triggerConfig: Record<string, unknown>;
  conditions: Record<string, unknown>;
  actions: {
    type: string;
    name?: string;
    config: WorkflowActionConfig;
  }[];
}

const EVENT_KEYWORDS: { match: RegExp; event: string }[] = [
  { match: /invoice (is )?(paid|payment received)/i, event: "invoice.paid" },
  { match: /invoice (is )?(created|generated|raised)/i, event: "invoice.created" },
  { match: /invoice (becomes )?overdue|overdue invoice/i, event: "invoice.overdue" },
  { match: /payment (is )?received/i, event: "payment.received" },
  { match: /low stock|reorder|stockout|out of stock/i, event: "inventory.low_stock" },
  { match: /deal (is )?(won|closed)/i, event: "crm.deal.won" },
  { match: /new lead|lead (is )?created/i, event: "crm.lead.created" },
  { match: /quotation (is )?created/i, event: "crm.quotation.created" },
  { match: /pos sale|sale (is )?completed/i, event: "pos.sale.completed" },
  { match: /purchase order (is )?ordered|po ordered/i, event: "procurement.po.ordered" },
  { match: /payroll run (is )?approved/i, event: "payroll.run.approved" },
  { match: /new client|client (is )?created/i, event: "client.created" },
  { match: /expense (is )?(created|logged)/i, event: "expense.created" },
];

function detectEvent(text: string): string {
  for (const k of EVENT_KEYWORDS) if (k.match.test(text)) return k.event;
  return "manual";
}

function detectSchedule(text: string): string | undefined {
  if (/every (day|morning|night)/i.test(text)) return "0 9 * * *";
  if (/every week|weekly/i.test(text)) return "0 9 * * 1";
  if (/every month|monthly/i.test(text)) return "0 9 1 * *";
  if (/every hour|hourly/i.test(text)) return "0 * * * *";
  return undefined;
}

function buildActions(text: string): GeneratedWorkflow["actions"] {
  const actions: GeneratedWorkflow["actions"] = [];

  if (/notify|send (a |an )?notification|alert|tell (me|the team)/i.test(text)) {
    actions.push({
      type: "notify",
      name: "Notify team",
      config: {
        title: "Automation alert",
        message: `Triggered by: ${truncate(text, 140)}`,
        channel: "inApp",
        priority: "normal",
      },
    });
  }
  if (/create (a |an )?task|follow[- ]?up|remind me|to-?do/i.test(text)) {
    actions.push({
      type: "create_task",
      name: "Create follow-up task",
      config: {
        taskTitle: `Follow up: ${truncate(text, 80)}`,
        taskPriority: "medium",
        taskDueInDays: 2,
      },
    });
  }
  if (/create (an |a )?invoice|raise (an )?invoice/i.test(text)) {
    actions.push({
      type: "create_invoice",
      name: "Create invoice",
      config: { taxRate: 16, items: [] },
    });
  }
  if (/request approval|needs? approval|approve/i.test(text)) {
    actions.push({
      type: "approval_request",
      name: "Request approval",
      config: { approvalTitle: "Approval requested by automation", approvalResourceType: "automation" },
    });
  }
  if (/summar/i.test(text) || /ai insight|analyze/i.test(text)) {
    actions.push({
      type: "ai_summarize",
      name: "AI summary",
      config: { aiPrompt: "Summarize the business impact of this event." },
    });
  }
  if (/webhook|http|call (an? )?(url|endpoint|api)/i.test(text)) {
    actions.push({
      type: "webhook",
      name: "Call webhook",
      config: { url: "", method: "POST", bodyTemplate: "{}" },
    });
  }
  if (actions.length === 0) {
    // Default safe action: notify.
    actions.push({
      type: "notify",
      name: "Notify",
      config: { title: "Automation triggered", message: truncate(text, 140), channel: "inApp", priority: "normal" },
    });
  }
  return actions;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function generateWorkflowFromText(text: string): GeneratedWorkflow {
  const event = detectEvent(text);
  const cron = detectSchedule(text);
  const triggerType = cron ? "schedule" : event === "manual" ? "manual" : "event";

  return {
    name: `Auto: ${truncate(text, 48)}`,
    description: text,
    triggerType,
    triggerConfig:
      triggerType === "event"
        ? { event }
        : triggerType === "schedule"
        ? { cron, timezone: "Africa/Nairobi" }
        : {},
    conditions: {},
    actions: buildActions(text),
  };
}

/**
 * LLM-enhanced generation. Falls back to the deterministic generator when no
 * API key is configured or the model returns something we can't parse.
 */
export async function generateWorkflowWithAI(text: string): Promise<GeneratedWorkflow> {
  const base = generateWorkflowFromText(text);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return base;

  try {
    const prompt = `You are KaziFlow automation builder. Given this description, return ONLY JSON of a workflow with keys: name, triggerType (event|schedule|manual), triggerConfig {event?|cron?}, conditions {}, actions: [{type, name?, config}]. Supported action types: notify, create_task, create_invoice, create_quotation, create_purchase_order, send_email, create_timeline_event, update_record, webhook, ai_insight, ai_summarize, approval_request, delay. Description: ${text}`;
    const raw = await callOpenAI("You output only valid JSON.", prompt, []);
    const json = extractJson(raw);
    if (json && Array.isArray(json.actions)) {
      return {
        name: json.name || base.name,
        description: text,
        triggerType: json.triggerType || base.triggerType,
        triggerConfig: json.triggerConfig || base.triggerConfig,
        conditions: json.conditions || {},
        actions: json.actions.map((a: any) => ({ type: a.type, name: a.name, config: a.config || {} })),
      };
    }
  } catch {
    // fall through
  }
  return base;
}

function extractJson(text: string): any | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  return null;
}

/** Starter templates shown in the builder's "templates" gallery. */
export const WORKFLOW_TEMPLATES: { name: string; description: string; build: () => GeneratedWorkflow }[] = [
  {
    name: "Overdue invoice follow-up",
    description: "When an invoice becomes overdue, notify the team and create a follow-up task.",
    build: () => generateWorkflowFromText("When an invoice becomes overdue, send a notification and create a follow-up task"),
  },
  {
    name: "Low stock reorder",
    description: "When stock is low, notify and request approval to reorder.",
    build: () => generateWorkflowFromText("When inventory is low stock, notify and request approval to reorder"),
  },
  {
    name: "Deal won celebration",
    description: "When a CRM deal is won, notify the team and summarize with AI.",
    build: () => generateWorkflowFromText("When a CRM deal is won, send a notification and create an AI summary"),
  },
  {
    name: "Daily morning summary",
    description: "Every morning, generate an AI summary of yesterday's business.",
    build: () => generateWorkflowFromText("Every morning generate an AI summary of the business"),
  },
];
