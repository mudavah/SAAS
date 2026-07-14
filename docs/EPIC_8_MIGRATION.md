# Epic 8 — Migration Summary

## Migration

- **File**: `drizzle/0014_ai_automation_platform.sql`
- **Journal**: registered as entry `0014` in `drizzle/meta/_journal.json`
- **Type**: additive / incremental only. No existing table is dropped, renamed,
  or destructively altered. Safe to run on production data.

Apply with the project's standard command:

```bash
npm run db:migrate
```

## New enums

| Enum | Values |
|------|--------|
| `automation_trigger_type` | event, schedule, manual |
| `automation_status` | draft, active, paused, error |
| `automation_run_status` | pending, running, success, partial, failed, skipped |
| `automation_action_type` | notify, create_task, create_invoice, create_quotation, create_purchase_order, send_email, create_timeline_event, update_record, webhook, ai_insight, ai_summarize, approval_request, delay |
| `forecast_type` | revenue, cash_flow, inventory, churn, sales |
| `ai_report_type` | financial_summary, profit_loss, cash_flow, tax_readiness, custom |
| `ai_document_type` | invoice, quotation, purchase_order |
| `ai_document_status` | draft, reviewed, created, rejected |
| `ai_task_status` | open, accepted, dismissed, completed |
| `approval_status` | pending, approved, rejected, cancelled, escalated |
| `churn_risk` | low, medium, high |

The existing **business timeline event enum** is extended (non-destructively)
with automation, approval and AI event types.

## New tables

### Automation
- **automation_workflows** — workflow definitions: `name`, `status`,
  `triggerType`, `triggerConfig` (jsonb), `conditions` (jsonb), run counters,
  `lastRunAt`, `lastRunStatus`. Scoped by `organizationId` + `userId`.
- **automation_actions** — ordered actions per workflow: `order`, `type`,
  `config` (jsonb), `conditions` (jsonb).
- **automation_runs** — one row per execution: `status`, `triggerType`,
  `startedAt`, `finishedAt`, action success/failure counters.
- **automation_run_logs** — per-action execution log: `actionType`, `order`,
  `status`, `input`/`output` (jsonb), `error`.

### Approvals
- **approval_workflows** — reusable definitions: `resourceType`, `steps` (jsonb),
  `isDefault`, `active`.
- **approval_requests** — a request instance: `title`, `resourceType`,
  `resourceId`, `status`, `currentStep`, `payload` (jsonb), decision metadata.
- **approval_steps** — ordered steps of a request: `stepOrder`, `label`,
  `approverRole`/`approverUserId`, `status`, `decidedBy`, `decidedAt`, `comment`.

### AI
- **ai_forecasts** — `type`, `model`, `horizonDays`, `data` (jsonb series/items),
  `confidence`, `summary`.
- **ai_reports** — `type`, `title`, `periodStart`/`periodEnd`, `content` (jsonb),
  `narrative`, `model`.
- **ai_documents** — `documentType`, `status`, `title`, `payload` (jsonb),
  `rationale`, `createdResourceId`/`createdResourceType` (link to the committed
  record).
- **ai_task_recommendations** — `title`, `description`, `priority`, `dueDate`,
  `category`, `resourceType`/`resourceId`, status.
- **ai_query_logs** — natural-language queries: `query`, `intent`,
  `entities` (jsonb), `plan` (jsonb), `answer`, `model`.
- **ai_churn_predictions** — `customerType`, `customerId`, `customerName`,
  `risk`, `score`, `factors` (jsonb), `recommendedAction`.

## Indexing & tenancy

Every new table carries `organizationId` (and `userId` where relevant) with
organization indexes for tenant-scoped queries, mirroring existing modules.
Foreign keys cascade on delete of the owning organization/user.

## Rollback

Because the migration is purely additive, rollback consists of dropping the new
tables and enums. No existing data is affected. Prefer forward-fixing over
rollback in production.
