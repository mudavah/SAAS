-- Epic 11 — Integration Hub (incremental migration)
-- Creates only NEW enums / tables / indexes / timeline values for the integration module.
-- Safe to apply on top of 0016_enterprise_multi_branch.

-- ── New enums ────────────────────────────────────────────────────────────────
CREATE TYPE "integration_category" AS ENUM (
  'government',
  'payment',
  'email',
  'sms',
  'whatsapp',
  'push',
  'calendar',
  'accounting',
  'storage',
  'hardware'
);

CREATE TYPE "integration_status" AS ENUM (
  'connected',
  'disconnected',
  'pending',
  'error',
  'expired'
);

CREATE TYPE "integration_auth_type" AS ENUM (
  'oauth2',
  'api_key',
  'basic',
  'credentials',
  'none',
  'webhook'
);

CREATE TYPE "integration_health_status" AS ENUM (
  'healthy',
  'degraded',
  'down',
  'unknown'
);

CREATE TYPE "integration_event_status" AS ENUM (
  'pending',
  'processing',
  'success',
  'failed',
  'retrying',
  'dead'
);

-- ── Extend timeline events ───────────────────────────────────────────────────
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.connected';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.disconnected';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.updated';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.sync.started';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.sync.completed';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.sync.failed';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.message.sent';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.message.failed';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.webhook.received';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.health.degraded';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.token.refreshed';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.marketplace.installed';
ALTER TYPE "timeline_event_type" ADD VALUE 'integration.error';

-- ── Integrations ─────────────────────────────────────────────────────────────
CREATE TABLE "integrations" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "category" "integration_category" NOT NULL,
  "provider" text NOT NULL,
  "name" text NOT NULL,
  "auth_type" "integration_auth_type" NOT NULL DEFAULT 'api_key',
  "status" "integration_status" NOT NULL DEFAULT 'pending',
  "enabled" boolean NOT NULL DEFAULT true,
  "environment" text NOT NULL DEFAULT 'production',
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "credentials" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "health_status" "integration_health_status" NOT NULL DEFAULT 'unknown',
  "last_checked_at" timestamp,
  "last_sync_at" timestamp,
  "error_message" text,
  "expires_at" timestamp,
  "linked_config_id" text REFERENCES "payment_provider_configs" ("id") ON DELETE SET NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "integrations_org_provider_name_idx"
  ON "integrations" USING btree ("organization_id", "provider", "name");
CREATE INDEX "integrations_org_idx"
  ON "integrations" USING btree ("organization_id");
CREATE INDEX "integrations_org_category_idx"
  ON "integrations" USING btree ("organization_id", "category");
CREATE INDEX "integrations_org_status_idx"
  ON "integrations" USING btree ("organization_id", "status");
CREATE INDEX "integrations_org_health_idx"
  ON "integrations" USING btree ("organization_id", "health_status");

-- ── OAuth Tokens ─────────────────────────────────────────────────────────────
CREATE TABLE "integration_oauth_tokens" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "integration_id" text NOT NULL REFERENCES "integrations" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "token_type" text DEFAULT 'Bearer',
  "scope" text,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "integration_oauth_tokens_integration_idx"
  ON "integration_oauth_tokens" USING btree ("integration_id");
CREATE INDEX "integration_oauth_tokens_org_idx"
  ON "integration_oauth_tokens" USING btree ("organization_id");

-- ── Activity Logs ────────────────────────────────────────────────────────────
CREATE TABLE "integration_activity_logs" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "integration_id" text NOT NULL REFERENCES "integrations" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "provider" text NOT NULL,
  "action" text NOT NULL,
  "status" text NOT NULL,
  "message" text,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "latency_ms" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "integration_activity_logs_integration_idx"
  ON "integration_activity_logs" USING btree ("integration_id");
CREATE INDEX "integration_activity_logs_org_idx"
  ON "integration_activity_logs" USING btree ("organization_id");
CREATE INDEX "integration_activity_logs_org_created_idx"
  ON "integration_activity_logs" USING btree ("organization_id", "created_at");

-- ── Events ───────────────────────────────────────────────────────────────────
CREATE TABLE "integration_events" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "integration_id" text NOT NULL REFERENCES "integrations" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "direction" text NOT NULL DEFAULT 'outbound',
  "type" text NOT NULL,
  "status" "integration_event_status" NOT NULL DEFAULT 'pending',
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "response" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "error" text,
  "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 5,
  "next_retry_at" timestamp,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "integration_events_integration_idx"
  ON "integration_events" USING btree ("integration_id");
CREATE INDEX "integration_events_org_idx"
  ON "integration_events" USING btree ("organization_id");
CREATE INDEX "integration_events_status_idx"
  ON "integration_events" USING btree ("status", "next_retry_at");

-- ── Webhook Logs ─────────────────────────────────────────────────────────────
CREATE TABLE "integration_webhook_logs" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "integration_id" text NOT NULL REFERENCES "integrations" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "event" text,
  "verified" boolean NOT NULL DEFAULT false,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'received',
  "error" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "integration_webhook_logs_integration_idx"
  ON "integration_webhook_logs" USING btree ("integration_id");
CREATE INDEX "integration_webhook_logs_org_idx"
  ON "integration_webhook_logs" USING btree ("organization_id");
CREATE INDEX "integration_webhook_logs_org_created_idx"
  ON "integration_webhook_logs" USING btree ("organization_id", "created_at");

-- ── Health Checks ────────────────────────────────────────────────────────────
CREATE TABLE "integration_health_checks" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "integration_id" text NOT NULL REFERENCES "integrations" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "status" "integration_health_status" NOT NULL DEFAULT 'unknown',
  "latency_ms" integer,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "checked_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "integration_health_checks_integration_idx"
  ON "integration_health_checks" USING btree ("integration_id");
CREATE INDEX "integration_health_checks_org_idx"
  ON "integration_health_checks" USING btree ("organization_id");
CREATE INDEX "integration_health_checks_checked_idx"
  ON "integration_health_checks" USING btree ("checked_at");
