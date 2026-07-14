-- ─────────────────────────────────────────────────────────────────────────────
-- Epic 7 — Developer Platform & Public API
-- Adds enums, tables, indexes, and foreign keys for OAuth 2.0, Webhooks,
-- API Sandbox, and API Analytics.
-- ─────────────────────────────────────────────────────────────────────────────

-- Developer Platform Enums
CREATE TYPE "public"."oauth_client_status" AS ENUM ('active','revoked');
CREATE TYPE "public"."webhook_status" AS ENUM ('active','paused','disabled');
CREATE TYPE "public"."webhook_delivery_status" AS ENUM ('pending','delivered','failed','retrying');

-- OAuth 2.0 Clients
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

-- OAuth Access Tokens
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

-- OAuth Refresh Tokens
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

-- OAuth Authorization Codes
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

-- Webhooks
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

-- Webhook Deliveries
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

-- API Sandbox Sessions
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

-- API Analytics Daily
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
