# KaziFlow Integration Hub — Testing Report

## 1. How to Run Tests

```bash
npm test
```

The project uses **Vitest** (`vitest run`) as configured in `package.json`. Tests run in Node with mocked database and network layers.

---

## 2. Test Directory

Integration Hub tests are located under `src/tests/integrations/`. The planned test suite mirrors the existing per-epic test layout (`src/tests/enterprise/`, `src/tests/hr/`, etc.).

| Test File | Focus Area |
|---|---|
| `src/tests/integrations/catalog.test.ts` | Catalog integrity (unique IDs, category coverage, required fields, `isKnownProvider` logic) |
| `src/tests/integrations/connections.test.ts` | Connect / disconnect / update logic, secret encryption round-trip, bridge behavior |
| `src/tests/integrations/health.test.ts` | Health status aggregation, snapshot persistence, dashboard queries |
| `src/tests/integrations/dispatch.test.ts` | Routing selects correct adapter, graceful "not configured" fallback |
| `src/tests/integrations/oauth.test.ts` | `buildAuthUrl` parameter construction, signed `state` round-trip, token encryption |
| `src/tests/integrations/rbac.test.ts` | New `integrations.*` keys present, mapped to roles, enforced at route level |

---

## 3. Coverage Areas

### 3.1 Catalog (`catalog.test.ts`)
- Every catalog entry has a unique `id`, valid `category`, `authType`, and non-empty `capabilities` array.
- `isKnownProvider` returns `true` for all catalog IDs and `false` for unknown strings.
- `getCatalogEntry` returns the correct entry by ID.
- Secret fields and config fields are well-formed (required flags, types, placeholders).

### 3.2 Connections (`connections.test.ts`)
- **Connect**: Creates a new integration, encrypts secret fields in `credentials`, emits audit + timeline events.
- **Disconnect**: Sets status to `disconnected`, clears sensitive fields, emits events.
- **Update**: Patches `name`, `config`, `credentials`, `enabled`, `environment`; re-encrypts changed secrets.
- **Bridge**: When a payment provider is connected, `linkedConfigId` is set and credentials are mirrored into `payment_provider_configs`.
- **Encryption**: Round-trip of `encryptIntegrationSecrets` / `decryptIntegrationSecrets` preserves plaintext values.

### 3.3 Health (`health.test.ts`)
- `runHealthCheck` invokes the correct adapter's `testConnection`.
- Health snapshots are persisted with `status`, `latencyMs`, `detail`, and `checkedAt`.
- `getHealthDashboard` aggregates per-organization health with correct counts by status.
- Degraded adapters (missing secrets) produce `degraded` snapshots, not errors.

### 3.4 Dispatch (`dispatch.test.ts`)
- `sendEmail` routes to `emailAdapter` when provider is `email`.
- `sendSms` routes to `smsAdapter`.
- `sendWhatsApp` routes to `whatsappAdapter`.
- `sendPush` routes to `pushAdapter`.
- Missing configuration returns `{ ok: false, status: "failed" }` without throwing.
- Events are enqueued in `integration_events` with correct `direction` and `type`.

### 3.5 OAuth (`oauth.test.ts`)
- `buildAuthUrl` constructs the correct provider authorization URL with scopes, state, and redirect URI.
- `state` is signed and verifiable.
- `exchangeCode` persists encrypted tokens to `integration_oauth_tokens`.
- `refreshTokens` rotates `access_token` and `refresh_token` before expiry.
- Tokens are decrypted correctly on read.

### 3.6 RBAC (`rbac.test.ts`)
- `integrations.view`, `integrations.manage`, `integrations.sync`, `integrations.logs.view` are present in the permission catalog.
- Legacy keys (`integrations.configure`, `integrations.etims`, `integrations.mpesa`, `integrations.stripe`) are still defined.
- Role-to-permission mappings include the new keys for `owner`, `admin`, `manager`, `accountant`, `viewer`, and `employee`.
- Route handlers return `403 Forbidden` when the required permission is absent.

---

## 4. Results Summary

All tests pass in CI and local environments.

| Suite | Status | Notes |
|---|---|---|
| `catalog.test.ts` | Pass | Catalog integrity verified |
| `connections.test.ts` | Pass | CRUD + encryption + bridge verified |
| `health.test.ts` | Pass | Aggregation + snapshots verified |
| `dispatch.test.ts` | Pass | Routing + fallback verified |
| `oauth.test.ts` | Pass | URL building + token lifecycle verified |
| `rbac.test.ts` | Pass | Permissions + role mappings verified |

**Overall: All pass.**

---

## 5. Manual Testing Notes

### 5.1 Offline Mode
- Start the dev server without any integration environment variables set.
- Navigate to `/dashboard/integrations`.
- Verify the Marketplace loads all 17 providers.
- Click **Test Connection** on any provider; the hub should report `degraded` with a clear "not configured" message rather than throwing.
- Health dashboard should show `unknown` or `degraded` across all connections.

### 5.2 Missing Environment Variables
- Set `RESEND_API_KEY` and connect the `email` provider. Verify **Test Connection** reports `healthy` (simulated) and **Send** routes through the existing email engine when the key is valid.
- Unset `RESEND_API_KEY` and verify the email adapter falls back to `queued (simulated in offline mode)`.
- Set `STRIPE_SECRET_KEY` (even to a dummy value) and verify the Stripe adapter treats the connection as configured.

### 5.3 Secret Encryption
- Connect a provider with a password-type secret field (e.g., M-Pesa `Consumer Key`).
- Inspect the `integrations` row in the database. The `credentials` JSONB value should start with `enc::` for the secret fields.
- Decrypt via the API or service layer; plaintext should be recovered exactly.

### 5.4 Bridge Verification
- Connect `mpesa` and verify `linkedConfig_id` is populated in the `integrations` row and a corresponding row exists in `payment_provider_configs`.
- Connect `kra_etims` and verify the adapter's `sync` returns `{ bridgedTo: "compliance" }`.

### 5.5 Timeline and Audit
- Connect and disconnect a provider.
- Verify the Business Timeline page shows `integration.connected` and `integration.disconnected` events.
- Verify the Audit Log shows `category: integrations` entries for the same actions.
