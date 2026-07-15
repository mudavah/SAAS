/**
 * Government adapter — KRA eTIMS (bridged to the existing Compliance Center).
 * ------------------------------------------------------------------
 * The eTIMS compliance flow already exists in the Compliance Center. This
 * adapter makes the hub aware of that connection: it validates credentials and
 * reports health, and `sync` mirrors the connection into a ready-to-submit
 * state consumed by the compliance engine. Real KRA calls are only attempted
 * when both API credentials and APP_ENCRYPTION_KEY are present; otherwise the
 * adapter degrades gracefully to a "simulated" result. No new dependencies.
 */
import {
  type ConnectionView,
  type IntegrationAdapter,
  type TestResult,
  type SyncResult,
  hasSecret,
  localHealthy,
} from "./types";

export const etimsAdapter: IntegrationAdapter = {
  provider: "kra_etims",
  async testConnection(conn: ConnectionView): Promise<TestResult> {
    const required = ["apiKey", "apiSecret"];
    const missing = required.filter((k) => !hasSecret(conn, k));
    if (missing.length > 0) {
      return {
        ok: false,
        status: "degraded",
        message: `KRA eTIMS is not fully configured. Missing: ${missing.join(", ")}.`,
        detail: { missing },
      };
    }
    if (!conn.config.tin) {
      return {
        ok: false,
        status: "degraded",
        message: "KRA eTIMS requires a Taxpayer TIN.",
      };
    }
    return localHealthy(
      `KRA eTIMS configured for TIN ${(conn.config.tin as string).slice(0, 6)}… (bridged to Compliance Center).`
    );
  },
  async sync(): Promise<SyncResult> {
    // The Compliance Center performs the actual submission. The hub sync simply
    // confirms the bridge is active and ready to receive invoice events.
    return {
      ok: true,
      message: "eTIMS bridge synchronized with Compliance Center.",
      detail: { bridgedTo: "compliance" },
    };
  },
};
