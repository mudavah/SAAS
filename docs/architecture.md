# KaziFlow OS — Architecture Overview

## 1. System Topology

```
Client (Next.js App Router, SSR/RSC)
  ├─ Marketing / Legal (static, SEO-optimized: sitemap.xml, robots.txt, OG/JSON-LD)
  ├─ Dashboard (auth-guarded, mobile-first, dark mode, guided tours)
  └─ API routes (server-side, RBAC-enforced)
        ├─ Auth (NextAuth v5: credentials + Google OAuth)
        ├─ Business modules (invoices, clients, payments, inventory, payroll, HR, procurement, CRM, compliance/eTIMS)
        ├─ AI (OpenAI with caching + cost monitoring + fallback)
        ├─ Analytics (custom dashboards, KPI widgets, forecasting, scheduled reports)
        ├─ Timeline (append-only event feed + export + AI summary)
        └─ Public API v1 (API-key auth, scopes, rate limiting)

PostgreSQL (Drizzle ORM, multi-tenant via organizationId)
Redis (optional: shared cache + distributed rate limiting)
External: Stripe, M-Pesa Daraja, eTIMS, Resend, OpenAI
```

## 2. Multi-Tenancy

Every business table carries `organizationId` (NOT NULL, backfilled). Queries always filter by `organizationId`. Enterprise mode layers branches on top.

## 3. Request Flow & Auth

1. `middleware.ts` guards protected routes.
2. `getApiContext(req)` / `requireApiContext(req, perm)` resolve the caller, load org membership, and evaluate RBAC permissions.
3. Each mutation writes an append-only `auditLogs` row (`logAuditSafe`).

## 4. New Modules Added in This Refinement

### Onboarding (`src/lib/onboarding/*`)
- `service.ts` — multi-step wizard persistence (idempotent upserts).
- `steps.ts` — canonical `ONBOARDING_STEPS` source of truth.
- `sample-data.ts` — demo data seeder (idempotent, org-scoped).

### UX components (`src/components/ux/*`)
- `guided-tour.tsx` — `data-tour`-driven overlay; localStorage completion gate.
- `contextual-help.tsx` — inline accessible help popover.
- `empty-state.tsx` — consistent empty dashboard pattern.
- `ui/skeleton.tsx` — loading skeletons (card/table/header).

### SEO (`src/lib/seo/*`, `src/app/{sitemap,robots,og}*`)
- `config.ts` — canonical site config.
- `metadata.ts` — `buildMetadata()`, JSON-LD builders.
- `sitemap.ts` / `robots.ts` — dynamic, indexable routes.
- `og/route.tsx` — edge-rendered OG/Twitter image (`next/og`).

### AI Ops (`src/lib/ai/*`)
- `lib/ai.ts` — `generateAiContentDetailed()` with deterministic caching, token estimation, cost tracking, hardened prompt, structured fallback.
- `lib/ai/usage.ts` — `recordAiUsage()`, `getAiUsageAnalytics()`, cost estimation.

### Timeline (`src/lib/timeline.ts` + new routes)
- Existing filter/search/pagination; **added** `export` (CSV/JSON) and `summary` (AI) endpoints.

## 5. Caching Strategy

`src/lib/cache` provides a `CacheStore` abstraction: in-memory LRU by default, Redis when `REDIS_URL` is set. Used for AI responses, hot read paths (`src/lib/api/optimize.ts`), and rate-limit state. Fail-open.

## 6. Security Posture

CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` set in `next.config.ts`. Webhook signature verification, encrypted-at-rest secrets, RBAC, and append-only audit complete the posture. (See prior `SECURITY_AUDIT_REPORT.md`.)
