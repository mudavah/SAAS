# Epic 7 — Developer Platform & Public API
## Migration Summary

## Migration File
`drizzle/0013_developer_platform.sql`

## Enums Created
```sql
CREATE TYPE "public"."oauth_client_status" AS ENUM ('active','revoked');
CREATE TYPE "public"."webhook_status" AS ENUM ('active','paused','disabled');
CREATE TYPE "public"."webhook_delivery_status" AS ENUM ('pending','delivered','failed','retrying');
```

## Tables Created

### oauth_clients
```sql
CREATE TABLE "public"."oauth_clients" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "redirect_uris" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "client_id" text NOT NULL UNIQUE,
  "client_secret_hash" text NOT NULL,
  "status" "oauth_client_status" DEFAULT 'active' NOT NULL,
  "created_by" text REFERENCES users(id) ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "oauth_client_org_idx" ON "public"."oauth_clients" ("organization_id");
```

### oauth_access_tokens
```sql
CREATE TABLE "public"."oauth_access_tokens" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "client_id" text NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "oauth_accesstoken_org_idx" ON "public"."oauth_access_tokens" ("organization_id");
CREATE INDEX "oauth_accesstoken_client_idx" ON "public"."oauth_access_tokens" ("client_id");
```

### oauth_refresh_tokens
```sql
CREATE TABLE "public"."oauth_refresh_tokens" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "client_id" text NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  "access_token_id" text REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "oauth_refreshtoken_org_idx" ON "public"."oauth_refresh_tokens" ("organization_id");
CREATE INDEX "oauth_refreshtoken_access_idx" ON "public"."oauth_refresh_tokens" ("access_token_id");
```

### oauth_authorization_codes
```sql
CREATE TABLE "public"."oauth_authorization_codes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "client_id" text NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  "code_hash" text NOT NULL,
  "redirect_uri" text NOT NULL,
  "scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "oauth_authcode_org_idx" ON "public"."oauth_authorization_codes" ("organization_id");
CREATE INDEX "oauth_authcode_client_idx" ON "public"."oauth_authorization_codes" ("client_id");
```

### webhooks
```sql
CREATE TABLE "public"."webhooks" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "secret" text NOT NULL,
  "events" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" "webhook_status" DEFAULT 'active' NOT NULL,
  "headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "webhook_org_idx" ON "public"."webhooks" ("organization_id");
```

### webhook_deliveries
```sql
CREATE TABLE "public"."webhook_deliveries" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "webhook_id" text NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
  "status_code" integer,
  "response_body" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "webhookdelivery_org_idx" ON "public"."webhook_deliveries" ("organization_id");
CREATE INDEX "webhookdelivery_webhook_idx" ON "public"."webhook_deliveries" ("webhook_id");
CREATE INDEX "webhookdelivery_status_idx" ON "public"."webhook_deliveries" ("status");
```

### api_sandbox_sessions
```sql
CREATE TABLE "public"."api_sandbox_sessions" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "api_key_id" text NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  "name" text NOT NULL,
  "environment" text DEFAULT 'sandbox' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp
);
CREATE INDEX "sandbox_org_idx" ON "public"."api_sandbox_sessions" ("organization_id");
```

### api_analytics_daily
```sql
CREATE TABLE "public"."api_analytics_daily" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "api_key_id" text REFERENCES api_keys(id) ON DELETE CASCADE,
  "date" text NOT NULL,
  "total_requests" integer DEFAULT 0 NOT NULL,
  "successful_requests" integer DEFAULT 0 NOT NULL,
  "failed_requests" integer DEFAULT 0 NOT NULL,
  "avg_response_time_ms" integer,
  "top_endpoints" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "api_analytics_daily_unique" ON "public"."api_analytics_daily" ("organization_id", "api_key_id", "date");
CREATE INDEX "api_analytics_org_date_idx" ON "public"."api_analytics_daily" ("organization_id", "date");
```

## Schema Changes (Drizzle ORM)

### New Exports from `src/db/schema.ts`
- `oauthClientStatusEnum`
- `webhookStatusEnum`
- `webhookDeliveryStatusEnum`
- `oauthClients`
- `oauthAccessTokens`
- `oauthRefreshTokens`
- `oauthAuthorizationCodes`
- `webhooks`
- `webhookDeliveries`
- `apiSandboxSessions`
- `apiAnalyticsDaily`
- Relations for all new tables
- TypeScript types for all new tables and enums

## RBAC Changes (src/lib/rbac/permissions.ts)

### New Permission Keys Added
```typescript
| "api.analytics.view"
| "api.docs.view"
| "api.sdk.generate"
| "oauth.clients.manage"
| "webhooks.manage"
| "sandbox.manage"
```

### System Role Updates
- `manager` role now includes all new Developer Platform permissions.
- `owner` gets all permissions via `ALL_PERMISSION_KEYS`.
- `administrator` gets all except billing/subscription.

## Incremental Changes
- No existing tables were altered.
- No existing columns were dropped or renamed.
- All new tables are empty on creation.
- Foreign keys use `ON DELETE CASCADE` for tenant isolation.
- Indexes created on all foreign key and filter columns.

## Applying the Migration

```bash
# Apply the manual migration
psql -h <host> -U <user> -d <db> -f drizzle/0013_developer_platform.sql

# Or via drizzle-kit (after fixing drizzle-kit compatibility)
npx drizzle-kit migrate
```
