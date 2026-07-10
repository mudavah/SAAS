CREATE UNIQUE INDEX "unique_org_account_code" ON "chart_of_accounts" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "chart_of_accounts_org_idx" ON "chart_of_accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clients_org_idx" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clients_user_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expenses_org_idx" ON "expenses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "expenses_user_idx" ON "expenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inventory_products_org_idx" ON "inventory_products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_products_user_idx" ON "inventory_products" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_product_warehouse" ON "inventory_stock" USING btree ("product_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "inventory_stock_org_idx" ON "inventory_stock" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_stock_movements_org_idx" ON "inventory_stock_movements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_stock_movements_product_idx" ON "inventory_stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "invoices_org_status_idx" ON "invoices" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "org_members_org_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_members_email_idx" ON "organization_members" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_provider" ON "payment_provider_configs" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payments_reference_idx" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payments_org_status_idx" ON "payments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "tasks_org_idx" ON "tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tasks_user_idx" ON "tasks" USING btree ("user_id");