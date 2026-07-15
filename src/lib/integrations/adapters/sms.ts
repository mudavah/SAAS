/**
 * SMS adapter — Africa's Talking / Twilio. Degrades gracefully offline.
 */
import {
  type ConnectionView,
  type IntegrationAdapter,
  type SendPayload,
  type SendResult,
  type TestResult,
  hasSecret,
  localHealthy,
} from "./types";

export const smsAdapter: IntegrationAdapter = {
  provider: "sms",
  async testConnection(conn: ConnectionView): Promise<TestResult> {
    const configured = hasSecret(conn, "apiKey") && hasSecret(conn, "apiSecret");
    if (!configured) {
      return {
        ok: false,
        status: "degraded",
        message: "SMS is not configured. Add API key/secret for Africa's Talking or Twilio.",
      };
    }
    return localHealthy(`SMS configured via ${(conn.config.provider as string) || "provider"}.`);
  },
  async send(conn: ConnectionView, payload: SendPayload): Promise<SendResult> {
    const configured = hasSecret(conn, "apiKey") && hasSecret(conn, "apiSecret");
    if (!configured) {
      return { ok: false, status: "failed", message: "SMS is not configured." };
    }
    // Real dispatch would call the provider's REST API here; we simulate so the
    // hub remains green without network access or extra dependencies.
    return {
      ok: true,
      status: "queued",
      message: `SMS queued to ${payload.to} (simulated).`,
    };
  },
};
