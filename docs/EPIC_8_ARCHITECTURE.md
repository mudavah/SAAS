# Epic 8 — AI & Automation Platform: Architecture Summary

## Overview

Epic 8 expands the existing **AI Business Copilot** into a full **AI & Automation
Platform** without changing any existing KaziFlow module (Auth, Multi-tenancy,
RBAC, CRM, Procurement, POS, HR, Payroll, Compliance Center, Developer Platform,
Business Timeline). Everything is additive: new enums, tables, libraries, API
routes and dashboard pages layered on the established patterns.

The platform delivers three pillars:

1. **Workflow Automation** — trigger → condition → action engine, scheduled
   automations, manual runs, and AI-assisted workflow generation.
2. **Approvals** — reusable, multi-step approval workflows that any module or
   automation can request and that users decide on.
3. **AI Intelligence** — forecasting (revenue, cash flow, inventory + smart
   reorder), churn prediction, business insights, natural-language queries,
   AI financial reports, AI-generated documents (invoice/quotation/PO) and task
   recommendations.

## Design principles (inherited from the codebase)

- **Multi-tenant**: every table carries `organizationId`; every query is scoped
  to `ctx.organizationId`. No cross-tenant reads or writes.
- **RBAC-secured**: routes call `requireApiContext(req, <permission>)`. New
  permission keys (`automation.*`, `approvals.*`) are added to the permission
  catalog and mapped to system roles.
- **Audited**: state-changing operations call `logAuditSafe(...)`.
- **Timeline-integrated**: significant events call `emitTimelineEvent(...)`.
- **Notified**: user-facing events call `createNotification(...)`.
- **Incremental migrations only**: a single additive SQL migration
  (`0014_ai_automation_platform.sql`) creates new enums/tables and extends the
  timeline event enum; no existing objects are dropped or altered destructively.
- **Testable core**: pure logic (condition evaluation, cron matching, workflow
  generation) lives in dependency-free modules with unit tests.

## Module layout

```
src/lib/automation/
  types.ts              Shared engine types (triggers, actions, conditions, runs)
  conditions.ts         Pure: dot-path resolve, condition group eval, {{template}} interpolation
  catalog.ts            UI metadata for trigger events and action types
  actions.ts            Action executors (notify, create_task/invoice/quotation/PO,
                        webhook, ai_insight/ai_summarize, approval_request, delay, ...)
  engine.ts             loadWorkflow, runWorkflow, dispatchBusinessEvent, listWorkflows, listRuns
  scheduler.ts          Pure cron matcher + runDueScheduledWorkflows + runWorkflowNow
  approval.ts           requestApproval, decideApproval, listApprovalRequests
  workflow-generator.ts NL → workflow (rules + optional LLM), WORKFLOW_TEMPLATES

src/lib/ai/
  forecasting.ts        Revenue, cash flow, inventory forecasts + smart reorder
  churn.ts              RFM-style churn scoring + narrative
  nl-query.ts           Natural-language business queries (intent → data → answer)
  documents.ts          AI draft documents + commit-to-real-record
  tasks.ts              Task recommendations + narrative
  reports.ts            AI financial reports (summary, P&L, cash flow, tax readiness)
  insights.ts           (existing) business insights, now surfaced in the new UI
  copilot.ts            (existing) callOpenAI helper reused across AI libs
```

## Request/execution flow

### Event-driven automation
1. A module route completes a business action (e.g. invoice created) and calls
   `void dispatchBusinessEvent({ type, organizationId, userId, payload })`
   (fire-and-forget so the primary request is never blocked).
2. `dispatchBusinessEvent` loads active `event`-triggered workflows for the org
   whose `triggerConfig.event` matches, builds a run context, and evaluates the
   workflow-level condition group and any trigger event filters.
3. Matching workflows execute their ordered actions via `runWorkflow`. Each
   action is interpolated with the run context, condition-gated, executed, and
   recorded in `automation_run_logs`; the parent `automation_runs` row captures
   overall status and success/failure counts.

Currently wired module events: `invoice.created`, `payment.received`,
`crm.deal.won`. Additional events can be dispatched from any route using the
same one-line pattern.

### Scheduled automation
- `runDueScheduledWorkflows()` (invoked by `POST /api/automation/scheduled/run`,
  intended to be called every minute by an external scheduler/cron) matches each
  active `schedule` workflow's cron expression against the current minute, guards
  against double-firing within the same minute, and runs due workflows as the
  workflow owner.

### Manual run
- `POST /api/automation/workflows/[id]/run` executes a workflow immediately via
  `runWorkflowNow`, honoring RBAC (`automation.execute`).

### Approvals
- Actions or modules call `requestApproval(ctx, {...})`, which resolves the
  applicable approval workflow (explicit id or default for the resource type),
  creates an `approval_requests` row plus ordered `approval_steps`, and notifies
  the first step's approvers.
- `decideApproval(ctx, id, "approve"|"reject", comment)` validates eligibility,
  records the step decision, advances or resolves the request, and emits
  audit + timeline + notification events.

## Data model (new tables)

- `automation_workflows`, `automation_actions`, `automation_runs`,
  `automation_run_logs`
- `approval_workflows`, `approval_requests`, `approval_steps`
- `ai_forecasts`, `ai_reports`, `ai_documents`, `ai_task_recommendations`,
  `ai_query_logs`, `ai_churn_predictions`

New enums: `automation_trigger_type`, `automation_status`,
`automation_run_status`, `automation_action_type`, `forecast_type`,
`ai_report_type`, `ai_document_type`, `ai_document_status`, `ai_task_status`,
`approval_status`, `churn_risk`. The existing timeline event enum is extended
with automation/approval/AI events.

## API surface

Automation: `/api/automation/workflows` (+ `[id]`, `[id]/run`, `[id]/toggle`),
`/api/automation/runs`, `/api/automation/catalog`, `/api/automation/ai/generate`,
`/api/automation/scheduled/run`.

Approvals: `/api/approvals/workflows` (+ `[id]`), `/api/approvals/requests`
(+ `[id]/approve`, `[id]/reject`).

AI: `/api/ai/forecasts`, `/api/ai/churn`, `/api/ai/insights`, `/api/ai/nl-query`,
`/api/ai/reports`, `/api/ai/documents` (+ `[id]/commit`), `/api/ai/tasks`,
`/api/ai/history`.

## UI

New dashboard pages under `src/app/dashboard/`:
`automation`, `automation/runs`, `approvals`, `ai/forecasts`, `ai/insights`,
`ai/query`, `ai/documents`, `ai/tasks`, `ai/history` — all linked from the
sidebar and rendered inside the shared `DashboardShell`.

## Safety & resilience

- Action executors capture per-action errors so one failing action never aborts
  a run; the run is marked `partial`/`failed` accordingly.
- `dispatchBusinessEvent` is fire-and-forget and swallows errors to protect the
  originating business request.
- AI libraries degrade gracefully: they use OpenAI when `OPENAI_API_KEY` is set
  and fall back to deterministic rules otherwise, so all features work offline.
