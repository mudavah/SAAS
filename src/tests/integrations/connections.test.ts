import { describe, it, expect } from "vitest";
import {
  encryptIntegrationSecrets,
  decryptIntegrationSecrets,
  IntegrationError,
} from "@/lib/integrations/core";
import { connectIntegration } from "@/lib/integrations/connections";
import type { ServerContext } from "@/lib/session";

describe("Integration Hub connections", () => {
  it("encrypts and decrypts secrets round-trip for a provider", () => {
    const originalKey = process.env.APP_ENCRYPTION_KEY;
    process.env.APP_ENCRYPTION_KEY = "test-encryption-key-32-chars-long!!";
    try {
      const { config, credentials } = encryptIntegrationSecrets(
        "stripe",
        { callbackUrl: "https://x/cb" },
        { apiKey: "sk_test_secret", webhookSecret: "whsec_123" }
      );
      // Non-secret config is preserved in plaintext.
      expect(config.callbackUrl).toBe("https://x/cb");
      // Secrets are encrypted (enc:: prefix) and not equal to plaintext.
      expect(credentials.apiKey).not.toBe("sk_test_secret");
      expect(String(credentials.apiKey).startsWith("enc::")).toBe(true);

      const back = decryptIntegrationSecrets("stripe", config, credentials);
      expect(back.config.callbackUrl).toBe("https://x/cb");
      expect(back.credentials.apiKey).toBe("sk_test_secret");
      expect(back.credentials.webhookSecret).toBe("whsec_123");
    } finally {
      if (originalKey) {
        process.env.APP_ENCRYPTION_KEY = originalKey;
      } else {
        delete process.env.APP_ENCRYPTION_KEY;
      }
    }
  });

  it("rejects connecting an unknown provider without touching the database", async () => {
    const ctx = {
      userId: "u1",
      organizationId: "org1",
      roleType: "owner",
      permissions: new Set(["integrations.manage"]),
    } as unknown as ServerContext;
    await expect(
      connectIntegration(ctx, { provider: "nope", name: "X" })
    ).rejects.toBeInstanceOf(IntegrationError);
  });
});
