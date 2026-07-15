/**
 * WhatsApp adapter — Meta Cloud API. Degrades gracefully offline.
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

export const whatsappAdapter: IntegrationAdapter = {
  provider: "whatsapp",
  async testConnection(conn: ConnectionView): Promise<TestResult> {
    if (!hasSecret(conn, "apiKey") || !conn.config.phoneNumberId) {
      return {
        ok: false,
        status: "degraded",
        message: "WhatsApp is not configured. Add a permanent access token and Phone Number ID.",
      };
    }
    return localHealthy("WhatsApp Cloud API connection configured.");
  },
  async send(conn: ConnectionView, payload: SendPayload): Promise<SendResult> {
    if (!hasSecret(conn, "apiKey") || !conn.config.phoneNumberId) {
      return { ok: false, status: "failed", message: "WhatsApp is not configured." };
    }
    return {
      ok: true,
      status: "queued",
      message: `WhatsApp message queued to ${payload.to} (simulated).`,
    };
  },
};
