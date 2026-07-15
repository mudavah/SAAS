import {
  type ConnectionView,
  type IntegrationAdapter,
  type TestResult,
  type SyncResult,
  type SendPayload,
  type SendResult,
  localHealthy,
} from "../types";

function oauthAdapter(provider: string, label: string): IntegrationAdapter {
  return {
    provider,
    async testConnection(conn: ConnectionView): Promise<TestResult> {
      if (!conn.hasToken) {
        return {
          ok: false,
          status: "degraded",
          message: `${label} authorization not completed. Connect via OAuth to activate.`,
        };
      }
      return localHealthy(`${label} authorized and ready.`);
    },
    async sync(): Promise<SyncResult> {
      return { ok: true, message: `${label} sync simulated (OAuth token active).` };
    },
    async send(_conn: ConnectionView, payload: SendPayload): Promise<SendResult> {
      return {
        ok: true,
        status: "queued",
        message: `${label} action queued for ${payload.to || "resource"} (simulated).`,
      };
    },
  };
}

export const outlookCalendarAdapter = oauthAdapter("outlook_calendar", "Outlook Calendar");
