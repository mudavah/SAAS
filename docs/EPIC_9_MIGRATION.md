# Epic 9 — Enterprise Analytics: Migration Summary

## Migration File

`drizzle/0015_enterprise_analytics.sql`

## Strategy

Incremental migration applied on top of `0014_ai_automation_platform`. No existing tables or data are modified.

## New Enums

```sql
CREATE TYPE "analytics_widget_type" AS ENUM (...);
CREATE TYPE "analytics_period" AS ENUM (...);
CREATE TYPE "report_format" AS ENUM (...);
CREATE TYPE "schedule_frequency" AS ENUM (...);
CREATE TYPE "schedule_status" AS ENUM (...);
CREATE TYPE "report_status" AS ENUM (...);
CREATE TYPE "analytics_insight_type" AS ENUM (...);
```

## Extended Enum

```sql
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.dashboard.viewed';
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.report.generated';
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.report.exported';
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.snapshot.computed';
ALTER TYPE "timeline_event_type" ADD VALUE 'analytics.insight.generated';
```

## New Tables

| Table | Columns | Indexes |
|-------|---------|---------|
| `analytics_dashboards` | id, user_id, organization_id, name, description, layout, is_default, is_shared, shared_with_roles, created_at, updated_at | org, user, default |
| `analytics_widgets` | id, dashboard_id, organization_id, name, type, config, data_source, position, refresh_interval, created_at, updated_at | org, dashboard, type |
| `analytics_snapshots` | id, organization_id, widget_id, dashboard_id, period, period_start, period_end, data, computed_at | org, widget, dashboard, period, created |
| `analytics_scheduled_reports` | id, user_id, organization_id, name, description, report_type, config, format, frequency, status, recipients, last_run_at, next_run_at, created_at, updated_at | org, user, status, next_run |
| `analytics_report_runs` | id, scheduled_report_id, user_id, organization_id, report_type, format, status, period_start, period_end, parameters, result_url, error, file_size, row_count, started_at, completed_at, created_at | org, scheduled, status, created |
| `analytics_insights` | id, user_id, organization_id, type, title, description, severity, confidence, data, related_entity_type, related_entity_id, is_read, is_dismissed, expires_at, created_at | org, user, type, read, created |

## Applying the Migration

```bash
npm run db:migrate
```

## Schema Sync

The corresponding Drizzle schema definitions are already present in `src/db/schema.ts` (lines 3394–3552).

## Rollback

To rollback, drop the new tables and enums:

```sql
DROP TABLE IF EXISTS analytics_insights CASCADE;
DROP TABLE IF EXISTS analytics_report_runs CASCADE;
DROP TABLE IF EXISTS analytics_scheduled_reports CASCADE;
DROP TABLE IF EXISTS analytics_snapshots CASCADE;
DROP TABLE IF EXISTS analytics_widgets CASCADE;
DROP TABLE IF EXISTS analytics_dashboards CASCADE;
DROP TYPE IF EXISTS analytics_insight_type CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;
DROP TYPE IF EXISTS schedule_status CASCADE;
DROP TYPE IF EXISTS schedule_frequency CASCADE;
DROP TYPE IF EXISTS report_format CASCADE;
DROP TYPE IF EXISTS analytics_period CASCADE;
DROP TYPE IF EXISTS analytics_widget_type CASCADE;
```

Note: Rolling back the enum value additions to `timeline_event_type` is not supported by all PostgreSQL versions.
