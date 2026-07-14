# Enterprise & Multi-Branch Management Report

## Executive Summary

The Enterprise & Multi-Branch Management module (Epic 10) extends KaziFlow to support organizations operating across multiple physical or virtual locations. It provides centralized control over branches, inter-branch inventory transfers, cross-branch sales, approval workflows, consolidated reporting, and AI-driven insights — all while maintaining strict multi-tenant isolation, RBAC security, and full auditability via the Business Timeline.

---

## 1. Feature Overview

| Capability | Status | Key Tables |
|---|---|---|
| Multi-Branch Management | Implemented | `enterprise_branches`, `branch_members` |
| Branch-Specific Pricing | Implemented | `branch_pricing` |
| Branch Tax Settings | Implemented | `branch_tax_settings` |
| Inter-Branch Transfers | Implemented | `inter_branch_transfers`, `inter_branch_transfer_items` |
| Inter-Branch Sales | Implemented | `inter_branch_sales`, `inter_branch_sale_items` |
| Centralized Procurement | Configurable | `enterprise_settings.centralized_procurement` |
| Branch Approval Workflows | Implemented | `branch_approval_workflows`, `branch_approval_requests` |
| Branch Performance Dashboard | Stub + Snapshots | `branch_performance_snapshots` |
| Consolidated Reporting | Implemented | Cross-table aggregation via `enterprise_settings.consolidated_reporting` |
| Cross-Branch Inventory Visibility | Configurable | `enterprise_settings.cross_branch_inventory_visibility` |
| Enterprise AI Insights | Implemented | `analytics_insights` + `src/lib/enterprise-analytics/metrics.ts` |
| RBAC & Audit Coverage | Implemented | `src/lib/rbac/`, `src/lib/audit.ts` |
| Timeline Integration | Implemented | `src/lib/timeline.ts` |

---

## 2. Multi-Branch Management

Organizations can create and manage an unlimited number of branches. Each branch has:
- **Identity**: Name, unique code (per organization), type (`retail`, `warehouse`, `head_office`, etc.), and status.
- **Location**: Address, city, country, timezone, phone, email.
- **Financial config**: Currency, tax ID.
- **Operational config**: Settings JSONB for feature flags, manager assignment, default branch flag.
- **Members**: Users assigned to the branch with role-based permissions (system role or custom role overrides).

### Branch Types
- `head_office` — Central administration
- `retail` — Customer-facing stores
- `warehouse` — Storage and distribution
- `office` — Administrative offices
- `factory` — Production facilities
- `other` — Catch-all

### Branch Statuses
- `active` — Operating normally
- `inactive` — Temporarily closed
- `suspended` — Restricted access
- `closing` — Pending deactivation

---

## 3. Inter-Branch Transfers

Transfers move inventory from one branch to another with full lifecycle tracking:

1. **Draft**: Transfer is created but not submitted.
2. **Pending**: Submitted and awaiting approval.
3. **In Transit**: Approved and moving between branches.
4. **Received**: Destination branch acknowledges receipt (partial or full).
5. **Completed**: All items received and confirmed.
6. **Cancelled / Rejected**: Transfer is voided.

### Transfer Items
Each transfer has one or more line items (`inter_branch_transfer_items`):
- `product_id` — Must reference a valid inventory product.
- `quantity` — Total quantity being transferred.
- `unit_cost` — Cost basis for valuation.
- `received_quantity` — Updated as items are received.
- `notes` — Per-item remarks.

### Integration Points
- **Inventory**: Receiving a transfer updates stock levels and emits stock movements.
- **Approvals**: Optional approval workflow gate before `in_transit`.
- **Timeline**: Every status change emits a timeline event.

---

## 4. Inter-Branch Sales

Inter-branch sales allow one branch to sell goods to another branch as if it were an external customer:

1. **Draft**: Sale order is being prepared.
2. **Pending**: Submitted for approval.
3. **Approved**: Authorized by a manager/approver.
4. **Completed**: Goods delivered and payment recorded.
5. **Cancelled**: Order is voided.

### Sale Items
Each sale has itemized lines (`inter_branch_sale_items`):
- `description` — Product/service description.
- `quantity`, `unit_price`, `discount`, `tax_rate`, `line_total`.
- `sort_order` — Controls display sequence.

### Financial Calculations
- `subtotal` = Sum of (quantity × unit_price − discount) across items.
- `tax_amount` = subtotal × tax_rate / 100.
- `total` = subtotal + tax_amount.
- Currency is branch-configurable but defaults to KES.

---

## 5. Centralized Procurement

The `enterprise_settings.centralized_procurement` flag enables organization-wide procurement coordination:
- Purchase requests, RFQs, and POs can be consolidated across branches.
- The existing Procurement module (Epic 3) integrates via `organization_id` scoping.
- Branch-specific pricing (`branch_pricing`) can override standard costs.
- AI recommendations surface bulk-purchase opportunities.

---

## 6. Branch Performance Dashboard

The module provides a branch performance snapshot system for pre-computed aggregates:

| Metric | Description |
|---|---|
| `revenue` | Total revenue attributed to the branch in the period |
| `expenses` | Total expenses for the branch |
| `profit` | revenue − expenses |
| `inventory_value` | Current stock valuation at the branch |
| `sales_count` | Number of sales transactions |
| `transfer_count` | Number of transfer transactions |
| `employee_count` | Active branch members |
| `data` | JSONB blob for extensible metrics |

Snapshots are deduplicated by `(branch_id, period_start, period_end)` to prevent duplicate computation.

The `getBranchPerformance` function in `src/lib/enterprise-analytics/metrics.ts` currently returns a stub (`{ branches: [] }`) because branch-scoped financial aggregation is not yet fully modelled in the analytics schema. This is a known limitation tracked for a future sprint.

---

## 7. Consolidated Reporting

When `enterprise_settings.consolidated_reporting` is enabled:
- Financial reports aggregate data across all branches.
- Cross-branch inventory visibility shows stock levels organization-wide.
- The `getExecutiveSummary`, `getKpiMetrics`, and related functions in the analytics layer operate at the `organization_id` level, producing org-wide figures.

### Report Types Supported
- Executive Summary (revenue, expenses, profit, top products/clients)
- Sales Analytics (by month, channel)
- Revenue Analytics (by method, period)
- Profit & Loss Analytics (monthly trends)
- Cash Flow Analytics (inflow/outflow)
- Inventory Analytics (stock value, movements)
- CRM Analytics (leads, deals, conversion)
- Procurement Analytics (purchase value, PO counts)
- HR Analytics (headcount, attendance)
- Payroll Analytics (net pay, payslip counts)
- Compliance Analytics (alerts by severity)

---

## 8. Branch Approvals

Configurable multi-step approval workflows per branch:
- Workflows are defined per `resource_type` (e.g., `inter_branch_transfer`, `inter_branch_sale`, `purchase_order`).
- Each workflow has ordered `steps` with `approverRole` or `approverUserId`.
- Requests track `current_step`, `status`, and `payload`.
- Decisions (`approved`/`rejected`) record the decider and timestamp.
- The `branch_approval_required` setting in `enterprise_settings` can enforce approvals globally.

---

## 9. AI Insights

The Enterprise module generates AI-driven insights for:
- **Branch Performance**: Revenue trends, profit margins, and growth opportunities per branch.
- **Cross-Branch Inventory**: Detecting stock imbalances and suggesting transfers.
- **Consolidated Procurement**: Identifying bulk-purchase savings and supplier consolidation opportunities.
- **Anomaly Detection**: Flagging unusual spending or stock depletion patterns.
- **Forecasting**: Revenue and demand predictions using historical data.

Insights are stored in the shared `analytics_insights` table with `organization_id` scoping and are surfaced via the `getAiInsights` function.

---

## 10. Mobile-First Implementation

All Enterprise UI components follow a mobile-first design philosophy:
- **Responsive layout**: Tailwind CSS grid and flex utilities adapt from single-column mobile to multi-column desktop.
- **Touch-friendly**: Minimum 44×44px touch targets for all interactive elements.
- **Offline-capable**: Critical read operations leverage the existing offline sync engine (`src/lib/offline/`).
- **Progressive disclosure**: Advanced settings (tax config, approval steps) are hidden behind expandable sections on small screens.
- **Native-like navigation**: Bottom tab bars and swipe gestures on dashboards.

---

## 11. RBAC & Audit Coverage

### RBAC
Every enterprise route checks permissions before executing:
- `enterprise.branches.manage` — Branch CRUD
- `enterprise.members.manage` — Member management
- `enterprise.pricing.manage` — Pricing rules
- `enterprise.transfers.manage` — Transfer operations
- `enterprise.sales.manage` — Inter-branch sales
- `enterprise.procurement.manage` — Centralized procurement
- `enterprise.reports.view` — Reporting access
- `enterprise.approvals.manage` — Workflow configuration
- `enterprise.approvals.approve` — Request decisions
- `enterprise.settings.manage` — Settings
- `enterprise.ai.access` — AI insights

### Audit
All mutations are logged via `logAuditSafe` with:
- Action (e.g., `enterprise.branch.create`)
- Resource type and ID
- Old and new values
- Actor (from `ServerContext`)

---

## 12. Timeline Integration

The Business Timeline provides an immutable, organization-scoped audit trail:
- Every branch, transfer, sale, approval, and AI insight event is recorded.
- Events are **best-effort** — timeline failures never block business operations.
- The timeline supports filtering by event type, resource type, date range, and text search.
- Pagination is handled via cursor-based offset.

---

## 13. Technology Stack

| Layer | Technology |
|---|---|
| ORM | Drizzle ORM (PostgreSQL) |
| Runtime | Next.js 15 (App Router) |
| Validation | Zod |
| Styling | Tailwind CSS + Radix UI |
| State | React Query (TanStack) |
| AI | OpenAI-compatible API with local fallbacks |
| Offline | IDB + custom sync engine |
| Testing | Vitest |
