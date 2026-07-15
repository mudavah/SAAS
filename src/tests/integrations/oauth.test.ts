import { describe, it, expect } from "vitest";
import {
  buildAuthUrl,
  signState,
  verifyState,
  isOAuthProvider,
} from "@/lib/integrations/oauth";

describe("Integration Hub OAuth", () => {
  it("signs and verifies state round-trip", () => {
    const state = signState("org-1", "int-1");
    const parsed = verifyState(state);
    expect(parsed).not.toBeNull();
    expect(parsed?.organizationId).toBe("org-1");
    expect(parsed?.integrationId).toBe("int-1");
  });

  it("rejects tampered state", () => {
    const state = signState("org-1", "int-1");
    const [payload] = state.split(".");
    const tampered = `${payload}.invalidsignature`;
    expect(verifyState(tampered)).toBeNull();
  });

  it("builds an authorize URL with required params", () => {
    expect(isOAuthProvider("google_calendar")).toBe(true);
    expect(isOAuthProvider("stripe")).toBe(false);
    const url = buildAuthUrl("google_calendar", "org-1", "int-1", {
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
      redirectUri: "https://app.test/callback",
      clientId: "client-123",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("client_id")).toBe("client-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://app.test/callback");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("state")).toBeTruthy();
    expect(
      parsed.searchParams.get("scope")?.includes("calendar.events")
    ).toBe(true);
  });

  it("throws for non-OAuth providers", () => {
    expect(() =>
      buildAuthUrl("stripe", "org-1", "int-1", { redirectUri: "x" })
    ).toThrow();
  });
});
