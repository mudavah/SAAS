# KaziFlow Integration Hub — Architecture Summary

## 1. Multi-Tenant Design

Every Integration Hub table is scoped to `organizationId`. New tables introduced by the hub (`integrations`, `integration_oauth_tokens`, `integration_activity_logs`, `integration_events`, `integration_webhook_logs`, `integration_health_checks`) all carry `organizationId` as a required foreign key to `organizations.id` with `CASCADE` delete. Queries in the service layer (`src/lib/integrations/`) always filter by `organizationId` from the authenticated server context.

Existing business tables also carry `organizationId` columns (added incrementally), and the hub never bypasses tenant isolation.

## 2. RBAC Model

The Integration Hub uses the existing RBAC framework (`src/lib/rbac/`). Permissions are defined in `permissions.ts` under the `integrations` category.

| Permission Key | Name | Description |
|---|---|---|
| `integrations.view` | View Integration Hub | View the Integration Hub, connections, marketplace and health |
| `integrations.manage` | Manage Integrations | Connect, disconnect and configure integrations |
| `integrations.sync` | Sync & Dispatch Integrations | Trigger syncs and dispatch messages/tests via integrations |
| `integrations.logs.view` | View Integration Logs | View integration activity and event logs |

Legacy permissions (`integrations.configure`, `integrations.etims`, `integrations.mpesa`, `integrations.stripe`) are preserved for backward compatibility and mapped to the same roles.

Role mappings:
- **owner / administrator**: all `integrations.*` permissions
- **manager**: `view`, `manage`, `sync`, `logs.view`
- **accountant**: `view`, `sync`, `logs.view`
- **viewer / employee**: `view` only

Route handlers enforce permissions via `requirePermission(ctx, key)` from `src/lib/integrations/core.ts`.

## 3. Service Layer Structure

The hub is organized under `src/lib/integrations/`:

| Module | Purpose |
|---|---|
| `catalog.ts` | Static in-code registry of all 17 providers. Source of truth for the marketplace. Extensible without migrations because `provider` is stored as `text` validated against this catalog. |
| `core.ts` | `IntegrationError` class (HTTP-aware), `requirePermission` guard, secret encrypt/decrypt helpers scoped to integration config/credentials. |
| `connections.ts` | CRUD for connections: `listIntegrations`, `getIntegration`, `connectIntegration` (create/upsert + encrypt secrets), `updateIntegration`, `disconnectIntegration`, `setEnabled`. Emits audit + timeline events. Bridges payment/government providers to existing engines. |
| `oauth.ts` | Generic OAuth2 flow: `buildAuthUrl` (signed `state`), `exchangeCode`, `refreshTokens`, encrypted token persistence in `integration_oauth_tokens`. |
| `health.ts` | `runHealthCheck` invokes the adapter's `testConnection`, persists snapshots to `integration_health_checks`, and aggregates dashboard data. |
| `activity.ts` | Immutable per-operation logging via `integration_activity_logs`, plus the event queue (`integration_events`) with `enqueueEvent` / `processEvent` / `retryEvent`. |
| `dispatch.ts` | Unified routing for `sendEmail`, `sendSms`, `sendWhatsApp`, `sendPush` to the active provider adapter. Enqueues events and records activity. |
| `marketplace.ts` | `listMarketplace` returns catalog entries plus installed status per organization, with category/search filters. |
| `ai.ts` | AI Business Copilot tie-in: analyzes health/usage and writes recommendations to the existing `aiInsights` table. |
| `adapters/` | Provider-specific implementations (see below). |

## 4. Adapter Pattern with Graceful Degradation

Every provider implements the `IntegrationAdapter` interface defined in `src/lib/integrations/adapters/types.ts`:

```ts
interface IntegrationAdapter {
  provider: string;
  testConnection(conn: ConnectionView): Promise<TestResult>;
  sync?(conn, payload?): Promise<SyncResult>;
  send?(conn, payload): Promise<SendResult>;
  handleWebhook?(conn, input): Promise<WebhookResult>;
}
```

Adapters degrade gracefully: when a provider's secrets or required environment variables are absent, they return a `"degraded"` or `"failed"` result instead of throwing. This keeps the hub, health checks, and tests runnable offline-green.

Helper utilities in `types.ts`:
- `configuredTest()` — generic "is configured?" check that returns `degraded` when required secrets are missing.
- `localHealthy()` — no-op healthy result for local/device integrations (barcode scanner, thermal printer).
- `hasSecret()` / `envSet()` — safe presence checks that avoid throwing on missing config.

The adapter registry (`src/lib/integrations/adapters/index.ts`) exposes `ADAPTERS` grouped by category and `ADAPTERS_MAP` for flat lookup via `getAdapter(provider)`.

## 5. Bridge Approach

Payments and government integrations are **bridged**, not reimplemented:

- **Payments** (`mpesa`, `pesapal`, `flutterwave`, `stripe`) — The hub stores connection metadata and secrets. `connections.ts` mirrors configured credentials into the existing `payment_provider_configs` table so POS, invoicing, and the payment engine continue to work unchanged. Adapters probe the provider directly when keys are present and otherwise return simulated results.
- **Government** (`kra_etims`) — The eTIMS compliance flow already exists in the Compliance Center. The hub adapter validates credentials, reports health, and `sync` confirms the bridge is active. Real KRA calls are only attempted when both API credentials and `APP_ENCRYPTION_KEY` are present.
- **Email** (`email`) — Bridges to the existing Resend/SMTP engine in `src/lib/email.ts` when `RESEND_API_KEY` is set; otherwise simulates.

This guarantees zero regression in existing payment, compliance, and email flows.

## 6. Secret Encryption

Integration secrets (API keys, tokens, passwords) are encrypted at rest using the existing AES-256-GCM helper in `src/lib/crypto.ts`.

- Encrypted values are prefixed with `enc::`.
- `core.ts` exposes `encryptIntegrationSecrets` and `decryptIntegrationSecrets`, which walk the catalog's `secretFields` list and encrypt/decrypt only fields typed as `password`.
- Fields that are already handled by the legacy `encryptField` / `decryptField` system (`SECRET_FIELDS` list in `crypto.ts`) are routed to the correct helper.
- When `APP_ENCRYPTION_KEY` is unset, plaintext passes through unchanged (legacy fallback), matching the existing crypto behavior.
- OAuth tokens in `integration_oauth_tokens` (`access_token`, `refresh_token`) are also encrypted via `encryptSecret`.

## 7. Timeline and Audit Integration

Every hub action emits both an audit log and a Business Timeline event:

- **Audit**: Calls `logAuditSafe` with category `integrations` (already present in `auditCategoryEnum` — no migration needed).
- **Timeline**: Calls `emitTimelineEvent` with integration-specific event types appended to the `timeline_event_type` enum:

  - `integration.connected`
  - `integration.disconnected`
  - `integration.updated`
  - `integration.sync.started`
  - `integration.sync.completed`
  - `integration.sync.failed`
  - `integration.message.sent`
  - `integration.message.failed`
  - `integration.webhook.received`
  - `integration.health.degraded`
  - `integration.token.refreshed`
  - `integration.marketplace.installed`
  - `integration.error`

Timeline events reference `resourceType: "integration"` and `resourceId: <integration.id>`, so the Business Timeline page surfaces integration lifecycle events alongside invoices, payments, and HR events.
