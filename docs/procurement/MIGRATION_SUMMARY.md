# Epic 3 — Procurement Module: Migration Summary

Migration file: `drizzle/0008_small_silver_sable.sql` (auto-generated via
`drizzle-kit generate`, applied with `drizzle-kit migrate`). It is **purely
additive** — no existing table or column is dropped or altered destructively.

## Enums added

`approval_level_status`, `budget_period`, `grn_status`, `procurement_po_status`,
`procurement_request_status`, `purchase_invoice_status`, `recommendation_status`,
`rfq_status`, `supplier_payment_status`, `supplier_quotation_status`,
`supplier_return_status` — plus 31 new `timeline_event_type` values
(`procurement.*`).

## New tables

| Table | Purpose |
|-------|---------|
| `procurement_purchase_requests` / `_items` | Purchase requisitions |
| `procurement_rfqs` / `_items` / `_suppliers` | RFQs + invited suppliers |
| `procurement_supplier_quotations` / `_items` | Supplier quotes |
| `procurement_purchase_orders` / `_items` | POs + line items |
| `procurement_approvals` | Multi-level approval chain rows |
| `procurement_grns` / `_items` | Goods received notes |
| `procurement_supplier_returns` / `_items` | Supplier returns |
| `procurement_purchase_invoices` / `_items` | Supplier invoices |
| `procurement_supplier_payments` | Payments to suppliers |
| `procurement_budgets` | Budget control |
| `procurement_ai_recommendations` | AI recommendations |

## Altered table

`inventory_suppliers` — added nullable columns: `contact_name`, `website`,
`city`, `country`, `tax_id`, `category`, `payment_terms`, `lead_time_days`,
`preferred_currency`, `bank_name`, `bank_account`, `rating`, `is_active`.

## Indexes / constraints

- Unique `(organization_id, <number>)` indexes on every document table
  (`request_number`, `rfq_number`, `quotation_number`, `po_number`,
  `grn_number`, `invoice_number`, `payment_number`, `return_number`).
- FK cascade/set-null constraints on all relations.
- Per-table btree indexes on `organization_id`, `status`, `supplier_id`,
  `resource` lookups for approvals, and `period` ranges for budgets.

## Rollout

1. `npm run db:generate` (already produced `0008_*`).
2. `npm run db:migrate` to apply against the target database.
3. No backfill required — all new columns are nullable and new tables start empty.
