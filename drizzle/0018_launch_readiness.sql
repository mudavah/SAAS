-- Launch Readiness — subscription lifecycle, customer success, delegated admin,
-- integration marketplace, and compliance submission queue.
-- Additive only: new enums / tables / columns. Safe on top of 0017_integration_hub.

-- ── New enums ────────────────────────────────────────────────────────────────
CREATE TYPE "coupon_type" AS ENUM ('percent', 'amount', 'trial_days');
CREATE TYPE "coupon_status" AS ENUM ('active', 'inactive', 'expired', 'depleted');
CREATE TYPE "subscription_invoice_status" AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
CREATE TYPE "submission_queue_status" AS ENUM ('queued', 'processing', 'succeeded', 'failed', 'cancelled');
CREATE TYPE "ticket_status" AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
CREATE TYPE "ticket_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "feature_request_status" AS ENUM ('planned', 'under_review', 'in_progress', 'shipped', 'declined');
CREATE TYPE "delegation_scope" AS ENUM ('organization', 'branch');
CREATE TYPE "delegation_status" AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE "announcement_audience" AS ENUM ('all', 'plan', 'organization');
CREATE TYPE "marketplace_status" AS ENUM ('available', 'installed', 'coming_soon');
CREATE TYPE "campaign_status" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');

-- ── Coupons (created before the subscriptions FK that references it) ──────────
CREATE TABLE "coupons" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "name" text,
  "type" "coupon_type" DEFAULT 'percent' NOT NULL,
  "value" numeric(8,2) DEFAULT '0' NOT NULL,
  "plan" text,
  "max_redemptions" integer,
  "redemptions_used" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp,
  "status" "coupon_status" DEFAULT 'active' NOT NULL,
  "created_by" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "unique_org_coupon_code" ON "coupons" ("organization_id", "code");

-- ── Subscription lifecycle columns ────────────────────────────────────────────
ALTER TABLE "subscriptions" ADD COLUMN "grace_period_end" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN "coupon_id" text REFERENCES "coupons" ("id") ON DELETE SET NULL;

-- ── Subscription invoices (tax invoices) ──────────────────────────────────────
CREATE TABLE "subscription_invoices" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "subscription_id" text REFERENCES "subscriptions" ("id") ON DELETE SET NULL,
  "provider" text DEFAULT 'stripe' NOT NULL,
  "provider_invoice_id" text,
  "number" text NOT NULL,
  "period_start" timestamp,
  "period_end" timestamp,
  "subtotal" numeric(12,2) DEFAULT '0' NOT NULL,
  "tax_rate" numeric(6,4) DEFAULT '0',
  "tax_amount" numeric(12,2) DEFAULT '0' NOT NULL,
  "total" numeric(12,2) DEFAULT '0' NOT NULL,
  "currency" text DEFAULT 'KES' NOT NULL,
  "status" "subscription_invoice_status" DEFAULT 'draft' NOT NULL,
  "invoice_url" text,
  "pdf_url" text,
  "paid_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "subscription_invoices_org_idx" ON "subscription_invoices" ("organization_id");
CREATE INDEX "subscription_invoices_provider_idx" ON "subscription_invoices" ("provider_invoice_id");

-- ── eTIMS submission queue ───────────────────────────────────────────────────
CREATE TABLE "etims_submission_queue" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "invoice_id" text REFERENCES "invoices" ("id") ON DELETE SET NULL,
  "etims_invoice_id" text REFERENCES "etims_invoices" ("id") ON DELETE SET NULL,
  "status" "submission_queue_status" DEFAULT 'queued' NOT NULL,
  "attempt" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5,
  "last_error" text,
  "next_retry_at" timestamp,
  "response" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "etims_submission_queue_org_idx" ON "etims_submission_queue" ("organization_id");
CREATE INDEX "etims_submission_queue_status_idx" ON "etims_submission_queue" ("status");

-- ── Delegated administration ───────────────────────────────────────────────────
CREATE TABLE "enterprise_delegations" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "granter_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "delegate_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "scope" "delegation_scope" DEFAULT 'organization' NOT NULL,
  "branch_id" text REFERENCES "enterprise_branches" ("id") ON DELETE SET NULL,
  "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" "delegation_status" DEFAULT 'active' NOT NULL,
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "enterprise_delegations_org_idx" ON "enterprise_delegations" ("organization_id");
CREATE INDEX "enterprise_delegations_delegate_idx" ON "enterprise_delegations" ("delegate_id");

-- ── Knowledge base ─────────────────────────────────────────────────────────────
CREATE TABLE "knowledge_base_articles" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "author_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "category" text DEFAULT 'general' NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "excerpt" text,
  "published" boolean DEFAULT true NOT NULL,
  "is_global" boolean DEFAULT true NOT NULL,
  "views" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "unique_global_kb_slug" ON "knowledge_base_articles" ("slug", "is_global");

-- ── Support tickets ─────────────────────────────────────────────────────────────
CREATE TABLE "support_tickets" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "user_email" text,
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "status" "ticket_status" DEFAULT 'open' NOT NULL,
  "priority" "ticket_priority" DEFAULT 'normal' NOT NULL,
  "category" text DEFAULT 'general',
  "assignee_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "support_tickets_org_idx" ON "support_tickets" ("organization_id");
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" ("status");

-- ── Feature requests ────────────────────────────────────────────────────────────
CREATE TABLE "feature_requests" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "user_email" text,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "status" "feature_request_status" DEFAULT 'under_review' NOT NULL,
  "votes" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ── Customer feedback ────────────────────────────────────────────────────────────
CREATE TABLE "customer_feedback" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "user_email" text,
  "rating" integer,
  "message" text NOT NULL,
  "page" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "customer_feedback_org_idx" ON "customer_feedback" ("organization_id");

-- ── Announcements ────────────────────────────────────────────────────────────────
CREATE TABLE "announcements" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "author_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "audience" "announcement_audience" DEFAULT 'all' NOT NULL,
  "plan_filter" text,
  "dismissible" boolean DEFAULT true NOT NULL,
  "published" boolean DEFAULT true NOT NULL,
  "starts_at" timestamp DEFAULT now(),
  "ends_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "announcements_org_idx" ON "announcements" ("organization_id");
CREATE INDEX "announcements_published_idx" ON "announcements" ("published");

-- ── Integration marketplace catalog ──────────────────────────────────────────────
CREATE TABLE "integration_marketplace" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "provider" text NOT NULL,
  "name" text NOT NULL,
  "category" "integration_category" NOT NULL,
  "description" text,
  "auth_type" "integration_auth_type" DEFAULT 'api_key' NOT NULL,
  "config_fields" jsonb DEFAULT '[]'::jsonb,
  "secret_fields" jsonb DEFAULT '[]'::jsonb,
  "scopes" jsonb DEFAULT '[]'::jsonb,
  "capabilities" jsonb DEFAULT '[]'::jsonb,
  "status" "marketplace_status" DEFAULT 'available' NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "install_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "unique_marketplace_provider" ON "integration_marketplace" ("provider");

-- ── Email campaigns ──────────────────────────────────────────────────────────────
CREATE TABLE "email_campaigns" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "author_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "preheader" text,
  "html" text NOT NULL,
  "audience" text DEFAULT 'all' NOT NULL,
  "status" "campaign_status" DEFAULT 'draft' NOT NULL,
  "scheduled_at" timestamp,
  "sent_at" timestamp,
  "recipient_count" integer DEFAULT 0 NOT NULL,
  "open_count" integer DEFAULT 0 NOT NULL,
  "click_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "email_campaigns_org_idx" ON "email_campaigns" ("organization_id");
