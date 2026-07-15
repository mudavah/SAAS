/**
 * KaziFlow — Integration Hub adapters
 * ------------------------------------------------------------------
 * A uniform adapter interface implemented per provider group. Every adapter
 * degrades gracefully: when the provider's keys/secrets or environment
 * variables are absent it returns a "not configured / simulated" result rather
 * than throwing, so the hub, health checks, and tests all run offline-green.
 */
import type { IntegrationHealthStatus } from "@/db/schema";

/** Decrypted, ready-to-use view of a connection passed to adapters. */
export interface ConnectionView {
  integrationId: string;
  provider: string;
  organizationId: string;
  category: string;
  enabled: boolean;
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  /** Whether an encrypted OAuth token exists for this connection. */
  hasToken?: boolean;
}

export interface TestResult {
  ok: boolean;
  status: IntegrationHealthStatus;
  message: string;
  latencyMs?: number;
  detail?: Record<string, unknown>;
}

export interface SendPayload {
  to: string;
  subject?: string;
  body: string;
  template?: string;
  meta?: Record<string, unknown>;
}

export interface SendResult {
  ok: boolean;
  message: string;
  externalId?: string;
  status: "sent" | "queued" | "failed";
}

export interface SyncResult {
  ok: boolean;
  message: string;
  detail?: Record<string, unknown>;
}

export interface WebhookInput {
  raw: string;
  headers: Record<string, unknown>;
  signature: string | null;
  verified: boolean;
}

export interface WebhookResult {
  ok: boolean;
  event?: string;
  message?: string;
}

export interface IntegrationAdapter {
  provider: string;
  testConnection(conn: ConnectionView): Promise<TestResult>;
  sync?(conn: ConnectionView, payload?: Record<string, unknown>): Promise<SyncResult>;
  send?(conn: ConnectionView, payload: SendPayload): Promise<SendResult>;
  handleWebhook?(
    conn: ConnectionView,
    input: WebhookInput
  ): Promise<WebhookResult>;
}

/** True when at least one credentials/config secret value is present. */
export function hasSecret(conn: ConnectionView, key: string): boolean {
  const v = conn.credentials[key] ?? conn.config[key];
  return typeof v === "string" && v.length > 0;
}

/** True when an environment variable is set and not a placeholder. */
export function envSet(name: string): boolean {
  const v = process.env[name];
  return !!v && v.length > 0 && !v.includes("your-") && !v.includes("...");
}

/** Measure latency of an async call. */
export async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}

/**
 * Generic "configured?" test. If a required secret is missing, report the
 * connection as degraded with a clear setup message (no throw). When secrets
 * are present, adapters should override to perform a real probe.
 */
export function configuredTest(
  conn: ConnectionView,
  requiredSecrets: string[],
  label: string
): TestResult {
  const missing = requiredSecrets.filter((k) => !hasSecret(conn, k));
  if (missing.length > 0) {
    return {
      ok: false,
      status: "degraded",
      message: `${label} is not fully configured. Missing: ${missing.join(", ")}.`,
      detail: { missing },
    };
  }
  return {
    ok: true,
    status: "healthy",
    message: `${label} connection configured.`,
    detail: { configured: true },
  };
}

/** A no-op healthy result for local/device integrations. */
export function localHealthy(message: string): TestResult {
  return { ok: true, status: "healthy", message };
}
