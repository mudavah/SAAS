# Epic 8 — AI & Automation Report

This report describes the delivered AI & Automation capabilities, how each works,
the RBAC/audit/timeline touchpoints, and how to use them.

## 1. Workflow Automation Engine

A trigger → condition → action engine, tenant-scoped and audited.

- **Triggers**: `event` (business events), `schedule` (cron), `manual`.
- **Conditions**: nested AND/OR groups with operators `eq, neq, gt, gte, lt, lte,
  contains, not_contains, in, not_in, is_empty, is_not_empty`, evaluated against a
  dot-path run context (`conditions.ts`, pure + unit-tested).
- **Actions** (`actions.ts`): `notify`, `create_task`, `create_invoice`,
  `create_quotation`, `create_purchase_order`, `send_email`,
  `create_timeline_event`, `update_record`, `webhook`, `ai_insight`,
  `ai_summarize`, `approval_request`, `delay`. Action configs support
  `{{dot.path}}` interpolation from the run context.
- **Execution** (`engine.ts`): `runWorkflow` records a parent `automation_runs`
  row and per-action `automation_run_logs`, with per-action error isolation so a
  single failure downgrades the run to `partial`/`failed` instead of aborting.

### Trigger → Action Builder (UI)
`/dashboard/automation` lets users create workflows: pick a trigger event or cron,
add ordered actions from the catalog (`/api/automation/catalog`), and save.
`/dashboard/automation/runs` shows execution history with per-action status.

### Scheduled Automations
Cron matching is implemented in `scheduler.ts` (no external dependency; supports
`*`, `*/n` steps, comma lists, ranges, and exact values). `POST
/api/automation/scheduled/run` runs all due workflows and is designed to be called
once per minute by an external scheduler.

### AI Workflow Generation
`workflow-generator.ts` converts a natural-language description into a structured
workflow (trigger + ordered actions). It uses OpenAI when configured and a
deterministic keyword-based fallback otherwise, so generation always works.
Exposed via `POST /api/automation/ai/generate` and reusable `WORKFLOW_TEMPLATES`.

## 2. Approval Workflows

Reusable, multi-step approvals any module or automation can invoke.

- **Definition** (`approval_workflows`): ordered steps with per-step approver role
  or specific user, an `isDefault` flag per `resourceType`.
- **Request** (`requestApproval`): resolves the workflow (explicit id or default),
  creates the request + steps, and notifies the first approvers. Auto-approves
  when a workflow has no steps.
- **Decision** (`decideApproval`): validates approver eligibility, records the
  step decision and comment, advances to the next step or resolves the request,
  and notifies the requester on completion.
- **UI**: `/dashboard/approvals` lists pending and resolved requests with
  approve/reject actions and step status.

Permissions: `approvals.view`, `approvals.manage`, `approvals.approve`.

## 3. AI Business Intelligence

### Revenue & Cash Flow Forecasting
`forecasting.ts` builds monthly forecasts from historical payments/invoices/
expenses with a confidence score and human summary. `POST /api/ai/forecasts`
(type `revenue` | `cash_flow`) persists results to `ai_forecasts`.

### Inventory Forecasting & Smart Reorder
The `inventory` forecast computes per-product sales velocity, days-of-stock, and
smart reorder suggestions (quantity + flag) from POS sales and current stock.

### Customer Churn Prediction
`churn.ts` scores clients using recency/frequency/monetary/overdue signals into a
0–100 score and `low`/`medium`/`high` risk with contributing factors and a
recommended retention action. `GET /api/ai/churn` (optionally `?regenerate=true`)
returns predictions plus a narrative and upserts `ai_churn_predictions`.

### AI Business Insights & Sales/CRM Insights
`insights.ts` generates prioritized business insights, surfaced at
`/dashboard/ai/insights` alongside churn risk. CRM-specific AI continues to be
served by the existing CRM AI module.

### AI Financial Reports
`reports.ts` produces `financial_summary`, `profit_loss`, `cash_flow` and
`tax_readiness` reports from org aggregates, enriched with an LLM narrative when
available. `POST /api/ai/reports`; managed from `/dashboard/ai/history`.

### AI-generated Invoices, Quotations & Purchase Orders
`documents.ts` generates review-first **drafts** into `ai_documents`
(inheriting recent line items for repeat clients, or suggesting reorder lines for
suppliers), then `POST /api/ai/documents/[id]/commit` creates the real record
(invoice / CRM quotation / purchase order) and links it back. UI at
`/dashboard/ai/documents`.

### AI Task Recommendations
`tasks.ts` recommends prioritized next actions (follow-ups, overdue chases,
reorders) with a narrative. `/api/ai/tasks`; UI at `/dashboard/ai/tasks`.

### Natural-Language Business Queries
`nl-query.ts` maps a plain-language question to an intent, gathers the relevant
org-scoped data, and returns an answer plus an explanation of how it was derived.
Every query is logged to `ai_query_logs`. UI at `/dashboard/ai/query`.

## 4. Cross-cutting integration

- **Notifications**: automations and approvals raise in-app notifications via
  `createNotification`.
- **Business Timeline**: workflow runs, approvals, forecasts, reports, documents,
  churn scans and NL queries emit timeline events via `emitTimelineEvent`.
- **Audit**: all state-changing operations call `logAuditSafe` with the `ai`
  category and appropriate resource references.
- **RBAC**: automation routes require `automation.view` / `automation.manage` /
  `automation.execute`; approvals require `approvals.*`; AI routes require
  `ai.access`. New keys are added to the catalog and mapped to system roles.
- **Multi-tenant**: every read/write is filtered by `organizationId`.

## 5. Configuration

- `OPENAI_API_KEY` (optional): when present, AI features use the model via
  `callOpenAI`; when absent, deterministic rule-based fallbacks are used so the
  platform is fully functional offline.
- Scheduled automations require an external caller to hit
  `POST /api/automation/scheduled/run` every minute.
