/**
 * Production environment hardening — unit tests
 * ------------------------------------------------------------------
 * Verifies the fail-closed boot gate: in production the server must refuse to
 * start when a required secret (e.g. APP_ENCRYPTION_KEY / AUTH_SECRET) is
 * missing, because that would otherwise persist credentials in plaintext.
 * In non-production the same missing key must NOT throw (dev/test boot).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { requireProductionSecretsConfigured } from "@/lib/config/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireProductionSecretsConfigured", () => {
  it("does not throw in non-production when secrets are missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENCRYPTION_KEY", undefined as unknown as string);
    vi.stubEnv("AUTH_SECRET", undefined as unknown as string);
    expect(() => requireProductionSecretsConfigured()).not.toThrow();
  });

  it("does not throw in production when all required secrets are present", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENCRYPTION_KEY", "test-encryption-key");
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");
    expect(() => requireProductionSecretsConfigured()).not.toThrow();
  });

  it("throws in production when APP_ENCRYPTION_KEY is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");
    vi.stubEnv("APP_ENCRYPTION_KEY", undefined as unknown as string);
    expect(() => requireProductionSecretsConfigured()).toThrow(/APP_ENCRYPTION_KEY/);
  });

  it("throws in production when AUTH_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENCRYPTION_KEY", "test-encryption-key");
    vi.stubEnv("AUTH_SECRET", undefined as unknown as string);
    expect(() => requireProductionSecretsConfigured()).toThrow(/AUTH_SECRET/);
  });
});
