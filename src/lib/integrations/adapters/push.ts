/**
 * Push notification adapter — Web Push (VAPID) / FCM. Degrades gracefully.
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

export const pushAdapter: IntegrationAdapter = {
  provider: "push",
  async testConnection(conn: ConnectionView): Promise<TestResult> {
    if (!hasSecret(conn, "apiKey")) {
      return {
        ok: false,
        status: "degraded",
        message: "Push is not configured. Add a VAPID/FCM server key.",
      };
    }
    return localHealthy(`Push configured via ${(conn.config.provider as string) || "provider"}.`);
  },
  async send(conn: ConnectionView, payload: SendPayload): Promise<SendResult> {
    if (!hasSecret(conn, "apiKey")) {
      return { ok: false, status: "failed", message: "Push is not configured." };
    }
    return {
      ok: true,
      status: "queued",
      message: `Push notification queued to ${payload.to || "subscribers"} (simulated).`,
    };
  },
};
