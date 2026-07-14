import { describe, it, expect } from "vitest";
import { cronMatches, nextRunFromCron } from "@/lib/automation/scheduler";
import { generateWorkflowFromText } from "@/lib/automation/workflow-generator";
import {
  automationWorkflowSchema,
  approvalWorkflowSchema,
  forecastRequestSchema,
  nlQuerySchema,
  aiDocumentGenerateSchema,
} from "@/lib/validations";

describe("cronMatches", () => {
  it("matches wildcard every-minute expression", () => {
    expect(cronMatches("* * * * *", new Date(2026, 0, 1, 9, 30))).toBe(true);
  });

  it("matches a specific minute/hour", () => {
    expect(cronMatches("30 9 * * *", new Date(2026, 0, 1, 9, 30))).toBe(true);
    expect(cronMatches("30 9 * * *", new Date(2026, 0, 1, 9, 31))).toBe(false);
  });

  it("supports step values", () => {
    expect(cronMatches("*/15 * * * *", new Date(2026, 0, 1, 9, 0))).toBe(true);
    expect(cronMatches("*/15 * * * *", new Date(2026, 0, 1, 9, 15))).toBe(true);
    expect(cronMatches("*/15 * * * *", new Date(2026, 0, 1, 9, 7))).toBe(false);
  });

  it("supports comma lists and ranges", () => {
    expect(cronMatches("0 9,17 * * *", new Date(2026, 0, 1, 17, 0))).toBe(true);
    expect(cronMatches("0 9-11 * * *", new Date(2026, 0, 1, 10, 0))).toBe(true);
    expect(cronMatches("0 9-11 * * *", new Date(2026, 0, 1, 12, 0))).toBe(false);
  });

  it("rejects malformed expressions", () => {
    expect(cronMatches("bad cron", new Date())).toBe(false);
    expect(cronMatches("* * *", new Date())).toBe(false);
  });

  it("nextRunFromCron returns a future date that matches", () => {
    const from = new Date(2026, 0, 1, 8, 0);
    const next = nextRunFromCron("0 9 * * *", from);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(from.getTime());
    expect(cronMatches("0 9 * * *", next!)).toBe(true);
  });
});

describe("generateWorkflowFromText", () => {
  it("detects an invoice-paid event trigger", () => {
    const wf = generateWorkflowFromText("When an invoice is paid, notify the team");
    expect(wf.triggerType).toBe("event");
    expect(wf.triggerConfig.event).toBe("invoice.paid");
    expect(wf.actions.some((a) => a.type === "notify")).toBe(true);
  });

  it("detects a schedule trigger", () => {
    const wf = generateWorkflowFromText("Every morning send me a summary");
    expect(wf.triggerType).toBe("schedule");
    expect(wf.triggerConfig.cron).toBe("0 9 * * *");
  });

  it("detects task and approval actions", () => {
    const wf = generateWorkflowFromText("When a deal is won, create a follow-up task and request approval");
    expect(wf.triggerConfig.event).toBe("crm.deal.won");
    const types = wf.actions.map((a) => a.type);
    expect(types).toContain("create_task");
    expect(types).toContain("approval_request");
  });

  it("falls back to a manual notify workflow", () => {
    const wf = generateWorkflowFromText("do something unusual with the data");
    expect(wf.triggerType).toBe("manual");
    expect(wf.actions.length).toBeGreaterThan(0);
  });
});

describe("Epic 8 validation schemas", () => {
  it("accepts a valid automation workflow", () => {
    const parsed = automationWorkflowSchema.safeParse({
      name: "Overdue reminder",
      triggerType: "event",
      triggerConfig: { event: "invoice.overdue" },
      actions: [{ type: "notify", config: { title: "Overdue", message: "Please pay" } }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a workflow with a short name", () => {
    const parsed = automationWorkflowSchema.safeParse({ name: "x", triggerType: "manual" });
    expect(parsed.success).toBe(false);
  });

  it("validates approval workflow with steps", () => {
    const parsed = approvalWorkflowSchema.safeParse({
      name: "PO approval",
      resourceType: "purchase_order",
      steps: [{ order: 1, label: "Manager", approverRole: "admin" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("defaults forecast type and horizon", () => {
    const parsed = forecastRequestSchema.parse({});
    expect(parsed.type).toBe("revenue");
    expect(parsed.horizon).toBe(6);
  });

  it("requires a non-trivial NL query", () => {
    expect(nlQuerySchema.safeParse({ query: "hi" }).success).toBe(false);
    expect(nlQuerySchema.safeParse({ query: "How much revenue this month?" }).success).toBe(true);
  });

  it("requires a valid AI document type", () => {
    expect(aiDocumentGenerateSchema.safeParse({ documentType: "invoice" }).success).toBe(true);
    expect(aiDocumentGenerateSchema.safeParse({ documentType: "receipt" }).success).toBe(false);
  });
});
