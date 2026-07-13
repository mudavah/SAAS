# Epic 3 — Procurement Module: Architecture Summary

KaziFlow Procurement is implemented as a self-contained vertical slice that plugs
into the existing platform without touching any other module's behavior.
All code is additive: new tables, new API routes under `/api/procurement/*`,
new RBAC permissions, and new dashboard pages under `/dashboard/procurement/*`.

## Layers

1. **Database (`src/db/schema.ts`)**
   - New `procurement_*` tables (all `organization_id`-scoped for multi-tenancy).
   - Extended `inventory_suppliers` with management/performance columns
     (rating, payment terms, lead time, bank details, etc.) — all nullable so
     existing inventory suppliers keep working.
   - New `timeline_event_type` enum values for procurement events.

2. **Service layer (`src/lib/procurement/`)**
   - `accounts.ts` — posts bookkeeping journal entries (inventory, AP, input VAT…).
   - `stock.ts` — applies goods receipts / returns to inventory stock + movements.
   - `approvals.ts` — multi-level tiered approval engine (manager → administrator
     → owner by amount, overridable per-organization via
     `organization.settings.procurementApprovalPolicy`).
   - `service.ts` — all business operations (requests, RFQs, quotations, POs,
     GRNs, returns, invoices, payments, budgets). Each op is:
     - multi-tenant scoped,
     - RBAC-gated at the API boundary,
     - audited via `logAuditSafe`,
     - emits a Business Timeline event via `emitTimelineEvent`,
     - notifies relevant users via `createNotification`.
   - `metrics.ts` — dashboard KPIs, supplier performance/balances, low-stock
     detection, and report aggregations.
   - `recommendations.ts` — AI reorder recommendations & low-stock suggestions.

3. **API (`src/app/api/procurement/*`)** — thin, RBAC-checked controllers that
   call the service layer. See `API_CHANGES.md`.

4. **UI (`src/app/dashboard/procurement/*`)** — mobile-first dashboard pages
   matching the existing KaziFlow UI/UX (server-component overview + client
   list/create pages with dialog forms).

## Integrations (all one-directional & additive)

| Source | Sink | Mechanism |
|--------|------|-----------|
| Goods Received (GRN) | Inventory | `applyStockReceipt` in `stock.ts` |
| Supplier Return | Inventory | `applyStockReturn` in `stock.ts` |
| Purchase Invoice | Bookkeeping | `postProcurementJournalEntry` (inventory + AP + input VAT) |
| Supplier Payment | Bookkeeping + AP balance | journal entry + balance recompute |
| Every action | Business Timeline | `emitTimelineEvent` |
| Approval / receipt | Notifications | `createNotification` |

## Security & Compliance

- Every route uses `requireApiContext(req, "<permission>")`.
- New permissions: `purchasing.requests.manage`, `purchasing.rfq.manage`,
  `purchasing.quotations.manage`, `purchasing.po.manage`, `purchasing.grn.manage`,
  `purchasing.returns.manage`, `purchasing.invoices.manage`,
  `purchasing.payments.manage`, `purchasing.suppliers.manage`,
  `purchasing.budgets.manage`, `purchasing.approve`, `purchasing.reports.view`.
- Granted to `owner`, `administrator`, `manager`, `inventory_manager`,
  `accountant`; `employee` gets `purchasing.requests.manage` for raising requisitions.
- All mutations write to the audit log (`category: "purchasing"`).
