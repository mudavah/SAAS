/**
 * Security Audit — API authentication & authorization primitives
 * ------------------------------------------------------------------
 * Verifies the building blocks that keep the public API and tenant data safe:
 *   - API key format / credential extraction
 *   - scope checks (including the wildcard "*")
 *   - rate-limit windowing math
 * These are pure (no DB / network), so they run in every CI pass.
 */
import { describe, it, expect } from "vitest";
import {
  generateApiSecret,
  extractApiCredentials,
  principalHasScope,
} from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";

describe("API key format & extraction", () => {
  it("generates a prefixed live/test secret", () => {
    const live = generateApiSecret("live");
    const test = generateApiSecret("test");
    expect(live.secret.startsWith("kf_live_")).toBe(true);
    expect(test.secret.startsWith("kf_test_")).toBe(true);
    expect(live.prefix).toBe(live.secret.slice(0, 12));
    expect(live.secret.length).toBeGreaterThan(20);
  });

  it("extracts bearer credentials", () => {
    const req = new Request("https://x/api", {
      headers: { Authorization: "Bearer kf_live_abc" },
    });
    expect(extractApiCredentials(req)).toBe("kf_live_abc");
  });

  it("extracts x-api-key header", () => {
    const req = new Request("https://x/api", { headers: { "x-api-key": "kf_test_xyz" } });
    expect(extractApiCredentials(req)).toBe("kf_test_xyz");
  });

  it("returns null when no credential present", () => {
    const req = new Request("https://x/api");
    expect(extractApiCredentials(req)).toBeNull();
  });
});

describe("scope enforcement", () => {
  it("wildcard scope grants everything", () => {
    expect(principalHasScope({ scopes: ["*"] } as any, "invoices.delete" as any)).toBe(true);
  });

  it("explicit scope granted", () => {
    expect(
      principalHasScope({ scopes: ["invoices.view"] } as any, "invoices.view" as any)
    ).toBe(true);
  });

  it("missing scope denied", () => {
    expect(
      principalHasScope({ scopes: ["invoices.view"] } as any, "invoices.delete" as any)
    ).toBe(false);
  });
});

describe("rate limiting window math", () => {
  it("allows up to the limit then blocks", async () => {
    const key = "sec:" + Math.random();
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit({ key, limit: 5 });
      expect(r.allowed).toBe(true);
    }
    const blocked = await rateLimit({ key, limit: 5 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
