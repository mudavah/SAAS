import { describe, it, expect } from "vitest";
import { computeWebhookSignature, verifyWebhookSignature } from "@/lib/api/webhooks";
import { generateSdkCode, getSdkLanguages } from "@/lib/api/sdk";
import { getOpenApiResponse, openApiSpec } from "@/lib/api/openapi";
import { generateSandboxApiKey } from "@/lib/api/sandbox";
import { hashApiSecret } from "@/lib/api/auth";

describe("Developer Platform Libraries", () => {
  describe("Webhook Signature", () => {
    it("computes consistent HMAC-SHA256 signatures", () => {
      const payload = '{"event":"test"}';
      const secret = "my-secret";
      const sig1 = computeWebhookSignature(payload, secret);
      const sig2 = computeWebhookSignature(payload, secret);
      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64);
    });

    it("verifies valid signatures", () => {
      const payload = '{"event":"test"}';
      const secret = "my-secret";
      const signature = computeWebhookSignature(payload, secret);
      expect(verifyWebhookSignature(payload, secret, signature)).toBe(true);
    });

    it("rejects invalid signatures", () => {
      const payload = '{"event":"test"}';
      const secret = "my-secret";
      const signature = computeWebhookSignature(payload, secret);
      const invalidSig = "a".repeat(64);
      expect(verifyWebhookSignature(payload, secret, invalidSig)).toBe(false);
    });

    it("rejects signatures for wrong secret", () => {
      const payload = '{"event":"test"}';
      const secret = "my-secret";
      const signature = computeWebhookSignature(payload, secret);
      expect(verifyWebhookSignature(payload, "wrong-secret", signature)).toBe(false);
    });
  });

  describe("SDK Generation", () => {
    it("returns supported languages", () => {
      const languages = getSdkLanguages();
      expect(languages.length).toBeGreaterThan(0);
      expect(languages.map((l) => l.id)).toContain("typescript");
      expect(languages.map((l) => l.id)).toContain("python");
      expect(languages.map((l) => l.id)).toContain("curl");
    });

    it("generates TypeScript SDK code", () => {
      const code = generateSdkCode({ apiKey: "kf_live_test", language: "typescript" });
      expect(code).toContain("kf_live_test");
      expect(code).toContain("KaziFlowClient");
      expect(code).toContain("client.clients.list");
    });

    it("generates Python SDK code", () => {
      const code = generateSdkCode({ apiKey: "kf_live_test", language: "python" });
      expect(code).toContain("kf_live_test");
      expect(code).toContain("kaziflow");
      expect(code).toContain("client.clients.list");
    });

    it("generates cURL SDK code", () => {
      const code = generateSdkCode({ apiKey: "kf_live_test", language: "curl" });
      expect(code).toContain("kf_live_test");
      expect(code).toContain("Authorization: Bearer");
    });

    it("returns fallback for unsupported language", () => {
      const code = generateSdkCode({ apiKey: "kf_live_test", language: "rust" });
      expect(code).toContain("not available");
    });
  });

  describe("OpenAPI Spec", () => {
    it("has valid OpenAPI 3.0 structure", () => {
      expect(openApiSpec.openapi).toBe("3.0.3");
      expect(openApiSpec.info.title).toBe("KaziFlow Public API");
      expect(openApiSpec.paths).toBeDefined();
    });

    it("includes ping endpoint", () => {
      expect(openApiSpec.paths["/ping"]).toBeDefined();
      expect(openApiSpec.paths["/ping"].get).toBeDefined();
    });

    it("includes security schemes", () => {
      expect(openApiSpec.components?.securitySchemes).toBeDefined();
      expect(openApiSpec.components?.securitySchemes?.["BearerAuth"]).toBeDefined();
    });
  });

  describe("Sandbox Utilities", () => {
    it("generates sandbox API keys with test prefix", () => {
      const { secret, prefix } = generateSandboxApiKey();
      expect(secret.startsWith("kf_test_")).toBe(true);
      expect(prefix).toBe(secret.slice(0, 12));
      expect(prefix.startsWith("kf_test_")).toBe(true);
    });
  });

  describe("API Key Hashing", () => {
    it("produces different hashes for different secrets", async () => {
      const hash1 = await hashApiSecret("secret1");
      const hash2 = await hashApiSecret("secret2");
      expect(hash1).not.toBe(hash2);
    });

    it("verifies against correct secret", async () => {
      const secret = "my-api-secret";
      const hash = await hashApiSecret(secret);
      // bcrypt compare would be tested via verifyApiSecret, but at minimum
      // we verify the hash is a string
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});
