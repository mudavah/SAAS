-- Epic 9 — Enterprise Analytics (incremental migration)
-- Creates only NEW enums / tables / indexes for the analytics module.
-- Safe to apply on top of 0014_ai_automation_platform.

-- ── New enums ───────────────────────────────────────────────────────────────
CREATE TYPE "analytics_widget_type" AS ENUM ('kpi_card', 'line_chart', 'bar_chart', 'pie_chart', 'table', 'gauge', 'progress', 'heatmap', 'ranking');
CREATE TYPE "analytics_period" AS ENUM ('today', 'week', 'month', 'quarter', 'year', 'custom');
CREATE TYPE "report_format" AS ENUM ('pdf', 'excel', 'csv', 'json');
CREATE TYPE "schedule_frequency" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE "schedule_status" AS ENUM ('active', 'paused', 'completed', 'failed');
CREATE TYPE "report_status" AS ENUM ('pending', 'generating', 'completed', 'failed');
CREATE TYPE "analytics_insight_type" AS ENUM ('trend', 'anomaly', 'forecast', 'recommendation', 'alert');

-- Extend the existing timeline event enum with analytics events.
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.dashboard.viewed';
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.report.generated';
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.report.exported';
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.snapshot.computed';
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.insight.generated';

-- ── Analytics Dashboards ─────────────────────────────────────────────────────
CREATE TABLE "analytics_dashboards" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "layout" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_shared" boolean DEFAULT false NOT NULL,
  "shared_with_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "analytics_dashboards_org_idx" ON "analytics_dashboards" USING btree ("organization_id");
CREATE INDEX "analytics_dashboards_user_idx" ON "analytics_dashboards" USING btree ("user_id");
CREATE INDEX "analytics_dashboards_default_idx" ON "analytics_dashboards" USING btree ("is_default");

-- ── Analytics Widgets ────────────────────────────────────────────────────────
CREATE TABLE "analytics_widgets" (
  "id" text PRIMARY KEY NOT NULL,
  "dashboard_id" text NOT NULL REFERENCES "analytics_dashboards" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" "analytics_widget_type" NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "data_source" text NOT NULL,
  "position" jsonb DEFAULT '{"x":0,"y":0,"w":4,"h":4}'::jsonb NOT NULL,
  "refresh_interval" integer DEFAULT 300 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "analytics_widgets_org_idx" ON "analytics_widgets" USING btree ("organization_id");
CREATE INDEX "analytics_widgets_dashboard_idx" ON "analytics_widgets" USING btree ("dashboard_id");
CREATE INDEX "analytics_widgets_type_idx" ON "analytics_widgets" USING btree ("type");

-- ── Analytics Snapshots ─────────────────────────────────────────────────────
CREATE TABLE "analytics_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "widget_id" text REFERENCES "analytics_widgets" ("id") ON DELETE CASCADE,
  "dashboard_id" text REFERENCES "analytics_dashboards" ("id") ON DELETE CASCADE,
  "period" "analytics_period" NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "computed_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "analytics_snapshots_org_idx" ON "analytics_snapshots" USING btree ("organization_id");
CREATE INDEX "analytics_snapshots_widget_idx" ON "analytics_snapshots" USING btree ("widget_id");
CREATE INDEX "analytics_snapshots_dashboard_idx" ON "analytics_snapshots" USING btree ("dashboard_id");
CREATE INDEX "analytics_snapshots_period_idx" ON "analytics_snapshots" USING btree ("period");
CREATE INDEX "analytics_snapshots_created_idx" ON "analytics_snapshots" USING btree ("computed_at");

-- ── Scheduled Reports ───────────────────────────────────────────────────────
CREATE TABLE "analytics_scheduled_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "report_type" text NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "format" "report_format" DEFAULT 'pdf' NOT NULL,
  "frequency" "schedule_frequency" NOT NULL,
  "status" "schedule_status" DEFAULT 'active' NOT NULL,
  "recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "last_run_at" timestamp,
  "next_run_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "analytics_scheduled_reports_org_idx" ON "analytics_scheduled_reports" USING btree ("organization_id");
CREATE INDEX "analytics_scheduled_reports_user_idx" ON "analytics_scheduled_reports" USING btree ("user_id");
CREATE INDEX "analytics_scheduled_reports_status_idx" ON "analytics_scheduled_reports" USING btree ("status");
CREATE INDEX "analytics_scheduled_reports_next_run_idx" ON "analytics_scheduled_reports" USING btree ("next_run_at");

-- ── Report Runs ─────────────────────────────────────────────────────────────
CREATE TABLE "analytics_report_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "scheduled_report_id" text REFERENCES "analytics_scheduled_reports" ("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "report_type" text NOT NULL,
  "format" "report_format" NOT NULL,
  "status" "report_status" DEFAULT 'pending' NOT NULL,
  "period_start" timestamp,
  "period_end" timestamp,
  "parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "result_url" text,
  "error" text,
  "file_size" integer,
  "row_count" integer,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "analytics_report_runs_org_idx" ON "analytics_report_runs" USING btree ("organization_id");
CREATE INDEX "analytics_report_runs_scheduled_idx" ON "analytics_report_runs" USING btree ("scheduled_report_id");
CREATE INDEX "analytics_report_runs_status_idx" ON "analytics_report_runs" USING btree ("status");
CREATE INDEX "analytics_report_runs_created_idx" ON "analytics_report_runs" USING btree ("created_at");

-- ── AI Insights ─────────────────────────────────────────────────────────────
CREATE TABLE "analytics_insights" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
  "type" "analytics_insight_type" NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "severity" text DEFAULT 'info' NOT NULL,
  "confidence" integer DEFAULT 100 NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "related_entity_type" text,
  "related_entity_id" text,
  "is_read" boolean DEFAULT false NOT NULL,
  "is_dismissed" boolean DEFAULT false NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "analytics_insights_org_idx" ON "analytics_insights" USING btree ("organization_id");
CREATE INDEX "analytics_insights_user_idx" ON "analytics_insights" USING btree ("user_id");
CREATE INDEX "analytics_insights_type_idx" ON "analytics_insights" USING btree ("type");
CREATE INDEX "analytics_insights_read_idx" ON "analytics_insights" USING btree ("is_read");
CREATE INDEX "analytics_insights_created_idx" ON "analytics_insights" USING btree ("created_at");
