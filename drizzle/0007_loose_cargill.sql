CREATE TYPE "public"."activity_status" AS ENUM('planned', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('call', 'meeting', 'email', 'task', 'note', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'event', 'partner', 'advertisement', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."quotation_approval_status" AS ENUM('not_required', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');--> statement-breakpoint
ALTER TYPE "public"."audit_category" ADD VALUE 'crm';--> statement-breakpoint
ALTER TYPE "public"."notification_category" ADD VALUE 'crm';--> statement-breakpoint
ALTER TYPE "public"."permission_category" ADD VALUE 'crm';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.lead.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.lead.updated';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.lead.converted';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.company.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.company.updated';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.contact.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.deal.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.deal.updated';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.deal.won';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.deal.lost';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.quotation.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.quotation.converted';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'crm.activity.completed';--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"status" "activity_status" DEFAULT 'planned' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"remind_at" timestamp,
	"assigned_to" text,
	"lead_id" text,
	"contact_id" text,
	"company_id" text,
	"deal_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_ai_insights" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"website" text,
	"industry" text,
	"size" text,
	"description" text,
	"address" text,
	"city" text,
	"country" text DEFAULT 'Kenya',
	"tax_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text,
	"job_title" text,
	"department" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"company_id" text,
	"contact_id" text,
	"lead_id" text,
	"stage_id" text,
	"amount" numeric(12, 2) DEFAULT '0',
	"currency" text DEFAULT 'KES' NOT NULL,
	"probability" integer,
	"expected_close_date" timestamp,
	"status" "deal_status" DEFAULT 'open' NOT NULL,
	"actual_close_date" timestamp,
	"lost_reason" text,
	"owner_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text,
	"company" text,
	"source" "lead_source" DEFAULT 'other' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"score_reasons" jsonb DEFAULT '[]'::jsonb,
	"estimated_value" numeric(12, 2) DEFAULT '0',
	"qualification_notes" text,
	"assigned_to" text,
	"converted_at" timestamp,
	"converted_company_id" text,
	"converted_contact_id" text,
	"converted_deal_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_pipeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"probability" integer DEFAULT 0,
	"color" text DEFAULT '#16a34a',
	"is_default" boolean DEFAULT false NOT NULL,
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_quotation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"quotation_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "crm_quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"quotation_number" text NOT NULL,
	"company_id" text,
	"contact_id" text,
	"lead_id" text,
	"deal_id" text,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_quotation_id" text,
	"valid_until" timestamp,
	"currency" text DEFAULT 'KES' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"tax_rate" numeric(5, 2) DEFAULT '16',
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"terms" text,
	"approval_status" "quotation_approval_status" DEFAULT 'not_required' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"converted_invoice_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_ai_insights" ADD CONSTRAINT "crm_ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_ai_insights" ADD CONSTRAINT "crm_ai_insights_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_converted_company_id_crm_companies_id_fk" FOREIGN KEY ("converted_company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_converted_contact_id_crm_contacts_id_fk" FOREIGN KEY ("converted_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_converted_deal_id_crm_deals_id_fk" FOREIGN KEY ("converted_deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_quotation_id_crm_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."crm_quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_parent_quotation_id_crm_quotations_id_fk" FOREIGN KEY ("parent_quotation_id") REFERENCES "public"."crm_quotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_activities_org_idx" ON "crm_activities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_activities_user_idx" ON "crm_activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_activities_type_idx" ON "crm_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "crm_activities_due_idx" ON "crm_activities" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "crm_activities_remind_idx" ON "crm_activities" USING btree ("remind_at");--> statement-breakpoint
CREATE INDEX "crm_ai_insights_org_idx" ON "crm_ai_insights" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_ai_insights_user_idx" ON "crm_ai_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_ai_insights_type_idx" ON "crm_ai_insights" USING btree ("type");--> statement-breakpoint
CREATE INDEX "crm_companies_org_idx" ON "crm_companies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_companies_user_idx" ON "crm_companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_org_idx" ON "crm_contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_user_idx" ON "crm_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_company_idx" ON "crm_contacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "crm_deals_org_idx" ON "crm_deals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_deals_user_idx" ON "crm_deals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_deals_stage_idx" ON "crm_deals" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "crm_deals_status_idx" ON "crm_deals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crm_deals_owner_idx" ON "crm_deals" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "crm_deals_company_idx" ON "crm_deals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "crm_leads_org_idx" ON "crm_leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_leads_user_idx" ON "crm_leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_leads_status_idx" ON "crm_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crm_leads_score_idx" ON "crm_leads" USING btree ("score");--> statement-breakpoint
CREATE INDEX "crm_leads_assigned_idx" ON "crm_leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "crm_pipeline_stages_org_idx" ON "crm_pipeline_stages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_pipeline_stages_order_idx" ON "crm_pipeline_stages" USING btree ("organization_id","order");--> statement-breakpoint
CREATE INDEX "crm_quotation_items_org_idx" ON "crm_quotation_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_quotation_items_quotation_idx" ON "crm_quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "crm_quotations_org_idx" ON "crm_quotations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_quotations_user_idx" ON "crm_quotations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_quotation_number" ON "crm_quotations" USING btree ("organization_id","quotation_number");--> statement-breakpoint
CREATE INDEX "crm_quotations_status_idx" ON "crm_quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crm_quotations_company_idx" ON "crm_quotations" USING btree ("company_id");