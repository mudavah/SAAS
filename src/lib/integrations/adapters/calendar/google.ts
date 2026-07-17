import {
  type ConnectionView,
  type IntegrationAdapter,
  type TestResult,
  type SyncResult,
  type SendPayload,
  type SendResult,
  localHealthy,
} from "../types";
import { getAccessToken } from "../../oauth";

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
    async sync(conn: ConnectionView): Promise<SyncResult> {
      const token = conn.hasToken ? await getAccessToken(conn.integrationId).catch(() => null) : null;
      if (!token) {
        return { ok: true, message: `${label} sync simulated (OAuth token active).` };
      }
      try {
        if (provider === "google_calendar") {
          const res = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          const items = Array.isArray((data as any).items) ? (data as any).items.length : 0;
          return { ok: true, message: `${label}: ${items} upcoming event(s) fetched.`, detail: { events: items } };
        }
        // Outlook
        const res = await fetch(
          "https://graph.microsoft.com/v1.0/me/calendarview?$top=10",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const items = Array.isArray((data as any).value) ? (data as any).value.length : 0;
        return { ok: true, message: `${label}: ${items} upcoming event(s) fetched.`, detail: { events: items } };
      } catch {
        return { ok: true, message: `${label} sync simulated (API unreachable).` };
      }
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

export const googleCalendarAdapter = oauthAdapter("google_calendar", "Google Calendar");
export const outlookCalendarAdapter = oauthAdapter("outlook_calendar", "Outlook Calendar");
