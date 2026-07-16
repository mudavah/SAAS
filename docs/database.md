# KaziFlow OS — Database Reference

## 1. Engine & Access

- PostgreSQL 15+ via **Drizzle ORM** (`src/db/schema.ts`, ~7,900 lines).
- Connection: `postgres` client in `src/db/index.ts` (pooled; `prepare` enabled in prod).
- Migrations: `drizzle-kit` (`npm run db:generate` / `db:migrate`); also `npm run db:push` for quick sync.

## 2. Schema Map (key domains)

| Domain | Tables |
|--------|--------|
| Auth/Identity | `users`, `accounts`, `sessions`, `organizationMembers` |
| Org | `organizations`, `businesses` |
| Billing | `invoices`, `invoiceItems`, `clients`, `payments`, `paymentLinks`, `expenses` |
| Inventory | `inventoryProducts`, `inventoryCategories`, `inventoryBrands`, `stockMovements`, `warehouses`, `suppliers` |
| Payroll/HR | `employees`, `payrollPeriods`, `payslips`, `departments`, `leave`, `attendance` |
| Procurement | `procurementRequests`, `purchaseOrders`, `grns`, `suppliers`, `budgets`, `rfqs` |
| Compliance | `etimsConfig`, `complianceSubmissions`, `auditLogs` |
| Analytics | `analyticsDashboards`, `analyticsWidgets`, `analyticsScheduledReports` |
| AI/Usage | `usageRecords` (now with token + cost columns) |
| Timeline | `businessTimeline` |
| Audit | `auditLogs` (append-only) |
| Onboarding | `onboardingSteps`, `onboardingProgress`, `onboardingTips` |

## 3. Relationships & Integrity

- Strong FK graph via Drizzle `relations`.
- Unique constraint: `organizationId + invoiceNumber` (per prior hardening).
- `organizationId` NOT NULL on business tables (backfilled via `scripts/add-org-id-column.cjs`).
- Check constraints on amounts (`amount > 0`) added in EPIC_12.

## 4. Indexes

- `scripts/apply-db-indexes.mjs` + `db-optimize.sql` add high-value indexes: `payments.reference`, `businessTimeline(organizationId, createdAt)`, `auditLogs(organizationId, createdAt)`, FK columns.
- Run in CI and post-deploy (`npm run db:optimize`).

## 5. This Refinement's Schema Change (additive)

`usageRecords` gained nullable columns (default 0/null, backward compatible):
```sql
ALTER TABLE usage_records
  ADD COLUMN ai_prompt_tokens integer DEFAULT 0,
  ADD COLUMN ai_completion_tokens integer DEFAULT 0,
  ADD COLUMN ai_cost_cents integer DEFAULT 0,
  ADD COLUMN ai_model text;
```
Apply with `npm run db:migrate` or `db:push`.

## 6. Migrations & Drift

- `drizzle/` holds generated migrations + `meta/` (committed).
- Schema validation: `scripts/validate-system.mjs`, `scripts/check-schema.cjs`.

## 7. Backup & Restore

- See `docs/backup-dr.md`. Automated `pg_dump` to object storage; restore + verify scripts.
