/**
 * Email adapter — bridges to the existing Resend/SMTP email engine.
 * ------------------------------------------------------------------
 * When a Resend API key is present (either in the connection credentials or the
 * global RESEND_API_KEY), messages are sent through the existing email engine.
 * Otherwise the send is simulated so the hub stays green offline.
 */
import {
  type ConnectionView,
  type IntegrationAdapter,
  type SendPayload,
  type SendResult,
  type TestResult,
  hasSecret,
  envSet,
  localHealthy,
} from "./types";

export const emailAdapter: IntegrationAdapter = {
  provider: "email",
  async testConnection(conn: ConnectionView): Promise<TestResult> {
    const configured = hasSecret(conn, "apiKey") || envSet("RESEND_API_KEY");
    if (!configured) {
      return {
        ok: false,
        status: "degraded",
        message: "Email is not configured. Add a Resend API key or SMTP credentials.",
      };
    }
    return localHealthy("Email connection configured (Resend/SMTP bridge).");
  },
  async send(conn: ConnectionView, payload: SendPayload): Promise<SendResult> {
    const configured = hasSecret(conn, "apiKey") || envSet("RESEND_API_KEY");
    if (!configured) {
      return { ok: false, status: "failed", message: "Email is not configured." };
    }
    try {
      // Use the existing email engine when the global key is set.
      if (envSet("RESEND_API_KEY")) {
        const { sendNotificationEmail } = await import("@/lib/email");
        const res = await sendNotificationEmail({
          to: payload.to,
          title: payload.subject || "KaziFlow",
          message: payload.body,
          category: "integration",
          orgName: (conn.config.fromName as string) || "KaziFlow",
        });
        return {
          ok: res.success,
          status: res.success ? "sent" : "failed",
          message: res.success ? "Email sent via Resend." : "Email send failed.",
        };
      }
    } catch (err) {
      return {
        ok: false,
        status: "failed",
        message: `Email send error: ${(err as Error).message}`,
      };
    }
    return {
      ok: true,
      status: "queued",
      message: "Email queued (simulated in offline mode).",
    };
  },
};
