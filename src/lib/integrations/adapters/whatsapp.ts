/**
 * WhatsApp adapter — Meta Cloud API.
 * Performs a real templated text send when a permanent access token + Phone
 * Number ID are configured, otherwise degrades gracefully to a simulated send.
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

    const token = conn.credentials.apiKey as string;
    const phoneNumberId = conn.config.phoneNumberId as string;
    const to = (payload.to || "").replace(/[^0-9]/g, "");
    if (!to) return { ok: false, status: "failed", message: "Recipient phone number is required." };

    // Live send via Meta Graph API when a real token is present.
    if (token && !token.startsWith("test_") && !token.includes("your-")) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: { preview_url: false, body: payload.body },
            }),
          }
        );
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok || !(data as any).messages?.[0]?.id) {
          return {
            ok: false,
            status: "failed",
            message: `WhatsApp send failed: ${(data as any).error?.message ?? "unknown error"}`,
          };
        }
        return {
          ok: true,
          status: "sent",
          externalId: (data as any).messages[0].id,
          message: `WhatsApp message sent to ${to}.`,
        };
      } catch {
        return {
          ok: false,
          status: "failed",
          message: "WhatsApp send failed (network error).",
        };
      }
    }

    return {
      ok: true,
      status: "queued",
      message: `WhatsApp message queued to ${to} (simulated).`,
    };
  },
};
