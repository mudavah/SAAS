-- KaziFlow — production database optimization (Database Optimization)
-- ------------------------------------------------------------------------------
-- Idempotent, review-before-applying index suggestions that complement the
-- per-tenant `organizationId` indexes already defined in src/db/schema.ts.
-- Focus: composite indexes for the most common multi-tenant query shapes
-- (tenant + recency, tenant + status). Apply with:
--   psql "$DATABASE_URL" -f scripts/db-optimize.sql
-- or: npm run db:optimize
--
-- NOTE: every index below is prefixed `kf_prod_` and uses IF NOT EXISTS so it
-- is safe to re-run. Review with EXPLAIN (ANALYZE, BUFFERS) before/after.

-- 1) Recency-scanned tenant tables (dashboards, lists, timelines).
CREATE INDEX IF NOT EXISTS kf_prod_invoices_org_created
  ON invoices (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kf_prod_clients_org_created
  ON clients (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kf_prod_expenses_org_created
  ON expenses (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kf_prod_pos_orders_org_created
  ON pos_orders (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kf_prod_crm_deals_org_created
  ON crm_deals (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kf_prod_crm_leads_org_created
  ON crm_leads (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kf_prod_business_timeline_org_created
  ON business_timeline (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kf_prod_ai_conversations_org_created
  ON ai_conversations (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kf_prod_automation_runs_org_created
  ON automation_runs (organization_id, created_at DESC);

-- 2) Status-filtered work queues (approvals, procurements, payroll).
CREATE INDEX IF NOT EXISTS kf_prod_approval_requests_org_status
  ON approval_requests (organization_id, status);
CREATE INDEX IF NOT EXISTS kf_prod_procurement_orders_org_status
  ON procurement_orders (organization_id, status);
CREATE INDEX IF NOT EXISTS kf_prod_payroll_periods_org_status
  ON payroll_periods (organization_id, status);
CREATE INDEX IF NOT EXISTS kf_prod_invoices_org_status
  ON invoices (organization_id, status);
CREATE INDEX IF NOT EXISTS kf_prod_payments_org_status
  ON payments (organization_id, status);

-- 3) Foreign-key join accelerators (membership/org resolution hot paths).
CREATE INDEX IF NOT EXISTS kf_prod_org_members_user_status
  ON organization_members (user_id, status);
CREATE INDEX IF NOT EXISTS kf_prod_org_members_org_user
  ON organization_members (organization_id, user_id);

-- 4) API key lookups (already by prefix; add org-scoped listing index).
CREATE INDEX IF NOT EXISTS kf_prod_api_keys_org
  ON api_keys (organization_id);

-- 5) Maintenance: refresh planner statistics and reclaim bloat.
-- Run during a low-traffic window; non-blocking in PostgreSQL 12+.
ANALYZE;
