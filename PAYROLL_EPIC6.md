# KaziFlow — Epic 6: Payroll Module

Complete, Kenya-compliant payroll module fully integrated with HR and Bookkeeping.
This document summarizes the architecture, database migration, API surface, and test results.

> Status: Implemented. Awaiting approval.

---

## 1. Architecture Summary

### Principles
- **Multi-tenancy**: every payroll table carries `organizationId` and is scoped by it. A tenant can never read or mutate another tenant's payroll data.
- **RBAC**: all mutations are gated by payroll permission keys (see `src/lib/rbac/permissions.ts`).
- **Auditability**: every business action writes an immutable audit log (`logAuditSafe`) and a Business Timeline event (`emitTimelineEvent`).
- **Bookkeeping integration**: approved runs post a balanced journal entry that auto-creates the required chart-of-accounts entries.
- **Notifications**: run processing, approval, rejection, and payment emit in-app notifications.

### Layered design
```
src/db/schema.ts                  Payroll tables, enums, relations
src/lib/validations.ts            Zod schemas for all payroll inputs
src/lib/rbac/permissions.ts       Payroll permission keys + role grants
src/lib/payroll/tax.ts            Pure Kenya statutory math (PAYE, NSSF, NHIF, Housing Levy, Pension)
src/lib/payroll/accounts.ts       Payroll ↔ Bookkeeping journal posting + account resolution
src/lib/payroll/service.ts        Business logic (periods, structures, runs, payslips, exports, journals, insights, reports, employee portal)
src/app/api/payroll/**            REST API routes
src/app/dashboard/payroll/**      UI pages (dashboard, periods, structures, runs, payslips, reports, portal)
```

### Data model (key entities)
- **payroll_periods** — a pay cycle (open / processing / closed / locked).
- **salary_structures** + **salary_structure_components** — reusable earning/deduction templates (allowances, overtime, bonus, deductions, statutory lines).
- **employee_salary_assignments** — links an employee to a structure + basic salary, effective-dated.
- **payroll_runs** — a calculated cycle for a period (draft → calculated → pending_approval → approved → paid).
- **payroll_run_employees** + **payroll_run_details** — per-employee totals and line items (earnings, statutory, deductions).
- **payslips** — generated, sent, or viewed payslips per employee.
- **payroll_payment_exports** — bank payment files (CSV/PDF).
- **payroll_approval_workflows** — approval/rejection audit trail.
- **payroll_ai_insights** — rule-based AI insights surfaced on the dashboard.

### Computation (`src/lib/payroll/tax.ts`)
- **NSSF**: Tier I (6% of first 8,000) + Tier II (6% of 8,001–72,000).
- **NHIF**: banded flat amount, 150 (lowest) → 1,700 (≥100,000).
- **PAYE**: graduated bands (10% / 25% / 30%) minus 2,400 personal relief.
- **Housing Levy**: 1.5% of pensionable pay (capped at 72,000).
- **Pension**: 5% employee contribution (capped at 72,000), configurable.
- `computePayrollBreakdown()` returns gross, statutory deductions, total tax, and net pay; net pay is floored at 0.

### AI Payroll Insights
`generatePayrollInsights()` produces prioritized, rules-based insights (first-run onboarding, pending approvals, statutory burden %, average cost-per-employee). The dashboard "Refresh" button regenerates them for the current user.

### Employee Payroll Portal
`/dashboard/payroll/portal` (and `/api/payroll/employee`) resolves the current user's linked HR employee and shows their salary assignment, year-to-date totals, and payslip history — scoped by `hrEmployees.userId`.

---

## 2. Migration Summary

The module follows an **incremental schema approach** — no existing tables were altered.

### New enums (`src/db/schema.ts`)
- `payroll_period_status` — open, processing, closed, locked
- `payroll_run_status` — draft, calculated, pending_approval, approved, rejected, paid, cancelled
- `payslip_status` — draft, generated, sent, viewed
- `payroll_item_type` — earnings, allowance, deduction, tax_paye, tax_nssf, tax_nhif, tax_pension, tax_housing_levy, overtime, bonus
- `salary_structure_type` — monthly, bi_weekly, weekly, daily, contract
- `pension_provider_type` — nssf, private_provider, corporate_scheme
- **Extended** `timeline_event_type` with the payroll event types used (e.g. `payroll.period.updated`, `payroll.salary_structure.created`, `payroll.assignment.created`).

### New tables (all multi-tenant, indexed)
`payroll_periods`, `salary_structures`, `salary_structure_components`, `employee_salary_assignments`,
`payroll_runs`, `payroll_run_employees`, `payroll_run_details`, `payslips`,
`payroll_payment_exports`, `payroll_approval_workflows`, `payroll_ai_insights`.

Each table declares relations (`...Relations`) for ergonomic queries and carries indexes on
`organizationId`, `userId`, status, and foreign keys for performant, tenant-scoped reads.

### Applying the migration
The project uses Drizzle schema sync:
```bash
npm run db:push
```
This performs an incremental, additive sync of the new payroll tables/enums against the database
without touching existing data. Verify with:
```bash
npx tsc --noEmit   # 0 errors
```

---

## 3. API Changes

All endpoints are JSON; failures return `{ error, status }`. Permissions are enforced via
`requireApiContext(req, permission)`.

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| GET/POST | `/api/payroll/periods` | `payroll.view` / `payroll.periods.manage` | List / create periods |
| GET/PUT/DELETE | `/api/payroll/periods/:id` | `payroll.view` / `payroll.periods.manage` | Read / update / delete (open only) |
| POST | `/api/payroll/periods/:id/close` | `payroll.periods.manage` | Close period |
| POST | `/api/payroll/periods/:id/lock` | `payroll.periods.manage` | Lock period |
| GET/POST | `/api/payroll/structures` | `payroll.view` / `payroll.salary_structures.manage` | List / create structures |
| GET/PUT/DELETE | `/api/payroll/structures/:id` | `payroll.view` / `payroll.salary_structures.manage` | Read / update / delete |
| POST | `/api/payroll/structures/:id/components` | `payroll.salary_structures.manage` | Add component |
| PUT/DELETE | `/api/payroll/components/:id` | `payroll.salary_structures.manage` | Update / delete component |
| GET/POST | `/api/payroll/assignments` | `payroll.view` / `payroll.salary_structures.manage` | List / assign salary |
| GET/POST | `/api/payroll/runs` | `payroll.view` / `payroll.runs.manage` | List / create runs |
| GET | `/api/payroll/runs/:id` | `payroll.view` | Run detail (employees, details, approvals) |
| POST | `/api/payroll/runs/:id/process` | `payroll.runs.manage` | Calculate run |
| POST | `/api/payroll/runs/:id/approve` | `payroll.runs.approve` | Approve / reject run |
| POST | `/api/payroll/runs/:id/pay` | `payroll.runs.manage` | Mark paid |
| POST | `/api/payroll/runs/:id/payslips` | `payroll.payslips.manage` | Generate payslips (approved) |
| POST | `/api/payroll/runs/:id/export` | `payroll.export` | Create bank export |
| POST | `/api/payroll/runs/:id/journal` | `payroll.runs.manage` | Post bookkeeping journal |
| GET | `/api/payroll/payslips` | `payroll.payslips.view` | List payslips |
| GET | `/api/payroll/payslips/:id` | `payroll.payslips.view` | Payslip detail |
| POST | `/api/payroll/payslips/:id/send` | `payroll.payslips.manage` | Send payslip |
| POST | `/api/payroll/payslips/:id/view` | `payroll.payslips.view` | Mark viewed |
| GET | `/api/payroll/exports` | `payroll.export` | List exports |
| GET | `/api/payroll/exports/:id/download` | `payroll.export` | Download export file |
| GET/POST | `/api/payroll/insights` | `payroll.view` | List / refresh-or-create insights |
| POST | `/api/payroll/insights/:id/dismiss` | `payroll.view` | Dismiss insight |
| GET | `/api/payroll/reports` | `payroll.reports.view` | Aggregated reports |
| GET | `/api/payroll/employee` | `payroll.payslips.view` | Employee self-service portal |

### Key behaviors
- **Process run**: picks active/on-leave employees with an effective assignment for the period, computes each
  breakdown, and writes `payroll_run_employees` + `payroll_run_details`.
- **Approve**: records a `payroll_approval_workflows` row and flips run status.
- **Journal**: posts a balanced entry (Salaries Expense debit; NSSF/NHIF/PAYE/Housing Levy/Pension/Other
  Payable credits; Bank credit = net pay). Accounts are auto-created if missing.
- **Export**: returns a CSV (or text/PDF fallback) of employee net pay for bank upload.

---

## 4. Test Report

### Unit tests — `src/lib/payroll/__tests__/payroll.test.ts`
Pure-function coverage of the Kenya statutory engine (no DB required):

```
Test Files  1 passed (1)
     Tests  15 passed (15)
```

Coverage:
- `computeNSSF` — Tier I/Tier II, cap at 72,000.
- `computeNHIF` — banded 150 → 1,700 (≥100,000).
- `computePAYE` — graduated bands with 2,400 relief.
- `computeHousingLevy` — 1.5% capped at 72,000.
- `computePension` — 5% capped at 72,000.
- `computePayrollBreakdown` — basic only, with allowances, with overtime/bonus/other deductions, and the
  non-negative net-pay guarantee.

### Type safety
- `npx tsc --noEmit` → **0 errors** across the whole project (including payroll schema, service, API, and UI).
- All 8 payroll UI pages compile cleanly.

### Manual verification checklist (recommended before production)
1. Create a payroll period → appears in list with `open` badge.
2. Create a salary structure + components, assign to an employee.
3. Create a run for the period → **Process** → run shows calculated totals and per-employee line items.
4. **Approve** the run → status flips to `approved`; notification emitted.
5. **Generate Payslips** → payslips created; **Send** updates status.
6. **Post Journal** → balanced entry appears in Bookkeeping (salary expense + statutory payables + bank).
7. **Export** → downloadable CSV of net pay.
8. **Mark Paid** → run status `paid`.
9. Refresh **AI Insights** on the dashboard.
10. Employee opens **My Payslips** portal → sees own assignment, YTD, and payslips.

### Notes / assumptions
- Bank payment export currently emits a portable CSV/text layout (no proprietary bank format). Wire a
  specific bank template (e.g. KCB/Equity) when required.
- Statutory rates reflect the 2024/2025 Kenya schedule and live in `src/lib/payroll/tax.ts` for easy updates.
- The employee portal resolves the user via `hrEmployees.userId`; ensure HR employees are linked to user accounts.
