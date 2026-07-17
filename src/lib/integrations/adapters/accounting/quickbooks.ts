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

function oauthAdapter(provider: string, label: string, companyUrl?: string): IntegrationAdapter {
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
      if (!companyUrl || !conn.hasToken) {
        return { ok: true, message: `${label} sync simulated (OAuth token active).` };
      }
      const token = await getAccessToken(conn.integrationId).catch(() => null);
      if (!token) return { ok: true, message: `${label} sync simulated (token unavailable).` };
      try {
        const res = await fetch(companyUrl, { headers: { Authorization: `Bearer ${token}` } });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const name =
          (data as any).CompanyInfo?.CompanyName ||
          (data as any).QueryResponse?.Company?.CompanyName ||
          label;
        return { ok: true, message: `${label} connected to ${name}.`, detail: { company: name } };
      } catch {
        return { ok: true, message: `${label} connection probe simulated (API unreachable).` };
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

export const quickbooksAdapter = oauthAdapter(
  "quickbooks",
  "QuickBooks Online",
  "https://quickbooks.api.intuit.com/v3/company/<realmId>/query?query=SELECT+*+FROM+CompanyInfo"
);
export const xeroAdapter = oauthAdapter("xero", "Xero");
