CREATE TYPE "public"."ai_conversation_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."compliance_alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."compliance_health_score" AS ENUM('excellent', 'good', 'fair', 'poor');--> statement-breakpoint
CREATE TYPE "public"."onboarding_step_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."tax_report_type" AS ENUM('monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."timeline_event_type" AS ENUM('invoice.created', 'invoice.updated', 'invoice.deleted', 'invoice.sent', 'invoice.paid', 'payment.received', 'payment.failed', 'payment.refunded', 'client.created', 'client.updated', 'expense.created', 'expense.updated', 'inventory.stock_adjusted', 'inventory.product_created', 'journal.posted', 'journal.reversed', 'subscription.created', 'subscription.updated', 'subscription.cancelled', 'notification.created', 'audit.logged', 'compliance.submitted', 'compliance.validated', 'compliance.failed', 'ai.insight_generated', 'team.member_invited', 'team.member_joined', 'team.member_removed', 'onboarding.step_completed');--> statement-breakpoint
CREATE TABLE "ai_business_health" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"score" integer NOT NULL,
	"cash_flow_score" integer,
	"revenue_score" integer,
	"expense_score" integer,
	"client_score" integer,
	"inventory_score" integer,
	"compliance_score" integer,
	"insights" jsonb DEFAULT '{}'::jsonb,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"title" text,
	"status" "ai_conversation_status" DEFAULT 'active' NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tokens_used" integer,
	"model" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_timeline" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"event_type" timeline_event_type NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"resource_type" text,
	"resource_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"severity" "compliance_alert_severity" NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"auto_submit" boolean DEFAULT false NOT NULL,
	"notify_before_deadline" boolean DEFAULT true NOT NULL,
	"notify_on_failure" boolean DEFAULT true NOT NULL,
	"retry_failed_submissions" boolean DEFAULT true NOT NULL,
	"max_retries" integer DEFAULT 3,
	"retry_delay_minutes" integer DEFAULT 30,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "onboarding_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"step_id" text NOT NULL,
	"status" "onboarding_step_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"route" text NOT NULL,
	"order" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_steps_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "onboarding_tips" (
	"id" text PRIMARY KEY NOT NULL,
	"step_id" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"position" text DEFAULT 'bottom' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_calendar" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp NOT NULL,
	"type" text NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"type" "tax_report_type" NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_sales" numeric(12, 2) DEFAULT '0',
	"total_tax" numeric(12, 2) DEFAULT '0',
	"invoice_count" integer DEFAULT 0,
	"status" text DEFAULT 'draft' NOT NULL,
	"file_url" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_business_health" ADD CONSTRAINT "ai_business_health_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_business_health" ADD CONSTRAINT "ai_business_health_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_timeline" ADD CONSTRAINT "business_timeline_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_timeline" ADD CONSTRAINT "business_timeline_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_alerts" ADD CONSTRAINT "compliance_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_alerts" ADD CONSTRAINT "compliance_alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_settings" ADD CONSTRAINT "compliance_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_settings" ADD CONSTRAINT "compliance_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_step_id_onboarding_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."onboarding_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_tips" ADD CONSTRAINT "onboarding_tips_step_id_onboarding_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."onboarding_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_calendar" ADD CONSTRAINT "tax_calendar_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_reports" ADD CONSTRAINT "tax_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_reports" ADD CONSTRAINT "tax_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_business_health_org_idx" ON "ai_business_health" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_business_health_user_idx" ON "ai_business_health" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_org_idx" ON "ai_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_user_idx" ON "ai_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_insights_org_idx" ON "ai_insights" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_insights_user_idx" ON "ai_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_messages_org_idx" ON "ai_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "business_timeline_org_idx" ON "business_timeline" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "business_timeline_user_idx" ON "business_timeline" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_timeline_event_type_idx" ON "business_timeline" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "business_timeline_created_idx" ON "business_timeline" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "compliance_alerts_org_idx" ON "compliance_alerts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "compliance_alerts_user_idx" ON "compliance_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_step" ON "onboarding_progress" USING btree ("user_id","step_id");--> statement-breakpoint
CREATE INDEX "onboarding_progress_org_idx" ON "onboarding_progress" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "onboarding_tips_step_idx" ON "onboarding_tips" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "tax_calendar_org_idx" ON "tax_calendar" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tax_reports_org_idx" ON "tax_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tax_reports_user_idx" ON "tax_reports" USING btree ("user_id");