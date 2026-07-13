# Epic 3 — Procurement Module: API Changes

All endpoints are mounted under `/api/procurement/*`, are JSON, and enforce RBAC
via `requireApiContext(req, "<permission>")`. Multi-tenant scoping is by
`ctx.organizationId`.

## Endpoints

### Purchase Requests
- `GET  /api/procurement/requests` — list (`purchasing.requests.manage`)
- `POST /api/procurement/requests` — create
- `GET  /api/procurement/requests/[id]` — detail (items, approvals, requester)
- `DELETE /api/procurement/requests/[id]` — delete (draft only)
- `POST /api/procurement/requests/[id]/submit` — submit for approval
- `POST /api/procurement/requests/[id]/approve` — approve (body: `{comments?}`)
- `POST /api/procurement/requests/[id]/reject` — reject

### RFQs
- `GET  /api/procurement/rfqs` · `POST /api/procurement/rfqs`
- `GET  /api/procurement/rfqs/[id]`
- `POST /api/procurement/rfqs/[id]/send` — notify invited suppliers

### Supplier Quotations
- `GET  /api/procurement/quotations` · `POST /api/procurement/quotations`
- `GET  /api/procurement/quotations/[id]`
- `POST /api/procurement/quotations/[id]/accept`
- `POST /api/procurement/quotations/[id]/reject`

### Purchase Orders
- `GET  /api/procurement/orders` · `POST /api/procurement/orders`
- `GET  /api/procurement/orders/[id]`
- `POST /api/procurement/orders/[id]/submit`
- `POST /api/procurement/orders/[id]/approve`
- `POST /api/procurement/orders/[id]/reject`
- `POST /api/procurement/orders/[id]/order` — mark ordered
- `POST /api/procurement/orders/[id]/receive` — create GRN from PO items

### Goods Received (GRN)
- `GET  /api/procurement/grns`
- `POST /api/procurement/orders/[id]/receive` — creates GRN + updates inventory

### Supplier Returns
- `GET  /api/procurement/returns` · `POST /api/procurement/returns`
- `GET  /api/procurement/returns/[id]`

### Purchase Invoices
- `GET  /api/procurement/invoices` · `POST /api/procurement/invoices` (posts to bookkeeping)
- `GET  /api/procurement/invoices/[id]`

### Supplier Payments
- `GET  /api/procurement/payments` · `POST /api/procurement/payments`
- `GET  /api/procurement/payments/[id]`

### Suppliers
- `GET  /api/procurement/suppliers` (with performance) · `POST /api/procurement/suppliers`
- `GET  /api/procurement/suppliers/[id]`
- `PATCH /api/procurement/suppliers/[id]` · `DELETE /api/procurement/suppliers/[id]`
- `GET  /api/procurement/suppliers/[id]/performance` — scorecard + balance

### Budgets
- `GET  /api/procurement/budgets` · `POST /api/procurement/budgets`
- `GET  /api/procurement/budgets/[id]`

### Analytics & AI
- `GET  /api/procurement/dashboard` — KPIs (`purchasing.reports.view`)
- `GET  /api/procurement/reports` — spend/category/status/budget breakdowns
- `GET  /api/procurement/approvals` — pending approvals for caller's role
- `GET  /api/procurement/low-stock` — low-stock suggestions
- `GET  /api/procurement/recommendations` — open AI recommendations
- `POST /api/procurement/recommendations` — regenerate
- `PATCH /api/procurement/recommendations` — `{id, status}` (open/dismissed/applied)
- `GET|POST /api/procurement/ai` — natural-language procurement advice

## No breaking changes
No existing routes, schemas, or client contracts were modified. The only schema
mutation to an existing table (`inventory_suppliers`) is additive and nullable.
