-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0001 — Enterprise Foundation
-- Adds ONLY what is missing from the original 0000_cynical_blur schema:
--   • 7 new enums (RBAC / audit / notifications / API)
--   • 10 new tenant-isolation tables (organizations, roles, audit_logs, ...)
--   • organization_id column + FK on every existing business table
-- Never recreates existing tables; never destroys data.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."role_type" AS ENUM('owner', 'administrator', 'manager', 'accountant', 'inventory_manager', 'cashier', 'sales_representative', 'employee', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('invited', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."permission_category" AS ENUM('organization', 'clients', 'invoices', 'payments', 'expenses', 'inventory', 'purchasing', 'bookkeeping', 'reports', 'compliance', 'integrations', 'ai', 'team', 'roles', 'api', 'audit', 'notifications', 'settings', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."audit_category" AS ENUM('auth', 'organization', 'clients', 'invoices', 'payments', 'expenses', 'inventory', 'purchasing', 'bookkeeping', 'reports', 'compliance', 'integrations', 'ai', 'team', 'roles', 'api', 'subscription', 'settings', 'notifications', 'tasks');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('inventory', 'finance', 'invoices', 'payments', 'compliance', 'security', 'subscriptions', 'ai', 'system', 'organization');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."api_key_status" AS ENUM('active', 'inactive', 'revoked');--> statement-breakpoint

CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"owner_id" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"type" "role_type",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"name" text,
	"role_type" "role_type" DEFAULT 'employee' NOT NULL,
	"custom_role_id" text,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"invited_by" text,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"category" "permission_category" NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"user_id" text,
	"action" text NOT NULL,
	"category" "audit_category" NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"description" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"category" "notification_category" NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"priority" "notification_priority" DEFAULT 'normal' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"deep_link" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"category" "notification_category" NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT false NOT NULL,
	"push" boolean DEFAULT false NOT NULL,
	"sms" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"secret_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_by" text,
	"revoked_at" timestamp,
	"revoked_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time_ms" integer,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Foreign keys for the new tables
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_custom_role_id_roles_id_fk" FOREIGN KEY ("custom_role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "apiusage_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "apiusage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Unique constraints / indexes for new tables
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_slug_unique" UNIQUE ("slug");--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "unique_org_user" UNIQUE ("organization_id","user_id");--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "unique_org_role" UNIQUE ("organization_id","name");--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "unique_role_permission" UNIQUE ("role_id","permission");--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "unique_permission_key" UNIQUE ("key");--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "unique_notif_pref" UNIQUE ("organization_id","user_id","category");--> statement-breakpoint
CREATE INDEX "audit_org_created" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_resource" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_category" ON "audit_logs" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "notif_user_unread" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE INDEX "notif_org_created" ON "notifications" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "apikey_org" ON "api_keys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "apiusage_org_created" ON "api_usage" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "apiusage_key_created" ON "api_usage" USING btree ("api_key_id","created_at");--> statement-breakpoint

-- Add organization_id to existing business tables (nullable to preserve data)
ALTER TABLE "businesses" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "client_logs" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "usage_records" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_categories" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_brands" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_warehouses" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_products" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_stock_movements" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_purchase_orders" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_purchase_order_items" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "inventory_stock_adjustments" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "etims_config" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "etims_invoices" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "etims_compliance_logs" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "organization_id" text;--> statement-breakpoint

-- Foreign keys for the new organization_id columns
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_logs" ADD CONSTRAINT "client_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_brands" ADD CONSTRAINT "inventory_brands_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD CONSTRAINT "inventory_suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_warehouses" ADD CONSTRAINT "inventory_warehouses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock_movements" ADD CONSTRAINT "inventory_stock_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_purchase_orders" ADD CONSTRAINT "inventory_purchase_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_purchase_order_items" ADD CONSTRAINT "inventory_purchase_order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock_adjustments" ADD CONSTRAINT "inventory_stock_adjustments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etims_config" ADD CONSTRAINT "etims_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etims_invoices" ADD CONSTRAINT "etims_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etims_compliance_logs" ADD CONSTRAINT "etims_compliance_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
