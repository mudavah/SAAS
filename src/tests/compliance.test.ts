/**
 * Compliance module — unit tests
 * ------------------------------------------------------------------
 * Exercises the pure compliance engine logic that backs the Compliance Center:
 * health-score banding and eTIMS submission-count math. Pure (no DB), so it
 * runs in CI without a live database and guards the scoring invariants.
 */
import { describe, it, expect } from "vitest";
import { computeHealthScore, type HealthScoreInput } from "@/lib/compliance/engine";
import {
  complianceValidateSchema,
  complianceRetrySchema,
} from "@/lib/validations";

function mkInput(over: Partial<HealthScoreInput> = {}): HealthScoreInput {
  return {
    counts: {
      total: 100,
      validated: 80,
      submitted: 10,
      pending: 8,
      failed: 10,
      cancelled: 2,
    },
    activeAlerts: 1,
    isConfigured: true,
    ...over,
  };
}

describe("computeHealthScore", () => {
  it("returns 'excellent' for a fully successful, alert-free tenant", () => {
    const r = computeHealthScore(
      mkInput({
        counts: { total: 100, validated: 95, submitted: 5, pending: 0, failed: 0, cancelled: 0 },
        activeAlerts: 0,
      })
    );
    expect(r.numericScore).toBeGreaterThanOrEqual(90);
    expect(r.score).toBe("excellent");
  });

  it("penalises failed submissions and active alerts", () => {
    const good = computeHealthScore(mkInput());
    const bad = computeHealthScore(
      mkInput({
        counts: { total: 100, validated: 40, submitted: 5, pending: 5, failed: 50, cancelled: 0 },
        activeAlerts: 10,
      })
    );
    expect(bad.numericScore).toBeLessThan(good.numericScore);
    expect(bad.score).toBe("poor");
  });

  it("never returns a negative score", () => {
    const r = computeHealthScore(
      mkInput({
        counts: { total: 10, validated: 0, submitted: 0, pending: 0, failed: 10, cancelled: 0 },
        activeAlerts: 50,
      })
    );
    expect(r.numericScore).toBeGreaterThanOrEqual(0);
  });

  it("treats a misconfigured tenant as degraded", () => {
    const r = computeHealthScore(mkInput({ isConfigured: false }));
    expect(r.numericScore).toBeLessThan(90);
  });
});

describe("compliance validation schemas", () => {
  it("accepts a KRA PIN validation request", () => {
    expect(complianceValidateSchema.safeParse({ pin: "P051234567X" }).success).toBe(true);
  });
  it("accepts an invoice validation request", () => {
    expect(complianceValidateSchema.safeParse({ invoiceId: "inv-1" }).success).toBe(true);
  });
  it("accepts an empty payload (both fields optional)", () => {
    expect(complianceValidateSchema.safeParse({}).success).toBe(true);
  });
  it("accepts a valid retry payload", () => {
    expect(complianceRetrySchema.safeParse({ recordIds: ["sub-1", "sub-2"] }).success).toBe(true);
  });
});
