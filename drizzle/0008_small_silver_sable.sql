CREATE TYPE "public"."approval_level_status" AS ENUM('pending', 'approved', 'rejected', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."grn_status" AS ENUM('draft', 'completed');--> statement-breakpoint
CREATE TYPE "public"."procurement_po_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'ordered', 'partially_received', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."procurement_request_status" AS ENUM('draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."purchase_invoice_status" AS ENUM('received', 'partially_paid', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('open', 'dismissed', 'applied');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('draft', 'sent', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."supplier_payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."supplier_quotation_status" AS ENUM('received', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."supplier_return_status" AS ENUM('draft', 'completed', 'cancelled');--> statement-breakpoint
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
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.request.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.request.approved';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.request.rejected';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.rfq.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.rfq.sent';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.quotation.received';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.quotation.accepted';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.po.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.po.submitted';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.po.approved';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.po.rejected';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.po.ordered';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.po.received';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.grn.received';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.return.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.invoice.received';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.payment.made';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.budget.exceeded';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'procurement.recommendation.created';--> statement-breakpoint
CREATE TABLE "procurement_ai_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"product_id" text,
	"recommended_supplier_id" text,
	"recommended_qty" numeric(12, 2),
	"estimated_cost" numeric(14, 2),
	"status" "recommendation_status" DEFAULT 'open' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"level" integer NOT NULL,
	"required_role_type" "role_type" NOT NULL,
	"status" "approval_level_status" DEFAULT 'pending' NOT NULL,
	"approver_id" text,
	"decided_at" timestamp,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"period" "budget_period" DEFAULT 'monthly' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"spent" numeric(14, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_grn_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"grn_id" text NOT NULL,
	"po_item_id" text NOT NULL,
	"product_id" text,
	"warehouse_id" text NOT NULL,
	"quantity_received" numeric(12, 2) NOT NULL,
	"quantity_damaged" numeric(12, 2) DEFAULT '0',
	"unit_cost" numeric(12, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "procurement_grns" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"grn_number" text NOT NULL,
	"purchase_order_id" text NOT NULL,
	"supplier_id" text,
	"received_date" timestamp NOT NULL,
	"status" "grn_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_purchase_invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"purchase_invoice_id" text NOT NULL,
	"po_item_id" text,
	"product_id" text,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16',
	"tax_amount" numeric(14, 2) DEFAULT '0',
	"line_total" numeric(14, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "procurement_purchase_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"supplier_id" text NOT NULL,
	"purchase_order_id" text,
	"grn_id" text,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0',
	"tax_rate" numeric(5, 2) DEFAULT '16',
	"tax_amount" numeric(14, 2) DEFAULT '0',
	"total" numeric(14, 2) DEFAULT '0',
	"amount_paid" numeric(14, 2) DEFAULT '0',
	"status" "purchase_invoice_status" DEFAULT 'received' NOT NULL,
	"journal_entry_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_purchase_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"purchase_order_id" text NOT NULL,
	"product_id" text,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" text DEFAULT 'pcs',
	"unit_cost" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16',
	"tax_amount" numeric(14, 2) DEFAULT '0',
	"line_total" numeric(14, 2) DEFAULT '0',
	"received_quantity" numeric(12, 2) DEFAULT '0',
	"warehouse_id" text
);
--> statement-breakpoint
CREATE TABLE "procurement_purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"po_number" text NOT NULL,
	"request_id" text,
	"rfq_id" text,
	"supplier_id" text,
	"status" "procurement_po_status" DEFAULT 'draft' NOT NULL,
	"order_date" timestamp NOT NULL,
	"expected_date" timestamp,
	"currency" text DEFAULT 'KES' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0',
	"tax_rate" numeric(5, 2) DEFAULT '16',
	"tax_amount" numeric(14, 2) DEFAULT '0',
	"total" numeric(14, 2) DEFAULT '0',
	"notes" text,
	"approval_status" "approval_level_status" DEFAULT 'pending' NOT NULL,
	"current_approval_level" integer DEFAULT 0,
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"budget_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_purchase_request_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" text NOT NULL,
	"product_id" text,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" text DEFAULT 'pcs',
	"est_unit_cost" numeric(12, 2) DEFAULT '0',
	"line_total" numeric(14, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "procurement_purchase_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"request_number" text NOT NULL,
	"title" text NOT NULL,
	"department" text,
	"requester_id" text,
	"status" "procurement_request_status" DEFAULT 'draft' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"notes" text,
	"requested_date" timestamp NOT NULL,
	"needed_by" timestamp,
	"currency" text DEFAULT 'KES' NOT NULL,
	"total_estimated" numeric(14, 2) DEFAULT '0',
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_rfq_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"rfq_id" text NOT NULL,
	"product_id" text,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" text DEFAULT 'pcs'
);
--> statement-breakpoint
CREATE TABLE "procurement_rfq_suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"rfq_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_rfqs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"rfq_number" text NOT NULL,
	"title" text NOT NULL,
	"status" "rfq_status" DEFAULT 'draft' NOT NULL,
	"issued_date" timestamp,
	"valid_until" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_supplier_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"payment_number" text NOT NULL,
	"supplier_id" text NOT NULL,
	"purchase_invoice_id" text,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "supplier_payment_status" DEFAULT 'pending' NOT NULL,
	"payment_date" timestamp NOT NULL,
	"reference" text,
	"journal_entry_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_supplier_quotation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"quotation_id" text NOT NULL,
	"rfq_item_id" text,
	"product_id" text,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" text DEFAULT 'pcs',
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "procurement_supplier_quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"rfq_id" text,
	"supplier_id" text NOT NULL,
	"quotation_number" text NOT NULL,
	"status" "supplier_quotation_status" DEFAULT 'received' NOT NULL,
	"received_date" timestamp NOT NULL,
	"valid_until" timestamp,
	"currency" text DEFAULT 'KES' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0',
	"tax_rate" numeric(5, 2) DEFAULT '16',
	"tax_amount" numeric(14, 2) DEFAULT '0',
	"total" numeric(14, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_supplier_return_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"return_id" text NOT NULL,
	"grn_item_id" text,
	"product_id" text,
	"warehouse_id" text,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0',
	"line_total" numeric(14, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "procurement_supplier_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"return_number" text NOT NULL,
	"grn_id" text,
	"purchase_order_id" text,
	"supplier_id" text,
	"return_date" timestamp NOT NULL,
	"status" "supplier_return_status" DEFAULT 'draft' NOT NULL,
	"reason" text,
	"total" numeric(14, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "country" text DEFAULT 'Kenya';--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "lead_time_days" integer;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "preferred_currency" text DEFAULT 'KES';--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "bank_account" text;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "inventory_suppliers" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "procurement_ai_recommendations" ADD CONSTRAINT "procurement_ai_recommendations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_ai_recommendations" ADD CONSTRAINT "procurement_ai_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_ai_recommendations" ADD CONSTRAINT "procurement_ai_recommendations_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_ai_recommendations" ADD CONSTRAINT "procurement_ai_recommendations_recommended_supplier_id_inventory_suppliers_id_fk" FOREIGN KEY ("recommended_supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD CONSTRAINT "procurement_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD CONSTRAINT "procurement_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_budgets" ADD CONSTRAINT "procurement_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_budgets" ADD CONSTRAINT "procurement_budgets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grn_items" ADD CONSTRAINT "procurement_grn_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grn_items" ADD CONSTRAINT "procurement_grn_items_grn_id_procurement_grns_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."procurement_grns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grn_items" ADD CONSTRAINT "procurement_grn_items_po_item_id_procurement_purchase_order_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."procurement_purchase_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grn_items" ADD CONSTRAINT "procurement_grn_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grn_items" ADD CONSTRAINT "procurement_grn_items_warehouse_id_inventory_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inventory_warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grns" ADD CONSTRAINT "procurement_grns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grns" ADD CONSTRAINT "procurement_grns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grns" ADD CONSTRAINT "procurement_grns_purchase_order_id_procurement_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."procurement_purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_grns" ADD CONSTRAINT "procurement_grns_supplier_id_inventory_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoice_items" ADD CONSTRAINT "procurement_purchase_invoice_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoice_items" ADD CONSTRAINT "procurement_purchase_invoice_items_purchase_invoice_id_procurement_purchase_invoices_id_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "public"."procurement_purchase_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoice_items" ADD CONSTRAINT "procurement_purchase_invoice_items_po_item_id_procurement_purchase_order_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."procurement_purchase_order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoice_items" ADD CONSTRAINT "procurement_purchase_invoice_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoices" ADD CONSTRAINT "procurement_purchase_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoices" ADD CONSTRAINT "procurement_purchase_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoices" ADD CONSTRAINT "procurement_purchase_invoices_supplier_id_inventory_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoices" ADD CONSTRAINT "procurement_purchase_invoices_purchase_order_id_procurement_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."procurement_purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoices" ADD CONSTRAINT "procurement_purchase_invoices_grn_id_procurement_grns_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."procurement_grns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_invoices" ADD CONSTRAINT "procurement_purchase_invoices_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_order_items" ADD CONSTRAINT "procurement_purchase_order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_order_items" ADD CONSTRAINT "procurement_purchase_order_items_purchase_order_id_procurement_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."procurement_purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_order_items" ADD CONSTRAINT "procurement_purchase_order_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_order_items" ADD CONSTRAINT "procurement_purchase_order_items_warehouse_id_inventory_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inventory_warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_request_id_procurement_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."procurement_purchase_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_rfq_id_procurement_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."procurement_rfqs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_supplier_id_inventory_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_budget_id_procurement_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."procurement_budgets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_request_items" ADD CONSTRAINT "procurement_purchase_request_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_request_items" ADD CONSTRAINT "procurement_purchase_request_items_request_id_procurement_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."procurement_purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_request_items" ADD CONSTRAINT "procurement_purchase_request_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_requests" ADD CONSTRAINT "procurement_purchase_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_requests" ADD CONSTRAINT "procurement_purchase_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_requests" ADD CONSTRAINT "procurement_purchase_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_purchase_requests" ADD CONSTRAINT "procurement_purchase_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_rfq_items" ADD CONSTRAINT "procurement_rfq_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_rfq_items" ADD CONSTRAINT "procurement_rfq_items_rfq_id_procurement_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."procurement_rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_rfq_items" ADD CONSTRAINT "procurement_rfq_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_rfq_suppliers" ADD CONSTRAINT "procurement_rfq_suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_rfq_suppliers" ADD CONSTRAINT "procurement_rfq_suppliers_rfq_id_procurement_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."procurement_rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_rfq_suppliers" ADD CONSTRAINT "procurement_rfq_suppliers_supplier_id_inventory_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_rfqs" ADD CONSTRAINT "procurement_rfqs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_rfqs" ADD CONSTRAINT "procurement_rfqs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_payments" ADD CONSTRAINT "procurement_supplier_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_payments" ADD CONSTRAINT "procurement_supplier_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_payments" ADD CONSTRAINT "procurement_supplier_payments_supplier_id_inventory_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_payments" ADD CONSTRAINT "procurement_supplier_payments_purchase_invoice_id_procurement_purchase_invoices_id_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "public"."procurement_purchase_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_payments" ADD CONSTRAINT "procurement_supplier_payments_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_quotation_items" ADD CONSTRAINT "procurement_supplier_quotation_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_quotation_items" ADD CONSTRAINT "procurement_supplier_quotation_items_quotation_id_procurement_supplier_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."procurement_supplier_quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_quotation_items" ADD CONSTRAINT "procurement_supplier_quotation_items_rfq_item_id_procurement_rfq_items_id_fk" FOREIGN KEY ("rfq_item_id") REFERENCES "public"."procurement_rfq_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_quotation_items" ADD CONSTRAINT "procurement_supplier_quotation_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_quotations" ADD CONSTRAINT "procurement_supplier_quotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_quotations" ADD CONSTRAINT "procurement_supplier_quotations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_quotations" ADD CONSTRAINT "procurement_supplier_quotations_rfq_id_procurement_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."procurement_rfqs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_quotations" ADD CONSTRAINT "procurement_supplier_quotations_supplier_id_inventory_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_return_items" ADD CONSTRAINT "procurement_supplier_return_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_return_items" ADD CONSTRAINT "procurement_supplier_return_items_return_id_procurement_supplier_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."procurement_supplier_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_return_items" ADD CONSTRAINT "procurement_supplier_return_items_grn_item_id_procurement_grn_items_id_fk" FOREIGN KEY ("grn_item_id") REFERENCES "public"."procurement_grn_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_return_items" ADD CONSTRAINT "procurement_supplier_return_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_return_items" ADD CONSTRAINT "procurement_supplier_return_items_warehouse_id_inventory_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inventory_warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_returns" ADD CONSTRAINT "procurement_supplier_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_returns" ADD CONSTRAINT "procurement_supplier_returns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_returns" ADD CONSTRAINT "procurement_supplier_returns_grn_id_procurement_grns_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."procurement_grns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_returns" ADD CONSTRAINT "procurement_supplier_returns_purchase_order_id_procurement_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."procurement_purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_supplier_returns" ADD CONSTRAINT "procurement_supplier_returns_supplier_id_inventory_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "par_org_idx" ON "procurement_ai_recommendations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "par_type_idx" ON "procurement_ai_recommendations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "par_status_idx" ON "procurement_ai_recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "par_product_idx" ON "procurement_ai_recommendations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pa_org_idx" ON "procurement_approvals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pa_resource_idx" ON "procurement_approvals" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "pa_status_idx" ON "procurement_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pb_org_idx" ON "procurement_budgets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pb_user_idx" ON "procurement_budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pb_period_idx" ON "procurement_budgets" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "pgrni_org_idx" ON "procurement_grn_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pgrni_grn_idx" ON "procurement_grn_items" USING btree ("grn_id");--> statement-breakpoint
CREATE INDEX "pgrni_po_item_idx" ON "procurement_grn_items" USING btree ("po_item_id");--> statement-breakpoint
CREATE INDEX "pgrn_org_idx" ON "procurement_grns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pgrn_user_idx" ON "procurement_grns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pgrn_po_idx" ON "procurement_grns" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_grn_number" ON "procurement_grns" USING btree ("organization_id","grn_number");--> statement-breakpoint
CREATE INDEX "pgrn_status_idx" ON "procurement_grns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ppii_org_idx" ON "procurement_purchase_invoice_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ppii_invoice_idx" ON "procurement_purchase_invoice_items" USING btree ("purchase_invoice_id");--> statement-breakpoint
CREATE INDEX "ppi_org_idx" ON "procurement_purchase_invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ppi_user_idx" ON "procurement_purchase_invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ppi_supplier_idx" ON "procurement_purchase_invoices" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "ppi_po_idx" ON "procurement_purchase_invoices" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_ppi_number" ON "procurement_purchase_invoices" USING btree ("organization_id","invoice_number");--> statement-breakpoint
CREATE INDEX "ppi_status_idx" ON "procurement_purchase_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ppoi_org_idx" ON "procurement_purchase_order_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ppoi_po_idx" ON "procurement_purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "ppoi_product_idx" ON "procurement_purchase_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "ppo_org_idx" ON "procurement_purchase_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ppo_user_idx" ON "procurement_purchase_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ppo_supplier_idx" ON "procurement_purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "ppo_request_idx" ON "procurement_purchase_orders" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_ppo_number" ON "procurement_purchase_orders" USING btree ("organization_id","po_number");--> statement-breakpoint
CREATE INDEX "ppo_status_idx" ON "procurement_purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ppri_org_idx" ON "procurement_purchase_request_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ppri_request_idx" ON "procurement_purchase_request_items" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "ppr_org_idx" ON "procurement_purchase_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ppr_user_idx" ON "procurement_purchase_requests" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_ppr_number" ON "procurement_purchase_requests" USING btree ("organization_id","request_number");--> statement-breakpoint
CREATE INDEX "ppr_status_idx" ON "procurement_purchase_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prfqi_org_idx" ON "procurement_rfq_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prfqi_rfq_idx" ON "procurement_rfq_items" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "prfqs_org_idx" ON "procurement_rfq_suppliers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prfqs_rfq_idx" ON "procurement_rfq_suppliers" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "prfqs_supplier_idx" ON "procurement_rfq_suppliers" USING btree ("supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_rfq_supplier" ON "procurement_rfq_suppliers" USING btree ("rfq_id","supplier_id");--> statement-breakpoint
CREATE INDEX "prfq_org_idx" ON "procurement_rfqs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prfq_user_idx" ON "procurement_rfqs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_rfq_number" ON "procurement_rfqs" USING btree ("organization_id","rfq_number");--> statement-breakpoint
CREATE INDEX "prfq_status_idx" ON "procurement_rfqs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "psp_org_idx" ON "procurement_supplier_payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "psp_user_idx" ON "procurement_supplier_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "psp_supplier_idx" ON "procurement_supplier_payments" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "psp_invoice_idx" ON "procurement_supplier_payments" USING btree ("purchase_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_psp_number" ON "procurement_supplier_payments" USING btree ("organization_id","payment_number");--> statement-breakpoint
CREATE INDEX "psp_status_idx" ON "procurement_supplier_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "psqi_org_idx" ON "procurement_supplier_quotation_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "psqi_quotation_idx" ON "procurement_supplier_quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "psq_org_idx" ON "procurement_supplier_quotations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "psq_user_idx" ON "procurement_supplier_quotations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "psq_rfq_idx" ON "procurement_supplier_quotations" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "psq_supplier_idx" ON "procurement_supplier_quotations" USING btree ("supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_psq_number" ON "procurement_supplier_quotations" USING btree ("organization_id","quotation_number");--> statement-breakpoint
CREATE INDEX "psq_status_idx" ON "procurement_supplier_quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "psri_org_idx" ON "procurement_supplier_return_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "psri_return_idx" ON "procurement_supplier_return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "psr_org_idx" ON "procurement_supplier_returns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "psr_user_idx" ON "procurement_supplier_returns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "psr_grn_idx" ON "procurement_supplier_returns" USING btree ("grn_id");--> statement-breakpoint
CREATE INDEX "psr_supplier_idx" ON "procurement_supplier_returns" USING btree ("supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_sr_number" ON "procurement_supplier_returns" USING btree ("organization_id","return_number");--> statement-breakpoint
CREATE INDEX "psr_status_idx" ON "procurement_supplier_returns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_suppliers_org_idx" ON "inventory_suppliers" USING btree ("organization_id");