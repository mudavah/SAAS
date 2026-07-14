/**
 * KaziFlow — Automation action executors
 * ------------------------------------------------------------------
 * Each executor performs one side-effecting action (notify, create records,
 * call webhooks, generate AI text, request approvals, ...). Every action is
 * scoped to the workflow's organization and audited via the run log. Errors are
 * captured per-action so one failure never aborts the whole run.
 */
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import {
  tasks,
  invoices,
  invoiceItems,
  crmQuotations,
  crmQuotationItems,
  inventoryPurchaseOrders,
  inventoryPurchaseOrderItems,
  aiInsights,
  automationRunLogs,
} from "@/db/schema";
import type {
  ActionResult,
  WorkflowAction,
  AutomationEvent,
  RunContext,
} from "./types";
import type { ServerContext } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { logAuditSafe } from "@/lib/audit";
import { generateInvoiceNumber } from "@/lib/utils";
import { interpolate, interpolateObject } from "./conditions";
import { callOpenAI } from "@/lib/ai/copilot";

function genNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${year}-${rand}`;
}

async function persistLog(params: {
  runId: string;
  workflowId: string;
  organizationId: string;
  actionId: string | null;
  order: number;
  actionType: string | null;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string;
}) {
  await db.insert(automationRunLogs).values({
    runId: params.runId,
    workflowId: params.workflowId,
    organizationId: params.organizationId,
    actionId: params.actionId,
    order: params.order,
    actionType: params.actionType as any,
    status: params.status as any,
    input: params.input,
    output: params.output,
    error: params.error,
    finishedAt: new Date(),
  } as any);
}

function parseItems(raw: unknown): { description: string; quantity: number; unitPrice: number }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as any;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function executeAction(
  ctx: ServerContext,
  action: WorkflowAction,
  runCtx: RunContext,
  runId: string
): Promise<ActionResult> {
  const cfg = interpolateObject(action.config, runCtx.data) as Record<string, any>;
  const input = { type: action.type, config: cfg };
  const result: ActionResult = {
    actionId: action.id,
    type: action.type,
    order: action.order,
    status: "success",
    input,
    output: {},
  };

  try {
    switch (action.type) {
      case "notify": {
        await createNotification({
          organizationId: ctx.organizationId,
          category: "ai",
          type: "automation_action",
          title: cfg.title || "Automation notification",
          message: cfg.message || "",
          priority: (cfg.priority as any) || "normal",
          deepLink: cfg.deepLink || null,
          userId: cfg.recipients?.length ? cfg.recipients[0] : null,
        });
        result.output = { notified: true };
        break;
      }

      case "create_task": {
        const dueDate = cfg.taskDueInDays
          ? new Date(Date.now() + Number(cfg.taskDueInDays) * 86_400_000)
          : null;
        const [task] = await db
          .insert(tasks)
          .values({
            organizationId: ctx.organizationId,
            userId: ctx.userId!,
            title: cfg.taskTitle || "Automated task",
            description: cfg.taskDescription || null,
            priority: (cfg.taskPriority as any) || "medium",
            dueDate,
            status: "todo",
          })
          .returning();
        result.output = { taskId: task.id };
        break;
      }

      case "create_invoice": {
        const items = parseItems(cfg.items);
        if (!cfg.clientId || items.length === 0) {
          throw new Error("create_invoice requires clientId and items");
        }
        const taxRate = Number(cfg.taxRate ?? 16);
        const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;
        const now = new Date();
        const [inv] = await db
          .insert(invoices)
          .values({
            organizationId: ctx.organizationId,
            userId: ctx.userId!,
            clientId: cfg.clientId,
            invoiceNumber: generateInvoiceNumber(),
            issueDate: now,
            dueDate: new Date(now.getTime() + 30 * 86_400_000),
            currency: "KES",
            subtotal: subtotal.toFixed(2),
            taxRate: taxRate.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2),
            status: "draft",
          })
          .returning();
        await db.insert(invoiceItems).values(
          items.map((it, idx) => ({
            invoiceId: inv.id,
            description: it.description,
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
            amount: String(it.quantity * it.unitPrice),
            sortOrder: idx,
          }))
        );
        await logAuditSafe(ctx, {
          action: "invoice.create",
          category: "invoices",
          resourceType: "invoice",
          resourceId: inv.id,
          description: `Invoice created by automation ${action.id}`,
        });
        await emitTimelineEvent({
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          eventType: "invoice.created",
          title: `Invoice ${inv.invoiceNumber} created (automation)`,
          description: `Total KES ${inv.total}`,
          resourceType: "invoice",
          resourceId: inv.id,
        });
        result.output = { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber };
        break;
      }

      case "create_quotation": {
        const items = parseItems(cfg.items);
        if (!cfg.clientId) throw new Error("create_quotation requires clientId");
        const taxRate = Number(cfg.taxRate ?? 16);
        const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;
        const [q] = await db
          .insert(crmQuotations)
          .values({
            organizationId: ctx.organizationId,
            userId: ctx.userId!,
            quotationNumber: genNumber("QUO"),
            companyId: cfg.clientId,
            status: "draft",
            version: 1,
            currency: "KES",
            subtotal: subtotal.toFixed(2),
            taxRate: taxRate.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2),
          })
          .returning();
        if (items.length) {
          await db.insert(crmQuotationItems).values(
            items.map((it, idx) => ({
              organizationId: ctx.organizationId,
              quotationId: q.id,
              description: it.description,
              quantity: String(it.quantity),
              unitPrice: String(it.unitPrice),
              amount: String(it.quantity * it.unitPrice),
              sortOrder: idx,
            }))
          );
        }
        result.output = { quotationId: q.id, quotationNumber: q.quotationNumber };
        break;
      }

      case "create_purchase_order": {
        const items = parseItems(cfg.items);
        if (!cfg.supplierId || items.length === 0)
          throw new Error("create_purchase_order requires supplierId and items");
        const [po] = await db
          .insert(inventoryPurchaseOrders)
          .values({
            organizationId: ctx.organizationId,
            userId: ctx.userId!,
            supplierId: cfg.supplierId,
            status: "draft",
            orderDate: new Date(),
          })
          .returning();
        await db.insert(inventoryPurchaseOrderItems).values(
          items.map((it) => ({
            organizationId: ctx.organizationId,
            purchaseOrderId: po.id,
            productId: (it as any).productId,
            quantity: String(it.quantity),
            unitCost: String(it.unitPrice),
            receivedQuantity: "0",
          }))
        );
        result.output = { purchaseOrderId: po.id };
        break;
      }

      case "send_email": {
        // Best-effort: routed through the notification center's email channel.
        await createNotification({
          organizationId: ctx.organizationId,
          category: "ai",
          type: "automation_email",
          title: cfg.title || "Automation email",
          message: cfg.message || "",
          userId: ctx.userId,
        });
        result.output = { queued: true };
        break;
      }

      case "create_timeline_event": {
        await emitTimelineEvent({
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          eventType: (cfg.eventType || "automation.workflow.run") as any,
          title: cfg.timelineTitle || "Automation event",
          description: cfg.timelineDescription || null,
          metadata: { source: "automation", actionId: action.id },
        });
        result.output = { emitted: true };
        break;
      }

      case "update_record": {
        const fields = typeof cfg.setFields === "string" ? JSON.parse(cfg.setFields) : cfg.setFields || {};
        const resourceType = cfg.resourceType as string;
        const resourceId = cfg.resourceId as string;
        if (!resourceType || !resourceId) throw new Error("update_record requires resourceType and resourceId");
        const tableMap: Record<string, any> = {
          invoice: invoices,
          task: tasks,
        };
        const table = tableMap[resourceType];
        if (!table) throw new Error(`update_record unsupported resource: ${resourceType}`);
        await db
          .update(table)
          .set({ ...fields, updatedAt: new Date() })
          .where(eqOrg(resourceType, resourceId, ctx.organizationId));
        result.output = { updated: resourceType, resourceId };
        break;
      }

      case "webhook": {
        const method = (cfg.method || "POST") as string;
        const headers: Record<string, string> = { "Content-Type": "application/json", ...(cfg.headers || {}) };
        const body = cfg.bodyTemplate
          ? JSON.stringify(interpolateObject(JSON.parse(typeof cfg.bodyTemplate === "string" ? cfg.bodyTemplate : "{}"), runCtx.data))
          : JSON.stringify({ event: runCtx.event, data: runCtx.data });
        const res = await fetch(cfg.url as string, {
          method,
          headers,
          body: method === "GET" ? undefined : body,
        });
        result.output = { status: res.status, ok: res.ok };
        if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
        break;
      }

      case "ai_insight":
      case "ai_summarize": {
        const instruction = cfg.aiPrompt || cfg.aiInstruction || "Summarize the event.";
        let text: string;
        try {
          text = await callOpenAI(
            "You are KaziFlow AI. Summarize business events concisely for a Kenyan SME.",
            `${instruction}\n\nEvent: ${JSON.stringify(runCtx.event)}`,
            []
          );
        } catch {
          text = `[AI unavailable] ${interpolate(instruction, runCtx.data)}`;
        }
        if (action.type === "ai_insight") {
          await db.insert(aiInsights).values({
            organizationId: ctx.organizationId,
            userId: ctx.userId!,
            type: "automation",
            title: cfg.title || "Automated AI insight",
            description: text,
            priority: "normal",
            data: { source: "automation", actionId: action.id },
          });
        }
        await emitTimelineEvent({
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          eventType: "ai.insight_generated",
          title: cfg.title || "AI insight generated",
          description: text.slice(0, 280),
          metadata: { source: "automation" },
        });
        result.output = { text };
        break;
      }

      case "approval_request": {
        // Deferred to the approval engine; we record the intent here so the
        // run log is complete. The actual request is created by the engine when
        // the action carries an approvalWorkflowId.
        const { requestApproval } = await import("./approval");
        const req = await requestApproval(ctx, {
          approvalWorkflowId: cfg.approvalWorkflowId as string,
          title: cfg.approvalTitle || "Approval requested",
          resourceType: cfg.approvalResourceType || "automation",
          resourceId: cfg.approvalResourceId || runCtx.event.payload?.id || null,
          payload: { event: runCtx.event, data: runCtx.data },
        });
        result.output = { approvalRequestId: req.id, status: req.status };
        break;
      }

      case "delay": {
        const secs = Number(cfg.delaySeconds || 0);
        if (secs > 0 && secs <= 3600) {
          await new Promise((r) => setTimeout(r, secs * 1000));
        }
        result.output = { waitedSeconds: secs };
        break;
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (err) {
    result.status = "failed";
    result.error = err instanceof Error ? err.message : String(err);
  }

  await persistLog({
    runId,
    workflowId: action.workflowId,
    organizationId: ctx.organizationId,
    actionId: action.id,
    order: action.order,
    actionType: action.type,
    status: result.status,
    input,
    output: result.output,
    error: result.error,
  });

  return result;
}

// Minimal org-scoped equality for update_record.
function eqOrg(resourceType: string, id: string, organizationId: string) {
  const tableMap: Record<string, any> = { invoice: invoices, task: tasks };
  const table = tableMap[resourceType];
  return and(eq(table.id, id), eq(table.organizationId, organizationId));
}
