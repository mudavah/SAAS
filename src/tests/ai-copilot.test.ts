/**
 * AI Copilot module — unit tests
 * ------------------------------------------------------------------
 * Validates the copilot request schema (the input boundary for the AI Copilot
 * API) and the prompt-building helper. Guards against unknown request types
 * and ensures the system prompt is deterministic and org-scoped. The
 * `aiRequestSchema.context` is `.min(1)` so an empty string is rejected while
 * whitespace-only is still considered a (non-empty) string by Zod.
 */
import { describe, it, expect } from "vitest";
import { aiRequestSchema } from "@/lib/validations";
import { buildSystemPrompt, type OrgContext } from "@/lib/ai/copilot";

const fullContext: OrgContext = {
  invoicesThisMonth: 12,
  revenueThisMonth: "450000",
  outstandingInvoices: 4,
  overdueInvoices: 3,
  activeClients: 20,
  recentPayments: 8,
  lowStockProducts: 2,
  recentExpenses: "120000",
  complianceAlerts: 1,
  aiRequestsUsed: 3,
  aiRequestsLimit: 10,
};

describe("aiRequestSchema (copilot input boundary)", () => {
  it("accepts a valid request with a known type", () => {
    expect(
      aiRequestSchema.safeParse({ type: "invoice_description", context: "Draft an invoice for web design" })
        .success
    ).toBe(true);
  });

  it("rejects an unknown type", () => {
    expect(aiRequestSchema.safeParse({ type: "hack_everything", context: "x" }).success).toBe(false);
  });

  it("rejects an empty context", () => {
    expect(aiRequestSchema.safeParse({ type: "business_tip", context: "" }).success).toBe(false);
  });

  it("defaults tone to professional", () => {
    const r = aiRequestSchema.parse({ type: "business_insights", context: "Q3 results" });
    expect(r.tone).toBe("professional");
  });
});

describe("buildSystemPrompt", () => {
  it("produces a non-empty prompt containing the org context", () => {
    const prompt = buildSystemPrompt(fullContext);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("KaziFlow AI"); // stable prompt banner
    expect(prompt).toContain("12"); // invoicesThisMonth echoed
    expect(prompt).toContain("3"); // overdueInvoices echoed
  });

  it("is deterministic for identical context", () => {
    expect(buildSystemPrompt(fullContext)).toBe(buildSystemPrompt(fullContext));
  });
});
