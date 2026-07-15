# Epic 11 — Integration Hub: Implementation Plan

> Status: **Awaiting approval.** No code will be written until this plan is approved.
> Scope: Build **only** the Integration Hub. Preserve every existing module
> (multi-tenancy, RBAC, CRM, Procurement, POS, HR, Payroll, Compliance Center,
> AI & Automation, Enterprise Analytics, Enterprise Management, Developer
> Platform, Business Timeline) and all existing functionality.

---

## 1. Goal & Design Principles

A centralized **Integration Hub** that lets each organization connect KaziFlow
to external platforms, monitor their health, browse a marketplace, and audit all
integration activity — reusing existing infrastructure (RBAC, audit, timeline,
crypto, AI insights, email/payment engines) rather than duplicating it.

Principles derived from the existing codebase:

- **Multi-tenant**: every table carries `organizationId`; every query is scoped.
- **RBAC-gated**: mutations require an `integrations.*` permission via
  `requireApiContext` / `requirePermission` (same pattern as Enterprise/HR).
- **Audited**: every action calls `logAuditSafe` (category `integrations`, which
  already exists in `auditCategoryEnum` — no enum change needed).
- **Timeline**: relevant events call `emitTimelineEvent` (best-effort).
- **Secrets encrypted at rest** via existing `encryptSecret`/`decryptSecret`
  (`enc::`) and `encryptField`/`decryptField` (`enc2::`) in `src/lib/crypto.ts`.
- **Incremental migration only** (`0017_integration_hub.sql`), additive — no
  existing table/column/enum is modified destructively.
- **No new npm dependencies**: use native `fetch` for OAuth/REST, and reuse the
  already-installed `resend` and `stripe`. Adapters **degrade gracefully** when a
  provider key/SDK isn't configured (return a "not configured"/simulated result),
  matching existing fallbacks (AI "rules" model, crypto plaintext fallback). This
  keeps the build green and tests runnable offline.
- **Non-breaking bridges**: payments (M-Pesa/Pesapal/Flutterwave/Stripe) and
  government (KRA/eTIMS) already have engines & configs. The hub becomes the
  registry/monitoring/UX layer and **bridges** to the existing
  `payment_provider_configs`, payment engine, and eTIMS/compliance flows so POS,
  invoicing, and compliance continue to work unchanged.

---

## 2. Providers & Categories (17 integrations)

Defined in a **code catalog** (`src/lib/integrations/catalog.ts`), so the
marketplace is extensible without migrations. `provider` is stored as `text`
(validated against the catalog); `category` is an enum.

| Category (enum `integration_category`) | Providers (catalog `provider` ids) | Auth |
|---|---|---|
| `government` | `kra_etims` | credentials/api_key (bridge eTIMS) |
| `payment` | `mpesa`, `pesapal`, `flutterwave`, `stripe` | api_key/credentials (bridge payment engine) |
| `email` | `email` (Resend/SMTP) | api_key |
| `sms` | `sms` (Africa's Talking / Twilio) | api_key |
| `whatsapp` | `whatsapp` (WhatsApp Cloud API) | api_key/oauth2 |
| `push` | `push` (Web Push / FCM) | api_key |
| `calendar` | `google_calendar`, `outlook_calendar` | oauth2 |
| `accounting` | `quickbooks`, `xero` | oauth2 |
| `storage` | `google_drive`, `onedrive`, `dropbox` | oauth2 |
| `hardware` | `barcode_scanner`, `thermal_printer` | none/local device |

Catalog entry shape: `{ id, category, name, description, authType, scopes[],
capabilities[], configFields[], secretFields[], docsUrl, website }`.

---

## 3. Database — Migration `0017_integration_hub.sql` (additive)

### New enums
- `integration_category` — government, payment, email, sms, whatsapp, push, calendar, accounting, storage, hardware
- `integration_status` — connected, disconnected, pending, error, expired
- `integration_auth_type` — oauth2, api_key, basic, credentials, none, webhook
- `integration_health_status` — healthy, degraded, down, unknown
- `integration_event_status` — pending, processing, success, failed, retrying, dead

### Extend existing enum (additive `ALTER TYPE ... ADD VALUE`)
`timeline_event_type` gains:
`integration.connected`, `integration.disconnected`, `integration.updated`,
`integration.sync.started`, `integration.sync.completed`, `integration.sync.failed`,
`integration.message.sent`, `integration.message.failed`,
`integration.webhook.received`, `integration.health.degraded`,
`integration.token.refreshed`, `integration.marketplace.installed`,
`integration.error`.

(The `integrations` value already exists in `permission_category` and
`audit_category` enums — reused, not modified.)

### New tables (all org-scoped, indexed on org/provider/category/status/createdAt)
1. **`integrations`** — one connection per org+provider(+optional label). Columns:
   `id, organizationId, userId (connectedBy), category, provider, name, authType,
   status, enabled, environment, config (jsonb, non-secret), credentials (jsonb,
   secret fields encrypted), scopes (jsonb), healthStatus, lastCheckedAt,
   lastSyncAt, errorMessage, expiresAt, linkedConfigId (bridge → payment_provider_configs),
   metadata, createdAt, updatedAt`. Unique index `(organizationId, provider, name)`.
2. **`integration_oauth_tokens`** — encrypted OAuth token lifecycle:
   `id, integrationId, organizationId, accessToken(enc), refreshToken(enc),
   tokenType, scope, expiresAt, createdAt, updatedAt`.
3. **`integration_activity_logs`** — immutable per-op log:
   `id, integrationId, organizationId, userId, provider, action, status, message,
   detail (jsonb), latencyMs, createdAt`.
4. **`integration_events`** — outbound/inbound queue with retry:
   `id, integrationId, organizationId, direction, type, status, payload (jsonb),
   response (jsonb), error, attempts, maxAttempts, nextRetryAt, processedAt, createdAt`.
5. **`integration_webhook_logs`** — inbound webhook record:
   `id, integrationId, organizationId, provider, event, verified, payload (jsonb),
   headers (jsonb), status, error, createdAt`.
6. **`integration_health_checks`** — periodic health snapshots:
   `id, integrationId, organizationId, status, latencyMs, detail (jsonb), checkedAt`.

Rollback section (DROP TABLE/TYPE) documented in `docs/integrations/MIGRATION.md`.

### `src/db/schema.ts` updates (additive)
- Add the 5 new enums + append the new `timeline_event_type` values to the
  `timelineEventTypeEnum` array.
- Add the 6 `pgTable` definitions with indexes.
- Add `relations(...)` for each (to `organizations`, `users`, `integrations`).
- Add `$inferSelect` type exports + enum TS unions (mirroring existing style).

---

## 4. RBAC (`src/lib/rbac/permissions.ts`)

Add new permission keys (category `integrations`, which already exists), keeping
the legacy `integrations.configure/etims/mpesa/stripe` keys:
- `integrations.view` — view hub, connections, marketplace, health
- `integrations.manage` — connect/disconnect/configure connections
- `integrations.sync` — trigger syncs & dispatch messages/tests
- `integrations.logs.view` — view integration activity logs

Role mapping:
- **owner/administrator**: all integration perms.
- **manager**: view, manage, sync, logs.view (already gets legacy INTEGRATION_PERMS).
- **accountant**: view, sync, logs.view (payments/accounting focus).
- **viewer/employee**: `integrations.view` only.

Seeded into the DB `permissions` table by the existing catalog-seed mechanism —
no manual SQL inserts in the migration.

---

## 5. Service Layer (`src/lib/integrations/`)

- **`catalog.ts`** — static provider registry (source of truth for marketplace).
- **`core.ts`** — `IntegrationError` (with HTTP status), `requirePermission`,
  secret encrypt/decrypt helpers scoped to config/credentials.
- **`connections.ts`** — `listIntegrations`, `getIntegration`, `connectIntegration`
  (create/upsert + encrypt secrets), `updateIntegration`, `disconnectIntegration`,
  `setEnabled`. Audits + timeline. Bridges payment/government providers.
- **`oauth.ts`** — generic OAuth2: `buildAuthUrl` (signed `state`),
  `exchangeCode`, `refreshTokens`, encrypted token persistence; per-provider
  endpoints from catalog/config.
- **`health.ts`** — `runHealthCheck(integration)` (calls adapter `testConnection`),
  persist snapshot, `getHealthDashboard(org)` aggregate.
- **`activity.ts`** — `logActivity`, `listActivity`; event queue
  `enqueueEvent`/`processEvent`/`retryEvent`.
- **`dispatch.ts`** — unified `sendEmail/sendSms/sendWhatsApp/sendPush` routing to
  the active provider adapter; enqueues `integration_events`; records activity.
- **`marketplace.ts`** — `listMarketplace(org)` = catalog + installed status,
  category/search filters.
- **`ai.ts`** — AI Business Copilot tie-in: analyze health/usage, write
  recommendations to existing `aiInsights` table (reuse infra).
- **`adapters/`** — common interface
  `{ id, testConnection, connect?, disconnect?, sync?, send?, handleWebhook? }`:
  - `government/etims.ts` (bridge existing eTIMS/compliance)
  - `payments/{mpesa,pesapal,flutterwave,stripe}.ts` (bridge payment engine + `payment_provider_configs`)
  - `email.ts` (bridge `lib/email` Resend/SMTP)
  - `sms.ts`, `whatsapp.ts`, `push.ts` (fetch-based; graceful fallback)
  - `calendar/{google,outlook}.ts`, `accounting/{quickbooks,xero}.ts`,
    `storage/{googledrive,onedrive,dropbox}.ts` (OAuth2 via `oauth.ts`)
  - `hardware/{barcode,printer}.ts` (config + ESC/POS receipt template helpers; device bridge is client-side)
  - `index.ts` — `getAdapter(provider)` resolver.
- **`index.ts`** — public re-exports (mirrors `lib/enterprise/index.ts`).

---

## 6. API Routes (`src/app/api/integrations/`)

All session/API-key authed via `requireApiContext` + permission, audited, timeline.
- `route.ts` — `GET` list connections (+ health summary).
- `connect/route.ts` — `POST` connect by provider (`integrations.manage`).
- `[id]/route.ts` — `GET`/`PATCH`/`DELETE` (get/update/disconnect).
- `[id]/health/route.ts` — `GET`/`POST` (read/run health check).
- `[id]/sync/route.ts` — `POST` trigger sync/test (`integrations.sync`).
- `[id]/logs/route.ts` — `GET` activity logs (`integrations.logs.view`).
- `health/route.ts` — `GET` aggregate health dashboard.
- `activity/route.ts` — `GET` org-wide activity.
- `marketplace/route.ts` — `GET` catalog + installed status.
- `send/route.ts` — `POST` dispatch message via hub (`integrations.sync`).
- `ai/route.ts` — `POST` AI copilot integration insights (`integrations.view` + `ai.access`).
- `oauth/[provider]/route.ts` — `GET` start OAuth (redirect).
- `oauth/[provider]/callback/route.ts` — `GET` exchange code + store tokens (state-verified, no session).
- `webhooks/[provider]/route.ts` — `POST` inbound webhooks (public, per-provider signature verified, logged).

---

## 7. UI (`src/app/dashboard/integrations/`)

Server pages use `getPageContext({ requiredPermission })`; client widgets in
`src/components/dashboard/integrations/`. Reuse existing UI primitives and the
`DashboardShell`.
- `page.tsx` — Hub home: category grid, connected count, health summary, quick links.
- `marketplace/page.tsx` — Integration Marketplace: browse/search/connect.
- `health/page.tsx` — Integration Health Dashboard: status, latency, last sync, uptime, run-check.
- `activity/page.tsx` — activity/audit log viewer with filters.
- `[id]/page.tsx` — connection detail: config form, OAuth connect button, test, disconnect.
- Add sidebar nav entries (Integrations, Marketplace, Integration Health) in
  `src/components/dashboard/sidebar.tsx`.

---

## 8. Tests (`src/tests/integrations/`, vitest — existing style)

- `catalog.test.ts` — catalog integrity (unique ids, every category covered, required fields).
- `connections.test.ts` — connect/disconnect/update logic (mock `@/db`), secret encryption.
- `health.test.ts` — health status aggregation + snapshot logic.
- `dispatch.test.ts` — routing selects correct adapter; graceful "not configured" fallback.
- `oauth.test.ts` — `buildAuthUrl` params + signed `state` round-trip.
- `rbac.test.ts` — new `integrations.*` keys present & mapped to roles.
Run with `npm test`.

---

## 9. Documentation (`docs/integrations/`)

Matching the existing per-epic doc set:
1. **`ARCHITECTURE.md`** — Architecture Summary.
2. **`MIGRATION.md`** — Migration Summary (tables, enums, rollback).
3. **`INTEGRATION_REPORT.md`** — Integration Report (providers, capabilities, auth, bridges, env vars).
4. **`TESTING_REPORT.md`** — Testing Report (coverage, how to run, results).

---

## 10. File Change Summary

**New (~55 files):** migration `0017`; `src/lib/integrations/*` (+ `adapters/*`);
`src/app/api/integrations/*`; `src/app/dashboard/integrations/*`;
`src/components/dashboard/integrations/*`; `src/tests/integrations/*`;
`docs/integrations/*`.

**Edited (4 files, additive only):** `src/db/schema.ts` (enums, tables, relations,
types, timeline values), `src/lib/rbac/permissions.ts` (perms + role maps),
`src/components/dashboard/sidebar.tsx` (nav), `.env.example` (new optional keys).

**Untouched:** all existing modules and their tables/logic. Payment & eTIMS
engines are only *read/bridged*, never rewritten.

---

## 11. Deliverables produced after implementation
1. Architecture Summary  2. Migration Summary  3. Integration Report  4. Testing Report
(as the four docs above), plus a working, tested, build-green Integration Hub.

---

### Open questions (safe defaults chosen unless you object)
1. **No new npm deps** (native `fetch` + existing `resend`/`stripe`); OAuth/REST
   adapters simulate gracefully when keys are absent. OK?
2. **Payments/eTIMS are bridged** (hub = registry/monitoring overlay) rather than
   re-implemented, to guarantee zero regression. OK?
3. Provider stored as **text validated against a code catalog** (extensible
   marketplace) instead of a rigid enum. OK?
