import { describe, it, expect } from "vitest";
import { getAdapter } from "@/lib/integrations/adapters";
import type { ConnectionView, SendPayload } from "@/lib/integrations/adapters/types";

function view(provider: string, over: Partial<ConnectionView> = {}): ConnectionView {
  return {
    integrationId: "int-1",
    provider,
    organizationId: "org-1",
    category: "email",
    enabled: true,
    config: {},
    credentials: {},
    ...over,
  };
}

const payload: SendPayload = {
  to: "customer@example.com",
  subject: "Hi",
  body: "Test message",
};

describe("Integration Hub dispatch (adapters)", () => {
  it("fails when the email provider is not configured", async () => {
    const result = await getAdapter("email")!.send!(view("email"), payload);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
  });

  it("queues when email is configured (simulated offline)", async () => {
    const result = await getAdapter("email")!.send!(
      view("email", { credentials: { apiKey: "re_test" } }),
      payload
    );
    expect(result.ok).toBe(true);
  });

  it("fails when a payment provider lacks secrets", async () => {
    const result = await getAdapter("mpesa")!.send!(
      view("mpesa", { category: "payment" }),
      { ...payload, to: "+254700000000" }
    );
    expect(result.ok).toBe(false);
  });

  it("resolves a send adapter for every messaging provider", () => {
    for (const provider of ["email", "sms", "whatsapp", "push"]) {
      expect(getAdapter(provider)!.send).toBeTypeOf("function");
    }
  });
});
