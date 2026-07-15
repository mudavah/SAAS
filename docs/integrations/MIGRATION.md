# KaziFlow Integration Hub — Migration Summary

## Migration File: `0017_integration_hub.sql`

This migration is the **incremental schema extension** for Epic 11 — Integration Hub. It is additive only: no existing table, column, or enum is modified destructively. Apply it on top of the latest existing migration.

---

## 1. New Enums Created

| Enum Name | Values | Purpose |
|---|---|---|
| `integration_category` | `government`, `payment`, `email`, `sms`, `whatsapp`, `push`, `calendar`, `accounting`, `storage`, `hardware` | Classify integrations by functional area |
| `integration_status` | `connected`, `disconnected`, `pending`, `error`, `expired` | Lifecycle state of a connection |
| `integration_auth_type` | `oauth2`, `api_key`, `basic`, `credentials`, `none`, `webhook` | Authentication model used by a provider |
| `integration_health_status` | `healthy`, `degraded`, `down`, `unknown` | Last observed health of a connection |
| `integration_event_status` | `pending`, `processing`, `success`, `failed`, `retrying`, `dead` | State machine for queued integration events |

---

## 2. Existing Enum Extended (Additive `ALTER TYPE ... ADD VALUE`)

The `timeline_event_type` enum gains the following values to cover integration lifecycle events:

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

---

## 3. New Tables Created

All new tables are org-scoped and indexed on `organizationId`, provider, category, status, and `createdAt` for query performance.

### 3.1 `integrations`

The central connection registry. One row per organization + provider (+ optional label).

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK, UUID) | |
| `organizationId` | text (FK) | CASCADE delete |
| `userId` | text (FK) | Connected-by user; SET NULL on delete |
| `category` | `integration_category` | |
| `provider` | text | Validated against code catalog |
| `name` | text | User-facing label |
| `authType` | `integration_auth_type` | Default `api_key` |
| `status` | `integration_status` | Default `pending` |
| `enabled` | boolean | Default `true` |
| `environment` | text | Default `production` |
| `config` | jsonb | Non-secret connection config |
| `credentials` | jsonb | Secret fields encrypted at rest (`enc::`) |
| `scopes` | jsonb[] | OAuth scopes |
| `healthStatus` | `integration_health_status` | Default `unknown` |
| `lastCheckedAt` | timestamp | |
| `lastSyncAt` | timestamp | |
| `errorMessage` | text | |
| `expiresAt` | timestamp | OAuth token expiry |
| `linkedConfigId` | text (FK) | Bridge to `payment_provider_configs`; SET NULL on delete |
| `metadata` | jsonb | |
| `createdAt` | timestamp | Default `now()` |
| `updatedAt` | timestamp | Default `now()` |

**Indexes**:
- `integrations_org_provider_name_idx` (unique) on `(organizationId, provider, name)`
- `integrations_org_idx` on `organizationId`
- `integrations_org_category_idx` on `(organizationId, category)`
- `integrations_org_status_idx` on `(organizationId, status)`
- `integrations_org_health_idx` on `(organizationId, healthStatus)`

### 3.2 `integration_oauth_tokens`

Encrypted OAuth token lifecycle.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK, UUID) | |
| `integrationId` | text (FK) | CASCADE delete |
| `organizationId` | text (FK) | CASCADE delete |
| `accessToken` | text | Encrypted |
| `refreshToken` | text | Encrypted |
| `tokenType` | text | Default `Bearer` |
| `scope` | text | |
| `expiresAt` | timestamp | |
| `createdAt` | timestamp | Default `now()` |
| `updatedAt` | timestamp | Default `now()` |

**Indexes**: `integration_oauth_tokens_integration_idx` on `integrationId`, `integration_oauth_tokens_org_idx` on `organizationId`

### 3.3 `integration_activity_logs`

Immutable per-operation activity log.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK, UUID) | |
| `integrationId` | text (FK) | CASCADE delete |
| `organizationId` | text (FK) | CASCADE delete |
| `userId` | text (FK) | Actor; SET NULL on delete |
| `provider` | text | |
| `action` | text | |
| `status` | text | |
| `message` | text | |
| `detail` | jsonb | |
| `latencyMs` | integer | |
| `createdAt` | timestamp | Default `now()` |

**Indexes**: `integration_activity_logs_integration_idx`, `integration_activity_logs_org_idx`, `integration_activity_logs_org_created_idx` on `(organizationId, createdAt)`

### 3.4 `integration_events`

Outbound/inbound event queue with retry/backoff.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK, UUID) | |
| `integrationId` | text (FK) | CASCADE delete |
| `organizationId` | text (FK) | CASCADE delete |
| `direction` | text | Default `outbound` |
| `type` | text | Event type |
| `status` | `integration_event_status` | Default `pending` |
| `payload` | jsonb | |
| `response` | jsonb | |
| `error` | text | |
| `attempts` | integer | Default `0` |
| `maxAttempts` | integer | Default `5` |
| `nextRetryAt` | timestamp | |
| `processedAt` | timestamp | |
| `createdAt` | timestamp | Default `now()` |

**Indexes**: `integration_events_integration_idx`, `integration_events_org_idx`, `integration_events_status_idx` on `(status, nextRetryAt)`

### 3.5 `integration_webhook_logs`

Inbound webhook records.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK, UUID) | |
| `integrationId` | text (FK) | CASCADE delete |
| `organizationId` | text (FK) | CASCADE delete |
| `provider` | text | |
| `event` | text | |
| `verified` | boolean | Default `false` |
| `payload` | jsonb | |
| `headers` | jsonb | |
| `status` | text | Default `received` |
| `error` | text | |
| `createdAt` | timestamp | Default `now()` |

**Indexes**: `integration_webhook_logs_integration_idx`, `integration_webhook_logs_org_idx`, `integration_webhook_logs_org_created_idx` on `(organizationId, createdAt)`

### 3.6 `integration_health_checks`

Periodic health snapshots.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK, UUID) | |
| `integrationId` | text (FK) | CASCADE delete |
| `organizationId` | text (FK) | CASCADE delete |
| `status` | `integration_health_status` | Default `unknown` |
| `latencyMs` | integer | |
| `detail` | jsonb | |
| `checkedAt` | timestamp | Default `now()` |

**Indexes**: `integration_health_checks_integration_idx`, `integration_health_checks_org_idx`, `integration_health_checks_checked_idx` on `checkedAt`

---

## 4. `src/db/schema.ts` Additive Changes

- Added the 5 new `pgEnum` definitions.
- Appended 13 new values to the `timelineEventTypeEnum` array.
- Added 6 `pgTable` definitions with indexes and `$inferSelect` types.
- Added `relations(...)` for each new table linking to `organizations`, `users`, and `integrations`.

---

## 5. `src/lib/rbac/permissions.ts` Additive Changes

Added new permission keys under the existing `integrations` category:

- `integrations.view`
- `integrations.manage`
- `integrations.sync`
- `integrations.logs.view`

Legacy keys (`integrations.configure`, `integrations.etims`, `integrations.mpesa`, `integrations.stripe`) are preserved. The new keys were added to the relevant role permission arrays (`OWNER_PERMS`, `ADMIN_PERMS`, `MANAGER_PERMS`, `ACCOUNTANT_PERMS`, `VIEWER_PERMS`, `EMPLOYEE_PERMS`).

---

## 6. Rollback Instructions

To roll back this migration, drop the tables and enums in the following order:

```sql
-- Drop tables (respecting foreign keys)
DROP TABLE IF EXISTS integration_health_checks CASCADE;
DROP TABLE IF EXISTS integration_webhook_logs CASCADE;
DROP TABLE IF EXISTS integration_events CASCADE;
DROP TABLE IF EXISTS integration_activity_logs CASCADE;
DROP TABLE IF EXISTS integration_oauth_tokens CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;

-- Drop enums
DROP TYPE IF EXISTS integration_event_status CASCADE;
DROP TYPE IF EXISTS integration_health_status CASCADE;
DROP TYPE IF EXISTS integration_auth_type CASCADE;
DROP TYPE IF EXISTS integration_status CASCADE;
DROP TYPE IF EXISTS integration_category CASCADE;
```

> **Warning**: Dropping `integrations` with `CASCADE` will also delete all related OAuth tokens, activity logs, events, webhook logs, and health check records. Ensure you have backups before running rollback in production.

To roll back only the `timeline_event_type` additions, you cannot drop individual enum values in PostgreSQL. Instead, you would need to recreate the enum without the integration values and update dependent columns, which is a manual process.
