# Epic 7 — Developer Platform & Public API
## Architecture Summary

## 1. Overview

Epic 7 adds a comprehensive **Developer Platform** to KaziFlow, enabling third-party systems to integrate securely via REST APIs, OAuth 2.0, and Webhooks. All new functionality preserves the existing multi-tenant, RBAC-secured architecture.

## 2. Core Components

### 2.1 REST API Gateway (`/api/v1/*`)
- **47 public API route files** covering all business modules.
- Centralized auth via `handleApi(req, permission, handler)`.
- CORS support via `getCorsHeaders(req)`.
- Rate limiting: 600 req/min per org, 120 req/min per key.
- All responses scoped by `organizationId`.

### 2.2 API Keys
- Existing `api_keys` table extended with management endpoints.
- Keys are bcrypt-hashed; plaintext shown once at creation.
- Scoped permissions mapped to RBAC permission keys.
- Supports expiration and soft revocation.

### 2.3 OAuth 2.0 Authentication
- Authorization Code flow implementation.
- New tables: `oauth_clients`, `oauth_access_tokens`, `oauth_refresh_tokens`, `oauth_authorization_codes`.
- Client credentials hashed with bcrypt.
- Token rotation on refresh.
- All tokens hashed at rest.

### 2.4 Webhooks
- Event-driven webhook delivery system.
- HMAC-SHA256 signature verification.
- Exponential backoff retry (5 attempts max).
- New tables: `webhooks`, `webhook_deliveries`.
- Supports custom headers and per-event subscriptions.

### 2.5 API Versioning
- Versioned under `/api/v1/`.
- Version prefix in OpenAPI spec and SDK generation.
- Backward-compatible; new versions can be added under `/api/v2/`.

### 2.6 OpenAPI (Swagger) Documentation
- Dynamically generated OpenAPI 3.0.3 spec.
- Served at `/api/developer/docs`.
- Includes all v1 endpoints, schemas, and security schemes.

### 2.7 Developer Portal (`/developer/*`)
- 8 server-rendered pages:
  - Dashboard
  - API Keys
  - OAuth Apps
  - Webhooks
  - Sandbox
  - Analytics
  - Documentation
  - SDK Generator

### 2.8 SDK Generation
- Multi-language code generation (TypeScript, Python, cURL, Go, Java, PHP, Ruby).
- Uses generated API key in examples.
- Accessible via `/api/developer/sdk` and `/developer/sdk`.

### 2.9 API Usage Analytics
- Aggregated metrics: total/successful/failed requests, error rate, latency percentiles.
- Daily rollup table: `api_analytics_daily`.
- Per-key and per-org analytics.
- Top endpoints and status codes.

### 2.10 Rate Limiting
- Fixed-window in-memory limiter (pluggable Redis/Upstash store).
- Org-level and per-key limits enforced in `getApiContext`.

### 2.11 API Sandbox
- Isolated test sessions for developers.
- Uses `api_sandbox_sessions` table.
- Supports expirable sandbox API keys.

## 3. Database Schema Changes

### New Enums
| Enum | Values |
|------|--------|
| `oauth_client_status` | active, revoked |
| `webhook_status` | active, paused, disabled |
| `webhook_delivery_status` | pending, delivered, failed, retrying |

### New Tables
| Table | Purpose |
|-------|---------|
| `oauth_clients` | OAuth 2.0 client applications |
| `oauth_access_tokens` | OAuth access tokens (hashed) |
| `oauth_refresh_tokens` | OAuth refresh tokens (hashed) |
| `oauth_authorization_codes` | Authorization codes (hashed) |
| `webhooks` | Webhook subscriptions |
| `webhook_deliveries` | Webhook delivery attempt logs |
| `api_sandbox_sessions` | Sandbox environment sessions |
| `api_analytics_daily` | Daily API usage rollups |

### New Relations
- `oauthClientsRelations`
- `oauthAccessTokensRelations`
- `oauthRefreshTokensRelations`
- `oauthAuthorizationCodesRelations`
- `webhooksRelations`
- `webhookDeliveriesRelations`
- `apiSandboxSessionsRelations`
- `apiAnalyticsDailyRelations`

## 4. Security Model

- **Multi-tenancy**: All queries scoped by `organizationId`.
- **RBAC**: 127 fine-grained permissions + 6 new Developer Platform permissions.
- **Audit**: All mutations logged via `logAuditSafe`.
- **Timeline**: Business events emitted via `emitDeveloperEvent`.
- **Webhook Signatures**: HMAC-SHA256 with `timingSafeEqual`.
- **Token Hashing**: bcrypt for API keys, OAuth secrets, and tokens.

## 5. New RBAC Permissions

| Permission | Category | Description |
|-----------|----------|-------------|
| `api.analytics.view` | api | View API usage analytics |
| `api.docs.view` | api | View API documentation |
| `api.sdk.generate` | api | Generate client SDKs |
| `oauth.clients.manage` | api | Manage OAuth client apps |
| `webhooks.manage` | api | Manage webhook subscriptions |
| `sandbox.manage` | api | Manage API sandbox sessions |

## 6. Technology Stack (Unchanged)

- **Framework**: Next.js 15 (App Router)
- **Runtime**: React 19, TypeScript 5.7
- **Database**: PostgreSQL + Drizzle ORM 0.38
- **Auth**: NextAuth 5 + API Keys + OAuth 2.0
- **Validation**: Zod 3.24

## 7. File Inventory

### Core Libraries (7 files)
- `src/lib/api/oauth.ts`
- `src/lib/api/webhooks.ts`
- `src/lib/api/sandbox.ts`
- `src/lib/api/openapi.ts`
- `src/lib/api/sdk.ts`
- `src/lib/api/analytics.ts`
- `src/lib/api/events.ts`

### Public API Routes (47 files)
- `src/app/api/v1/*/route.ts` for all modules

### Developer Portal API (12 files)
- `src/app/api/developer/*`

### Developer Portal Pages (8 files)
- `src/app/developer/*`

### Tests (1 new file)
- `src/lib/api/__tests__/developer-platform.test.ts`

### Database
- `src/db/schema.ts` (updated)
- `drizzle/0013_developer_platform.sql` (manual migration)
