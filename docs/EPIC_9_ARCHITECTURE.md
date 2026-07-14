# Epic 9 — Enterprise Analytics: Architecture Summary

## 1. Overview

The Enterprise Analytics module adds a centralized business intelligence layer to KaziFlow, providing real-time dashboards and reports across all existing modules (CRM, Procurement, POS, HR, Payroll, Compliance, Inventory).

## 2. Module Structure

```
src/
├── lib/
│   └── enterprise-analytics/
│       └── metrics.ts          # Service layer — read-side aggregates
├── app/
│   ├── api/
│   │   └── analytics/          # REST API routes
│   │       ├── route.ts
│   │       ├── sales/route.ts
│   │       ├── revenue/route.ts
│   │       ├── profit-loss/route.ts
│   │       ├── cash-flow/route.ts
│   │       ├── inventory/route.ts
│   │       ├── crm/route.ts
│   │       ├── procurement/route.ts
│   │       ├── hr/route.ts
│   │       ├── payroll/route.ts
│   │       ├── compliance/route.ts
│   │       ├── insights/route.ts
│   │       ├── dashboards/
│   │       ├── widgets/
│   │       ├── snapshots/
│   │       ├── reports/
│   │       ├── scheduled-reports/
│   │       └── export/route.ts
│   └── dashboard/
│       └── analytics/          # UI pages
│           ├── page.tsx
│           ├── executive/page.tsx
│           ├── sales/page.tsx
│           ├── revenue/page.tsx
│           ├── profit-loss/page.tsx
│           ├── cash-flow/page.tsx
│           ├── inventory/page.tsx
│           ├── crm/page.tsx
│           ├── procurement/page.tsx
│           ├── hr/page.tsx
│           ├── payroll/page.tsx
│           ├── compliance/page.tsx
│           ├── insights/page.tsx
│           ├── dashboards/
│           │   ├── page.tsx
│           │   └── [id]/page.tsx
│           └── reports/page.tsx
└── components/
    └── analytics/
        └── charts.tsx          # Reusable chart components
```

## 3. Database Schema

New tables added via incremental migration `drizzle/0015_enterprise_analytics.sql`:

| Table | Purpose |
|-------|---------|
| `analytics_dashboards` | User-created dashboards |
| `analytics_widgets` | Dashboard widgets |
| `analytics_snapshots` | Cached widget data |
| `analytics_scheduled_reports` | Scheduled report configs |
| `analytics_report_runs` | Report execution history |
| `analytics_insights` | AI-generated insights |

New enums:
- `analytics_widget_type` — kpi_card, line_chart, bar_chart, pie_chart, table, gauge, progress, heatmap, ranking
- `analytics_period` — today, week, month, quarter, year, custom
- `report_format` — pdf, excel, csv, json
- `schedule_frequency` — daily, weekly, monthly, quarterly, yearly
- `schedule_status` — active, paused, completed, failed
- `report_status` — pending, generating, completed, failed
- `analytics_insight_type` — trend, anomaly, forecast, recommendation, alert

Extended enum:
- `timeline_event_type` — added analytics events (dashboard.viewed, report.generated, report.exported, snapshot.computed, insight.generated)

## 4. Service Layer

`src/lib/enterprise-analytics/metrics.ts` exports 16 functions:

| Function | Description |
|----------|-------------|
| `getExecutiveSummary` | Cross-module KPI summary |
| `getSalesAnalytics` | POS sales totals and trends |
| `getRevenueAnalytics` | Payment analytics by method |
| `getProfitLossAnalytics` | Revenue vs expense analysis |
| `getCashFlowAnalytics` | Inflow/outflow tracking |
| `getInventoryAnalytics` | Stock value and movements |
| `getCrmAnalytics` | Leads, deals, pipeline |
| `getProcurementAnalytics` | Purchase order analytics |
| `getHrAnalytics` | Employee and attendance stats |
| `getPayrollAnalytics` | Payslip and payroll trends |
| `getComplianceAnalytics` | Alert and submission tracking |
| `getBranchPerformance` | Branch comparison (stub) |
| `getAiInsights` | AI-generated insights |
| `getKpiMetrics` | Computed KPI metrics |
| `getCustomReport` | Custom report builder (stub) |
| `getWidgetData` | Widget data retrieval (stub) |

All queries are:
- Organization-scoped (`organizationId`)
- Date-bounded when provided
- Null-safe with `COALESCE`
- Optimized with parallel `Promise.all`

## 5. API Layer

19 API route files under `src/app/api/analytics/`:
- 12 read endpoints for analytics data
- 4 CRUD endpoints for dashboards and widgets
- 3 endpoints for reports/snapshots/export

Auth pattern: `requireApiContext(req, "analytics.view")` for reads, `analytics.dashboards.manage` or `analytics.export` for mutations.

## 6. UI Layer

16 dashboard pages under `src/app/dashboard/analytics/`:
- Main hub with tab navigation
- Per-domain analytics pages (executive, sales, revenue, P&L, cash flow, inventory, CRM, procurement, HR, payroll, compliance)
- AI Insights page
- Custom Dashboards management
- Reports management

Chart components in `src/components/analytics/charts.tsx` wrap Recharts for consistency.

## 7. Security & Multi-Tenancy

- All API routes require `analytics.view` permission
- All database queries filter by `ctx.organizationId`
- Dashboard CRUD requires `analytics.dashboards.manage`
- Report generation/export requires `analytics.export`
- Scheduled report management requires `analytics.scheduled_reports.manage`

## 8. Integration Points

- **Business Timeline**: Analytics events logged to timeline
- **AI Copilot**: Insights feed from `analytics_insights` table
- **RBAC**: 4 new permissions added
- **Existing Modules**: Queries span payments, invoices, expenses, POS, inventory, CRM, procurement, HR, payroll, compliance tables
