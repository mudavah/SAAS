CREATE UNIQUE INDEX IF NOT EXISTS "unique_org_invoice_number" ON "invoices" ("organization_id", "invoice_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_reference_idx" ON "payments" ("reference");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_org_status_idx" ON "payments" ("organization_id", "status");
