/**
 * Production environment hardening — unit tests
 * ------------------------------------------------------------------
 * Verifies the fail-closed boot gate: in production the server must refuse to
 * start when a required secret (e.g. APP_ENCRYPTION_KEY / AUTH_SECRET) is
 * missing, because that would otherwise persist credentials in plaintext.
 * In non-production the same missing key must NOT throw (dev/test boot).
 */
import { describe, it, expect, afterEach } from "vitest";
import { requireProductionSecretsConfigured } from "@/lib/config/env";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL.NODE_ENV;
  if (ORIGINAL.APP_ENCRYPTION_KEY === undefined) delete process.env.APP_ENCRYPTION_KEY;
  else process.env.APP_ENCRYPTION_KEY = ORIGINAL.APP_ENCRYPTION_KEY;
  if (ORIGINAL.AUTH_SECRET === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = ORIGINAL.AUTH_SECRET;
});

describe("requireProductionSecretsConfigured", () => {
  it("does not throw in non-production when secrets are missing", () => {
    process.env.NODE_ENV = "development";
    delete process.env.APP_ENCRYPTION_KEY;
    delete process.env.AUTH_SECRET;
    expect(() => requireProductionSecretsConfigured()).not.toThrow();
  });

  it("does not throw in production when all required secrets are present", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_ENCRYPTION_KEY = "test-encryption-key";
    process.env.AUTH_SECRET = "test-auth-secret";
    expect(() => requireProductionSecretsConfigured()).not.toThrow();
  });

  it("throws in production when APP_ENCRYPTION_KEY is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_SECRET = "test-auth-secret";
    delete process.env.APP_ENCRYPTION_KEY;
    expect(() => requireProductionSecretsConfigured()).toThrow(/APP_ENCRYPTION_KEY/);
  });

  it("throws in production when AUTH_SECRET is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_ENCRYPTION_KEY = "test-encryption-key";
    delete process.env.AUTH_SECRET;
    expect(() => requireProductionSecretsConfigured()).toThrow(/AUTH_SECRET/);
  });
});
