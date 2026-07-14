CREATE TYPE "public"."pos_order_status" AS ENUM('draft', 'completed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."pos_payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."pos_return_reason" AS ENUM('damaged', 'wrong_item', 'customer_request', 'expired', 'other');--> statement-breakpoint
CREATE TYPE "public"."pos_session_status" AS ENUM('open', 'closed', 'suspended');--> statement-breakpoint
ALTER TYPE "public"."audit_category" ADD VALUE 'pos';--> statement-breakpoint
ALTER TYPE "public"."notification_category" ADD VALUE 'pos';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'pos.sale.created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'pos.sale.completed';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'pos.sale.cancelled';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'pos.sale.refunded';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'pos.shift.opened';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'pos.shift.closed';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'pos.payment.received';--> statement-breakpoint
CREATE TABLE "pos_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" text NOT NULL,
	"warehouse_id" text,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_order_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"phone_number" text,
	"notes" text,
	"status" "pos_payment_status" DEFAULT 'pending' NOT NULL,
	"transaction_id" text,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"session_id" text,
	"client_id" text,
	"warehouse_id" text,
	"order_number" text NOT NULL,
	"status" "pos_order_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"change_due" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"payment_status" "pos_payment_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"invoice_id" text,
	"etims_status" "etims_status" DEFAULT 'pending',
	"etims_invoice_number" text,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_return_items" (
	"id" text PRIMARY KEY NOT NULL,
	"return_id" text NOT NULL,
	"order_item_id" text,
	"product_id" text NOT NULL,
	"warehouse_id" text,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"return_number" text NOT NULL,
	"reason" "pos_return_reason" NOT NULL,
	"description" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"refund_method" text NOT NULL,
	"refund_status" "pos_payment_status" DEFAULT 'pending' NOT NULL,
	"refund_reference" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"terminal_name" text DEFAULT 'Default Terminal',
	"status" "pos_session_status" DEFAULT 'open' NOT NULL,
	"opening_float" numeric(12, 2) DEFAULT '0' NOT NULL,
	"closing_float" numeric(12, 2),
	"cash_deposited" numeric(12, 2),
	"notes" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_order_id_pos_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pos_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_warehouse_id_inventory_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inventory_warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_payments" ADD CONSTRAINT "pos_order_payments_order_id_pos_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pos_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_payments" ADD CONSTRAINT "pos_order_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_session_id_pos_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_warehouse_id_inventory_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inventory_warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_return_id_pos_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."pos_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_order_item_id_pos_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."pos_order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_warehouse_id_inventory_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inventory_warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_order_id_pos_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pos_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pos_order_items_org_idx" ON "pos_order_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pos_order_items_order_idx" ON "pos_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "pos_order_items_product_idx" ON "pos_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pos_order_payments_org_idx" ON "pos_order_payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pos_order_payments_order_idx" ON "pos_order_payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "pos_order_payments_status_idx" ON "pos_order_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pos_orders_org_idx" ON "pos_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pos_orders_user_idx" ON "pos_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pos_orders_session_idx" ON "pos_orders" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_orders_order_number_idx" ON "pos_orders" USING btree ("order_number","organization_id");--> statement-breakpoint
CREATE INDEX "pos_orders_status_idx" ON "pos_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pos_orders_created_idx" ON "pos_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pos_return_items_return_idx" ON "pos_return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "pos_return_items_product_idx" ON "pos_return_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pos_returns_org_idx" ON "pos_returns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pos_returns_order_idx" ON "pos_returns" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "pos_returns_user_idx" ON "pos_returns" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_returns_return_number_idx" ON "pos_returns" USING btree ("return_number","organization_id");--> statement-breakpoint
CREATE INDEX "pos_sessions_org_idx" ON "pos_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pos_sessions_user_idx" ON "pos_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pos_sessions_status_idx" ON "pos_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pos_sessions_created_idx" ON "pos_sessions" USING btree ("created_at");