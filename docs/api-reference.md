# KaziFlow OS — API Reference (Additions)

Base URL: `NEXT_PUBLIC_APP_URL`. All endpoints are organization-scoped and require an authenticated session or API key (`Authorization: Bearer <key>`).

## 1. Onboarding

### POST /api/onboarding/sample
Loads a small set of **demo data** (3 clients, 3 products, 1 sample invoice) into the caller's organization. Idempotent — guarded by `organizations.settings.onboardingSampleLoaded`.

**Response (200)**
```json
{
  "ok": true,
  "alreadyLoaded": false,
  "loaded": true,
  "summary": { "clients": 3, "products": 3, "invoices": 1 }
}
```

## 2. Business Timeline

### GET /api/timeline?eventType=&resourceType=&search=&startDate=&endDate=&page=&limit=
Paginated, filterable, searchable timeline (existing).

### GET /api/timeline/export?format=csv|json&eventType=&search=
Exports the timeline as **CSV** (default, `Content-Disposition: attachment`) or **JSON**. Honors the same filters as the list endpoint.

### GET /api/timeline/summary?days=30
AI-generated executive summary of recent activity, backed by real `getTimelineStats`.
```json
{
  "summary": "...",
  "generatedFromCache": false,
  "stats": { "total": 42, "since": "2026-06-16T...", "byEventType": [ ... ] }
}
```

## 3. AI

### POST /api/ai
Generates content. Now returns usage/cost metadata and records it.
```json
{
  "content": "...",
  "cached": false,
  "model": "gpt-4o-mini",
  "costCents": 0.12
}
```
Caching: deterministic requests are cached for `AI_CACHE_TTL_SECONDS` (default 24h); cache hits cost 0 tokens. On provider failure, a deterministic fallback is returned (HTTP 200).

## 4. Analytics (existing, documented for completeness)
- `GET /api/analytics/dashboards` + `POST` — custom dashboards.
- `GET /api/analytics/widgets?dashboardId=` — KPI widgets.
- `GET/POST /api/analytics/scheduled-reports` — saved & scheduled reports.
- `GET /api/analytics/forecasts`, `/api/ai/forecasts` — forecasting.
- `GET /api/analytics/export` — report export.

## 5. Public API (v1)
Versioned under `/api/v1/*` (invoices, clients, payments, payroll, procurement, CRM, etc.) with API-key auth, scopes, and rate limiting. See `docs/EPIC_7_API_DOCUMENTATION.md`.
