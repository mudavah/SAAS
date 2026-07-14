-- Epic 10 — Enterprise & Multi-Branch Management (incremental migration)
-- Creates only NEW enums / tables / indexes for the enterprise module.
-- Safe to apply on top of 0015_enterprise_analytics.

-- ── New enums ────────────────────────────────────────────────────────────────
CREATE TYPE "branch_type" AS ENUM ('head_office', 'retail', 'warehouse', 'office', 'factory', 'other');
CREATE TYPE "branch_status" AS ENUM ('active', 'inactive', 'suspended', 'closing');
CREATE TYPE "transfer_status" AS ENUM ('draft', 'pending', 'in_transit', 'received', 'completed', 'cancelled', 'rejected');
CREATE TYPE "inter_branch_sale_status" AS ENUM ('draft', 'pending', 'approved', 'completed', 'cancelled');

-- Extend timeline events
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.branch.created';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.branch.updated';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.branch.deleted';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.transfer.created';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.transfer.in_transit';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.transfer.received';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.transfer.completed';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.transfer.cancelled';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.inter_branch_sale.created';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.inter_branch_sale.approved';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.inter_branch_sale.completed';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.inter_branch_sale.cancelled';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.procurement.created';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.procurement.approved';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.procurement.received';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.branch.approval.requested';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.branch.approval.approved';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.branch.approval.rejected';
ALTER TYPE "timeline_event_type" ADD VALUE 'enterprise.ai.insight.generated';

-- ── Branches ──────────────────────────────────────────────────────────────────
CREATE TABLE "enterprise_branches" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "type" "branch_type" DEFAULT 'retail' NOT NULL,
  "status" "branch_status" DEFAULT 'active' NOT NULL,
  "address" text,
  "city" text,
  "country" text DEFAULT 'Kenya',
  "phone" text,
  "email" text,
  "manager_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "timezone" text DEFAULT 'Africa/Nairobi',
  "currency" text DEFAULT 'KES',
  "tax_id" text,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "enterprise_branches_org_idx" ON "enterprise_branches" USING btree ("organization_id");
CREATE INDEX "enterprise_branches_user_idx" ON "enterprise_branches" USING btree ("user_id");
CREATE UNIQUE INDEX "unique_org_branch_code" ON "enterprise_branches" USING btree ("organization_id", "code");
CREATE INDEX "enterprise_branches_manager_idx" ON "enterprise_branches" USING btree ("manager_id");

-- ── Branch Members ────────────────────────────────────────────────────────────
CREATE TABLE "branch_members" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "role_type" "role_type" DEFAULT 'employee' NOT NULL,
  "custom_role_id" text REFERENCES "roles" ("id") ON DELETE SET NULL,
  "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "branch_members_org_idx" ON "branch_members" USING btree ("organization_id");
CREATE INDEX "branch_members_branch_idx" ON "branch_members" USING btree ("branch_id");
CREATE INDEX "branch_members_user_idx" ON "branch_members" USING btree ("user_id");
CREATE UNIQUE INDEX "unique_branch_user" ON "branch_members" USING btree ("branch_id", "user_id");

-- ── Branch Pricing ────────────────────────────────────────────────────────────
CREATE TABLE "branch_pricing" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE CASCADE,
  "product_id" text REFERENCES "inventory_products" ("id") ON DELETE SET NULL,
  "category_id" text REFERENCES "inventory_categories" ("id") ON DELETE SET NULL,
  "price_adjustment_type" text DEFAULT 'percentage',
  "price_adjustment_value" numeric(12,2) DEFAULT '0',
  "min_price" numeric(12,2),
  "max_price" numeric(12,2),
  "effective_from" timestamp,
  "effective_to" timestamp,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "branch_pricing_org_idx" ON "branch_pricing" USING btree ("organization_id");
CREATE INDEX "branch_pricing_branch_idx" ON "branch_pricing" USING btree ("branch_id");
CREATE INDEX "branch_pricing_product_idx" ON "branch_pricing" USING btree ("product_id");
CREATE UNIQUE INDEX "unique_branch_product_pricing" ON "branch_pricing" USING btree ("branch_id", "product_id");

-- ── Branch Tax Settings ───────────────────────────────────────────────────────
CREATE TABLE "branch_tax_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE CASCADE,
  "tax_name" text NOT NULL,
  "tax_type" text NOT NULL,
  "rate" numeric(5,2) NOT NULL,
  "is_compound" boolean DEFAULT false NOT NULL,
  "applies_to" text DEFAULT 'all',
  "effective_from" timestamp,
  "effective_to" timestamp,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "branch_tax_settings_org_idx" ON "branch_tax_settings" USING btree ("organization_id");
CREATE INDEX "branch_tax_settings_branch_idx" ON "branch_tax_settings" USING btree ("branch_id");

-- ── Inter-Branch Transfers ────────────────────────────────────────────────────
CREATE TABLE "inter_branch_transfers" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "transfer_number" text NOT NULL,
  "from_branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE RESTRICT,
  "to_branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE RESTRICT,
  "status" "transfer_status" DEFAULT 'draft' NOT NULL,
  "notes" text,
  "approved_by" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "approved_at" timestamp,
  "received_by" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "received_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "inter_branch_transfers_org_idx" ON "inter_branch_transfers" USING btree ("organization_id");
CREATE INDEX "inter_branch_transfers_user_idx" ON "inter_branch_transfers" USING btree ("user_id");
CREATE INDEX "inter_branch_transfers_from_idx" ON "inter_branch_transfers" USING btree ("from_branch_id");
CREATE INDEX "inter_branch_transfers_to_idx" ON "inter_branch_transfers" USING btree ("to_branch_id");
CREATE UNIQUE INDEX "unique_org_transfer_number" ON "inter_branch_transfers" USING btree ("organization_id", "transfer_number");
CREATE INDEX "inter_branch_transfers_status_idx" ON "inter_branch_transfers" USING btree ("status");

-- ── Inter-Branch Transfer Items ───────────────────────────────────────────────
CREATE TABLE "inter_branch_transfer_items" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "transfer_id" text NOT NULL REFERENCES "inter_branch_transfers" ("id") ON DELETE CASCADE,
  "product_id" text NOT NULL REFERENCES "inventory_products" ("id") ON DELETE RESTRICT,
  "quantity" numeric(12,3) NOT NULL,
  "unit_cost" numeric(12,2) NOT NULL,
  "received_quantity" numeric(12,3) DEFAULT '0',
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "inter_branch_transfer_items_org_idx" ON "inter_branch_transfer_items" USING btree ("organization_id");
CREATE INDEX "inter_branch_transfer_items_transfer_idx" ON "inter_branch_transfer_items" USING btree ("transfer_id");
CREATE INDEX "inter_branch_transfer_items_product_idx" ON "inter_branch_transfer_items" USING btree ("product_id");

-- ── Inter-Branch Sales ────────────────────────────────────────────────────────
CREATE TABLE "inter_branch_sales" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "sale_number" text NOT NULL,
  "from_branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE RESTRICT,
  "to_branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE RESTRICT,
  "status" "inter_branch_sale_status" DEFAULT 'draft' NOT NULL,
  "currency" text DEFAULT 'KES' NOT NULL,
  "subtotal" numeric(14,2) DEFAULT '0',
  "tax_rate" numeric(5,2) DEFAULT '16',
  "tax_amount" numeric(14,2) DEFAULT '0',
  "total" numeric(14,2) DEFAULT '0',
  "notes" text,
  "approved_by" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "approved_at" timestamp,
  "completed_at" timestamp,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "inter_branch_sales_org_idx" ON "inter_branch_sales" USING btree ("organization_id");
CREATE INDEX "inter_branch_sales_user_idx" ON "inter_branch_sales" USING btree ("user_id");
CREATE INDEX "inter_branch_sales_from_idx" ON "inter_branch_sales" USING btree ("from_branch_id");
CREATE INDEX "inter_branch_sales_to_idx" ON "inter_branch_sales" USING btree ("to_branch_id");
CREATE UNIQUE INDEX "unique_org_inter_branch_sale_number" ON "inter_branch_sales" USING btree ("organization_id", "sale_number");
CREATE INDEX "inter_branch_sales_status_idx" ON "inter_branch_sales" USING btree ("status");

-- ── Inter-Branch Sale Items ───────────────────────────────────────────────────
CREATE TABLE "inter_branch_sale_items" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "sale_id" text NOT NULL REFERENCES "inter_branch_sales" ("id") ON DELETE CASCADE,
  "product_id" text NOT NULL REFERENCES "inventory_products" ("id") ON DELETE RESTRICT,
  "description" text NOT NULL,
  "quantity" numeric(12,3) NOT NULL,
  "unit_price" numeric(12,2) NOT NULL,
  "discount" numeric(12,2) DEFAULT '0',
  "tax_rate" numeric(5,2) DEFAULT '16',
  "line_total" numeric(14,2) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "inter_branch_sale_items_org_idx" ON "inter_branch_sale_items" USING btree ("organization_id");
CREATE INDEX "inter_branch_sale_items_sale_idx" ON "inter_branch_sale_items" USING btree ("sale_id");
CREATE INDEX "inter_branch_sale_items_product_idx" ON "inter_branch_sale_items" USING btree ("product_id");

-- ── Branch Approval Workflows ─────────────────────────────────────────────────
CREATE TABLE "branch_approval_workflows" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "resource_type" text NOT NULL,
  "steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "branch_approval_workflows_org_idx" ON "branch_approval_workflows" USING btree ("organization_id");
CREATE INDEX "branch_approval_workflows_branch_idx" ON "branch_approval_workflows" USING btree ("branch_id");
CREATE INDEX "branch_approval_workflows_resource_idx" ON "branch_approval_workflows" USING btree ("resource_type");

-- ── Branch Approval Requests ──────────────────────────────────────────────────
CREATE TABLE "branch_approval_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE CASCADE,
  "workflow_id" text REFERENCES "branch_approval_workflows" ("id") ON DELETE SET NULL,
  "resource_type" text NOT NULL,
  "resource_id" text,
  "title" text NOT NULL,
  "status" "approval_status" DEFAULT 'pending' NOT NULL,
  "current_step" integer DEFAULT 0 NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "decided_by" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "decided_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "branch_approval_requests_org_idx" ON "branch_approval_requests" USING btree ("organization_id");
CREATE INDEX "branch_approval_requests_branch_idx" ON "branch_approval_requests" USING btree ("branch_id");
CREATE INDEX "branch_approval_requests_resource_idx" ON "branch_approval_requests" USING btree ("resource_type", "resource_id");
CREATE INDEX "branch_approval_requests_status_idx" ON "branch_approval_requests" USING btree ("status");

-- ── Enterprise Settings ───────────────────────────────────────────────────────
CREATE TABLE "enterprise_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "consolidated_reporting" boolean DEFAULT true NOT NULL,
  "cross_branch_inventory_visibility" boolean DEFAULT true NOT NULL,
  "centralized_procurement" boolean DEFAULT false NOT NULL,
  "branch_approval_required" boolean DEFAULT false NOT NULL,
  "default_transfer_method" text DEFAULT 'standard',
  "auto_approve_transfers_below" numeric(14,2),
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "unique_org_enterprise_settings" ON "enterprise_settings" USING btree ("organization_id");

-- ── Branch Performance Snapshots ──────────────────────────────────────────────
CREATE TABLE "branch_performance_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "branch_id" text NOT NULL REFERENCES "enterprise_branches" ("id") ON DELETE CASCADE,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "revenue" numeric(14,2) DEFAULT '0',
  "expenses" numeric(14,2) DEFAULT '0',
  "profit" numeric(14,2) DEFAULT '0',
  "inventory_value" numeric(14,2) DEFAULT '0',
  "sales_count" integer DEFAULT 0,
  "transfer_count" integer DEFAULT 0,
  "employee_count" integer DEFAULT 0,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "computed_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "branch_performance_snapshots_org_idx" ON "branch_performance_snapshots" USING btree ("organization_id");
CREATE INDEX "branch_performance_snapshots_branch_idx" ON "branch_performance_snapshots" USING btree ("branch_id");
CREATE INDEX "branch_performance_snapshots_period_idx" ON "branch_performance_snapshots" USING btree ("period_start", "period_end");
CREATE UNIQUE INDEX "unique_branch_period" ON "branch_performance_snapshots" USING btree ("branch_id", "period_start", "period_end");
