-- Epic 8 — AI & Automation Platform (incremental migration)
-- Creates only NEW enums / tables / indexes and extends the existing
-- timeline_event_type enum. Safe to apply on top of 0013_developer_platform.

-- ── New enums ───────────────────────────────────────────────────────────────
CREATE TYPE "automation_trigger_type" AS ENUM ('event', 'schedule', 'manual');
CREATE TYPE "automation_status" AS ENUM ('draft', 'active', 'paused', 'error');
CREATE TYPE "automation_run_status" AS ENUM ('pending', 'running', 'success', 'partial', 'failed', 'skipped');
CREATE TYPE "automation_action_type" AS ENUM ('notify', 'create_task', 'create_invoice', 'create_quotation', 'create_purchase_order', 'send_email', 'create_timeline_event', 'update_record', 'webhook', 'ai_insight', 'ai_summarize', 'approval_request', 'delay');
CREATE TYPE "forecast_type" AS ENUM ('revenue', 'cash_flow', 'inventory', 'churn', 'sales');
CREATE TYPE "ai_report_type" AS ENUM ('financial_summary', 'profit_loss', 'cash_flow', 'tax_readiness', 'custom');
CREATE TYPE "ai_document_type" AS ENUM ('invoice', 'quotation', 'purchase_order');
CREATE TYPE "ai_document_status" AS ENUM ('draft', 'reviewed', 'created', 'rejected');
CREATE TYPE "ai_task_status" AS ENUM ('open', 'accepted', 'dismissed', 'completed');
CREATE TYPE "approval_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'escalated');
CREATE TYPE "churn_risk" AS ENUM ('low', 'medium', 'high');

-- Extend the existing timeline event enum with automation / approval / ai events.
ALTER TYPE "timeline_event_type" ADD VALUE 'automation.workflow.created';
ALTER TYPE "timeline_event_type" ADD VALUE 'automation.workflow.updated';
ALTER TYPE "timeline_event_type" ADD VALUE 'automation.workflow.deleted';
ALTER TYPE "timeline_event_type" ADD VALUE 'automation.workflow.run';
ALTER TYPE "timeline_event_type" ADD VALUE 'automation.workflow.failed';
ALTER TYPE "timeline_event_type" ADD VALUE 'automation.scheduled.run';
ALTER TYPE "timeline_event_type" ADD VALUE 'approval.workflow.created';
ALTER TYPE "timeline_event_type" ADD VALUE 'approval.requested';
ALTER TYPE "timeline_event_type" ADD VALUE 'approval.approved';
ALTER TYPE "timeline_event_type" ADD VALUE 'approval.rejected';
ALTER TYPE "timeline_event_type" ADD VALUE 'approval.escalated';
ALTER TYPE "timeline_event_type" ADD VALUE 'ai.forecast.generated';
ALTER TYPE "timeline_event_type" ADD VALUE 'ai.report.generated';
ALTER TYPE "timeline_event_type" ADD VALUE 'ai.document.generated';
ALTER TYPE "timeline_event_type" ADD VALUE 'ai.task.recommended';
ALTER TYPE "timeline_event_type" ADD VALUE 'ai.churn.predicted';
ALTER TYPE "timeline_event_type" ADD VALUE 'ai.nl_query.executed';

-- ── Workflow automation ─────────────────────────────────────────────────────
CREATE TABLE "automation_workflows" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "status" "automation_status" DEFAULT 'draft' NOT NULL,
  "trigger_type" "automation_trigger_type" NOT NULL,
  "trigger_config" jsonb DEFAULT '{}'::jsonb,
  "conditions" jsonb DEFAULT '{}'::jsonb,
  "version" integer DEFAULT 1 NOT NULL,
  "run_count" integer DEFAULT 0 NOT NULL,
  "last_run_at" timestamp,
  "last_run_status" "automation_run_status",
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "automation_workflows_org_idx" ON "automation_workflows" USING btree ("organization_id");
CREATE INDEX "automation_workflows_user_idx" ON "automation_workflows" USING btree ("user_id");
CREATE INDEX "automation_workflows_status_idx" ON "automation_workflows" USING btree ("status");
CREATE INDEX "automation_workflows_trigger_idx" ON "automation_workflows" USING btree ("trigger_type");

CREATE TABLE "automation_actions" (
  "id" text PRIMARY KEY NOT NULL,
  "workflow_id" text NOT NULL REFERENCES "automation_workflows" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "order" integer DEFAULT 0 NOT NULL,
  "type" "automation_action_type" NOT NULL,
  "name" text,
  "config" jsonb DEFAULT '{}'::jsonb,
  "conditions" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "automation_actions_workflow_idx" ON "automation_actions" USING btree ("workflow_id");
CREATE INDEX "automation_actions_org_idx" ON "automation_actions" USING btree ("organization_id");

CREATE TABLE "automation_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "workflow_id" text NOT NULL REFERENCES "automation_workflows" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "trigger_type" "automation_trigger_type" NOT NULL,
  "trigger_event" jsonb DEFAULT '{}'::jsonb,
  "status" "automation_run_status" DEFAULT 'pending' NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp,
  "error" text,
  "actions_total" integer DEFAULT 0,
  "actions_succeeded" integer DEFAULT 0,
  "actions_failed" integer DEFAULT 0,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "automation_runs_workflow_idx" ON "automation_runs" USING btree ("workflow_id");
CREATE INDEX "automation_runs_org_idx" ON "automation_runs" USING btree ("organization_id");
CREATE INDEX "automation_runs_status_idx" ON "automation_runs" USING btree ("status");
CREATE INDEX "automation_runs_created_idx" ON "automation_runs" USING btree ("created_at");

CREATE TABLE "automation_run_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL REFERENCES "automation_runs" ("id") ON DELETE CASCADE,
  "workflow_id" text NOT NULL REFERENCES "automation_workflows" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "action_id" text,
  "order" integer DEFAULT 0 NOT NULL,
  "action_type" "automation_action_type",
  "status" "automation_run_status" DEFAULT 'pending' NOT NULL,
  "input" jsonb DEFAULT '{}'::jsonb,
  "output" jsonb DEFAULT '{}'::jsonb,
  "error" text,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "automation_run_logs_run_idx" ON "automation_run_logs" USING btree ("run_id");
CREATE INDEX "automation_run_logs_org_idx" ON "automation_run_logs" USING btree ("organization_id");

-- ── Approval workflows ──────────────────────────────────────────────────────
CREATE TABLE "approval_workflows" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "resource_type" text NOT NULL,
  "steps" jsonb DEFAULT '[]'::jsonb,
  "is_default" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "approval_workflows_org_idx" ON "approval_workflows" USING btree ("organization_id");
CREATE INDEX "approval_workflows_resource_idx" ON "approval_workflows" USING btree ("resource_type");

CREATE TABLE "approval_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "approval_workflow_id" text REFERENCES "approval_workflows" ("id") ON DELETE SET NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "resource_type" text NOT NULL,
  "resource_id" text,
  "title" text NOT NULL,
  "status" "approval_status" DEFAULT 'pending' NOT NULL,
  "current_step" integer DEFAULT 0 NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb,
  "decided_by" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "decided_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "approval_requests_org_idx" ON "approval_requests" USING btree ("organization_id");
CREATE INDEX "approval_requests_resource_idx" ON "approval_requests" USING btree ("resource_type", "resource_id");
CREATE INDEX "approval_requests_status_idx" ON "approval_requests" USING btree ("status");

CREATE TABLE "approval_steps" (
  "id" text PRIMARY KEY NOT NULL,
  "approval_request_id" text NOT NULL REFERENCES "approval_requests" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "step_order" integer NOT NULL,
  "label" text,
  "approver_role" text,
  "approver_user_id" text,
  "status" "approval_status" DEFAULT 'pending' NOT NULL,
  "decided_by" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "decided_at" timestamp,
  "comment" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "approval_steps_request_idx" ON "approval_steps" USING btree ("approval_request_id");
CREATE INDEX "approval_steps_org_idx" ON "approval_steps" USING btree ("organization_id");

-- ── AI forecasting / reports / documents / tasks / queries / churn ──────────
CREATE TABLE "ai_forecasts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "type" "forecast_type" NOT NULL,
  "model" text DEFAULT 'rules' NOT NULL,
  "horizon_days" integer,
  "period_start" timestamp,
  "period_end" timestamp,
  "data" jsonb DEFAULT '{}'::jsonb,
  "confidence" integer,
  "summary" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "ai_forecasts_org_idx" ON "ai_forecasts" USING btree ("organization_id");
CREATE INDEX "ai_forecasts_type_idx" ON "ai_forecasts" USING btree ("type");
CREATE INDEX "ai_forecasts_created_idx" ON "ai_forecasts" USING btree ("created_at");

CREATE TABLE "ai_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "type" "ai_report_type" NOT NULL,
  "title" text NOT NULL,
  "period_start" timestamp,
  "period_end" timestamp,
  "content" jsonb DEFAULT '{}'::jsonb,
  "narrative" text,
  "model" text DEFAULT 'rules' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "ai_reports_org_idx" ON "ai_reports" USING btree ("organization_id");
CREATE INDEX "ai_reports_type_idx" ON "ai_reports" USING btree ("type");

CREATE TABLE "ai_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "document_type" "ai_document_type" NOT NULL,
  "status" "ai_document_status" DEFAULT 'draft' NOT NULL,
  "title" text,
  "payload" jsonb DEFAULT '{}'::jsonb,
  "rationale" text,
  "created_resource_id" text,
  "created_resource_type" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "ai_documents_org_idx" ON "ai_documents" USING btree ("organization_id");
CREATE INDEX "ai_documents_type_idx" ON "ai_documents" USING btree ("document_type");
CREATE INDEX "ai_documents_status_idx" ON "ai_documents" USING btree ("status");

CREATE TABLE "ai_task_recommendations" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "priority" "task_priority" DEFAULT 'medium' NOT NULL,
  "due_date" timestamp,
  "category" text DEFAULT 'follow_up',
  "resource_type" text,
  "resource_id" text,
  "status" "ai_task_status" DEFAULT 'open' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "ai_task_recommendations_org_idx" ON "ai_task_recommendations" USING btree ("organization_id");
CREATE INDEX "ai_task_recommendations_user_idx" ON "ai_task_recommendations" USING btree ("user_id");
CREATE INDEX "ai_task_recommendations_status_idx" ON "ai_task_recommendations" USING btree ("status");

CREATE TABLE "ai_query_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "query" text NOT NULL,
  "intent" text,
  "entities" jsonb DEFAULT '{}'::jsonb,
  "plan" jsonb DEFAULT '{}'::jsonb,
  "answer" text,
  "model" text DEFAULT 'rules' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "ai_query_logs_org_idx" ON "ai_query_logs" USING btree ("organization_id");
CREATE INDEX "ai_query_logs_created_idx" ON "ai_query_logs" USING btree ("created_at");

CREATE TABLE "ai_churn_predictions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "customer_type" text NOT NULL,
  "customer_id" text NOT NULL,
  "customer_name" text,
  "risk" "churn_risk" DEFAULT 'low' NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "factors" jsonb DEFAULT '[]'::jsonb,
  "recommended_action" text,
  "predicted_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "ai_churn_predictions_org_idx" ON "ai_churn_predictions" USING btree ("organization_id");
CREATE UNIQUE INDEX "unique_org_customer_churn" ON "ai_churn_predictions" USING btree ("organization_id", "customer_type", "customer_id");
