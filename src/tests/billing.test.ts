/**
 * Subscription & Billing Validation
 * ------------------------------------------------------------------
 * Validates the freemium/subscription model invariants that gate feature and
 * quota access. These are pure checks over the canonical PLAN_LIMITS / PRICING
 * sources of truth (no DB / Stripe call required), so they run in every CI
 * without secrets.
 */
import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, PRICING, type PlanType } from "@/lib/utils";

describe("plan limits", () => {
  it("free tier enforces hard quotas", () => {
    expect(PLAN_LIMITS.free.invoicesPerMonth).toBe(5);
    expect(PLAN_LIMITS.free.clients).toBe(10);
    expect(PLAN_LIMITS.free.aiRequestsPerMonth).toBe(10);
  });

  it("paid tiers remove invoice/client limits", () => {
    expect(PLAN_LIMITS.pro.invoicesPerMonth).toBe(Infinity);
    expect(PLAN_LIMITS.pro.clients).toBe(Infinity);
    expect(PLAN_LIMITS.business.invoicesPerMonth).toBe(Infinity);
    expect(PLAN_LIMITS.business.clients).toBe(Infinity);
  });

  it("business unlockables are gated to paid plans", () => {
    for (const plan of ["pro", "business"] as PlanType[]) {
      expect(PLAN_LIMITS[plan].features).toContain("mpesa_payments");
      expect(PLAN_LIMITS[plan].features).toContain("tax_reports");
    }
    expect(PLAN_LIMITS.free.features).not.toContain("mpesa_payments");
    expect(PLAN_LIMITS.free.features).not.toContain("api_access");
  });

  it("api_access is reserved for business plan", () => {
    expect(PLAN_LIMITS.business.features).toContain("api_access");
    expect(PLAN_LIMITS.pro.features).not.toContain("api_access");
    expect(PLAN_LIMITS.free.features).not.toContain("api_access");
  });
});

describe("pricing", () => {
  it("free is KES 0 and paid tiers are priced", () => {
    expect(PRICING.free.price).toBe(0);
    expect(PRICING.pro.price).toBeGreaterThan(0);
    expect(PRICING.business.price).toBeGreaterThan(PRICING.pro.price);
    expect(PRICING.free.currency).toBe("KES");
  });

  it("every plan has a human name and currency", () => {
    for (const plan of Object.keys(PRICING) as PlanType[]) {
      expect(PRICING[plan].name.length).toBeGreaterThan(0);
      expect(PRICING[plan].currency).toBe("KES");
    }
  });
});

describe("quota enforcement helper (billing logic)", () => {
  /** Pure re-implementation of the quota rule used by API guards. */
  function withinQuota(plan: PlanType, used: number, limitKey: keyof typeof PLAN_LIMITS.free): boolean {
    const limit = PLAN_LIMITS[plan][limitKey] as number;
    if (limit === Infinity) return true;
    return used < limit;
  }

  it("blocks the 6th free invoice of the month", () => {
    expect(withinQuota("free", 4, "invoicesPerMonth")).toBe(true);
    expect(withinQuota("free", 5, "invoicesPerMonth")).toBe(false);
    expect(5 < (PLAN_LIMITS.free.invoicesPerMonth as number)).toBe(false);
  });

  it("never blocks paid plans", () => {
    expect(withinQuota("pro", 10_000, "invoicesPerMonth")).toBe(true);
    expect(withinQuota("business", 10_000, "clients")).toBe(true);
  });
});
