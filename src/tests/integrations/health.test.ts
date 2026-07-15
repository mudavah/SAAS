import { describe, it, expect } from "vitest";
import { getAdapter } from "@/lib/integrations/adapters";
import type { ConnectionView } from "@/lib/integrations/adapters/types";

function view(provider: string, over: Partial<ConnectionView> = {}): ConnectionView {
  return {
    integrationId: "int-1",
    provider,
    organizationId: "org-1",
    category: "payment",
    enabled: true,
    config: {},
    credentials: {},
    ...over,
  };
}

describe("Integration Hub health (adapters)", () => {
  it("reports degraded when a payment provider lacks secrets", async () => {
    const result = await getAdapter("stripe")!.testConnection(view("stripe"));
    expect(result.ok).toBe(false);
    expect(result.status).toBe("degraded");
  });

  it("reports healthy when secrets are present", async () => {
    const result = await getAdapter("stripe")!.testConnection(
      view("stripe", { credentials: { apiKey: "sk_test_xxx" } })
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe("healthy");
  });

  it("reports healthy for local hardware integrations", async () => {
    const result = await getAdapter("barcode_scanner")!.testConnection(view("barcode_scanner"));
    expect(result.status).toBe("healthy");
  });

  it("reports degraded for OAuth providers until authorized", async () => {
    expect((await getAdapter("google_calendar")!.testConnection(view("google_calendar"))).status).toBe(
      "degraded"
    );
    expect(
      (await getAdapter("google_calendar")!.testConnection(view("google_calendar", { hasToken: true }))).status
    ).toBe("healthy");
  });

  it("returns undefined for unknown providers", () => {
    const adapter = getAdapter("totally_unknown");
    expect(adapter).toBeUndefined();
  });
});
