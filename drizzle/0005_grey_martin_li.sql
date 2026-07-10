ALTER TABLE "payment_webhook_logs" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_logs_dedupe_key_idx" ON "payment_webhook_logs" USING btree ("dedupe_key");