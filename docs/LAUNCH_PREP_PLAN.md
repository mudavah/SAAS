# KaziFlow OS — Commercial Launch & Enterprise Readiness Plan

> **Guiding principle:** Do **NOT** rewrite the app. Preserve existing architecture,
> business logic, DB schema conventions, RBAC, audit-logging and UI patterns. Every
> change is **additive and backward-compatible** — new tables, new columns (nullable),
> new routes, new pages, and completion of existing stubs.

## Context (current state, from codebase audit)

The codebase is far more mature than the stale `PRODUCTION_READINESS_REPORT.md`
(2026-07-10) implies. Almost every requested feature already has a foundation:

| Area | Current state |
|------|---------------|
| Compliance / eTIMS | Engine, health, calendar, alerts, reports all EXTANT. `POST /etims/invoices` is a stub; `/compliance/submissions` returns only aggregates (no per-record list/retry). |
| Enterprise | Branches, transfers, sales, approvals, reports EXTANT. Delegated admin = MISSING. Branch benchmarking = PARTIAL (stub in analytics). Enterprise audit viewer = MISSING. |
| Integrations | Hub, adapters, marketplace (in-memory), Public API + API Keys all EXTANT. WhatsApp/Calendar/Outlook/QuickBooks/Xero adapters are OAuth stubs (simulated). No `integration_marketplace` table. |
| Subscriptions | Upgrade EXTANT. Downgrade, coupons, grace period, tax invoices, failed-payment dunning, trial handling = MISSING/PARTIAL. |
| Customer Success | Help Center PARTIAL (static). Knowledge Base, Support Tickets, Feature Requests, Feedback, Announcements = MISSING. Notifications infra EXTANT. |
| Commercial | Landing page + SEO infra EXTANT. Standalone pricing page, demo, blog, product videos, analytics, Search Console tag = MISSING/PARTIAL. |

Build is clean; 18 migrations present (0000–0017); pattern = `drizzle-kit generate` + `db:push`.
`tsconfig` is `strict`. RBAC via `requireApiContext(req, perm)` + `requirePermission(ctx, perm)`.
Audit via `logAuditSafe`. Multi-tenant via `organizationId`.

---

## Workstreams (all additive)

### WS1 — Compliance Center completion
- **Schema (migration 0018):** add `etims_submission_queue` table (per-record submission state, retry count, nextRetryAt, lastError) so `/compliance/submissions` can return a real list + per-record retry. Add nullable `compliance_settings` is already present — wire it in.
- **Engine:** implement `listSubmissions()` + `retrySubmission(recordId)` in `src/lib/compliance/engine.ts`; honor `compliance_settings` (maxRetries, retryDelayMinutes, autoSubmit).
- **Routes:** `/api/compliance/submissions` → return records (paginated, filter by status); `/api/compliance/submissions/[id]/retry` (per-record retry). Keep `/submissions/retry` batch endpoint.
- **eTIMS:** replace stub in `src/app/api/etims/invoices/route.ts` POST to call `submitInvoice()` from engine (real path with simulated fallback).
- **Health Dashboard:** add `tax_reports.fileUrl` PDF export via existing `jsPDF` (tax report download).
- **UI:** submissions page — add per-record retry buttons + queue table; health page minor polish. Keep all existing pages.

### WS2 — Enterprise completion
- **Schema (migration 0018/0019):** `enterprise_delegations` (delegated admin: granter, delegate, scope=branch|org, permissions, expiresAt), `enterprise_audit_logs` VIEW is via existing `audit_logs` (category='enterprise'); add `/api/enterprise/audit` route + page instead of new table.
- **Delegated admin service** `src/lib/enterprise/delegations.ts` + RBAC helper; add permissions `enterprise.delegations.manage`.
- **Branch benchmarking:** fill the `getBranchPerformance()` stub in `src/lib/enterprise-analytics/metrics.ts` using `branchPerformanceSnapshots` (already used by `reports.ts`); add `/dashboard/enterprise/benchmarks` page + `/api/enterprise/reports/benchmarks`.
- **Enterprise audit:** `/api/enterprise/audit` (read, `category='enterprise'`) + `/dashboard/enterprise/audit` viewer with filters.
- **Approvals:** fix enterprise approvals dashboard `<a>` GET-navigation → client `fetch` POST (consistent with `/dashboard/approvals`). No logic change.

### WS3 — Integration Hub expansion
- **Marketplace persistence (migration 0019):** `integration_marketplace` catalog table (provider, name, category, configFields, secretFields, scopes, capabilities, status, featured, installCount). Seed from existing `CATALOG`. `listMarketplace()` reads DB.
- **Real-ish adapters (graceful):** enhance WhatsApp (Meta Cloud API HTTP send when token set, else simulated), Google Calendar/Outlook (real event list via OAuth token with fallback), QuickBooks/Xero (real connection test + account sync stub w/ fallback). Keep `degraded` path when unconfigured — no breaking change.
- **WhatsApp OAuth:** add `whatsapp` to `OAUTH_PROVIDERS` in `src/lib/integrations/oauth.ts` (catalog already lists it oauth2).
- **Webhooks:** keep inbound webhook receiver; document foundation. No breaking change.

### WS4 — Subscription lifecycle
- **Schema (migration 0020):** `coupons` (code, type%, amount, plan, maxRedemptions, expiresAt), `subscription_invoices` (Stripe invoice → local tax invoice record), `subscriptions.gracePeriodEnd` + `subscriptions.couponId` (nullable columns). 
- **Engine `src/lib/payments/subscriptions.ts`** (new, additive): create/cancel/downgrade, applyCoupon, handlePastDue (grace), generateTaxInvoice.
- **Stripe:** extend `createCheckoutSession` with `trialPeriodDays` + `coupon`; add webhook handlers `invoice.payment_failed`, `customer.subscription.trial_will_end`, `customer.subscription.paused/resumed`.
- **Routes:** `PATCH/DELETE /api/payments/subscriptions` (cancel at period end, downgrade), `/api/payments/subscriptions/coupons` (validate/apply), `/api/payments/subscriptions/invoices` (tax invoices), billing portal route.
- **UI:** subscriptions page — add Cancel, Downgrade, Coupon input, Trial/Grace badges, Billing Portal link; settings page parity.

### WS5 — Customer Success
- **Schema (migration 0021):** `support_tickets`, `feature_requests`, `feedback`, `announcements`, `knowledge_base_articles` (all org-scoped, nullable where safe).
- **Services + API** under `src/lib/customersuccess/` + `src/app/api/customersuccess/*`: tickets (CRUD), feature-requests (CRUD + vote), feedback (submit), announcements (admin create + broadcast via `createNotification`), knowledge-base (CRUD + search).
- **UI:** `/dashboard/help` (Help Center w/ search + KB), `/dashboard/support` (tickets + feedback + feature requests), `/dashboard/announcements` (admin). In-app announcement banner component reading `announcements`.
- **Help Center:** upgrade `src/app/help/page.tsx` to render KB articles from DB with search (keeps static fallback).

### WS6 — Commercial assets
- **Pricing page:** `src/app/pricing/page.tsx` (standalone, reuses `marketing/pricing`). Register in `STATIC_ROUTES`.
- **Demo:** `src/app/demo/page.tsx` + `/api/onboarding/demo` (seeds a throwaway demo tenant / or guided tour) — additive.
- **Blog foundation:** `src/app/blog` with `buildMetadata`, sample posts from a local content array (no CMS needed); register routes; sitemap picks them up.
- **Product videos:** `src/components/marketing/videos.tsx` + embed section on landing; reuse on demo.
- **Email campaigns foundation:** `src/lib/email/campaigns.ts` (queue + send via Resend, unsubscribe token) + `/api/marketing/campaigns` (admin). Add `email_campaign` tables (migration 0021) — entity type already referenced in validations.
- **Analytics + Search Console:** `src/components/seo/analytics.tsx` (GA4/Plausible via `NEXT_PUBLIC_ANALYTICS_ID` env, gated) + Google Search Console verification meta from env `GOOGLE_SITE_VERIFICATION`. Add to `layout.tsx`.
- **Public assets:** generate `public/icons/*` (referenced by manifest) — placeholder PNGs.

---

## Generated Reports (in `docs/`)
1. `docs/ENTERPRISE_READINESS_REPORT.md` — WS2 outcome, delegated admin, benchmarking, audit, RBAC coverage.
2. `docs/COMMERCIAL_READINESS_REPORT.md` — WS4/WS6 outcome, pricing, trials, coupons, tax invoices, marketing/SEO.
3. `docs/INTEGRATION_REPORT.md` — WS3 outcome, adapter matrix, marketplace, Public API/keys.
4. `docs/LAUNCH_CHECKLIST.md` — pre/during/post launch gates (build, migrate, env, webhooks, monitoring).
5. `docs/POST_V1_ROADMAP.md` — phased post-1.0 plan (real eTIMS prod, real accounting sync, mobile app, marketplace monetization, data residency).

## Backward-compatibility & stability guarantees
- New columns/tables are additive; new columns **nullable** or with safe defaults → existing rows unaffected.
- No edits to existing route/business logic except: (a) eTIMS stub→real (with simulated fallback preserved), (b) enterprise approvals `<a>`→`fetch` (no behavior change), (c) WhatsApp adapter real-send when configured (degraded fallback preserved).
- All new routes guarded by existing RBAC; all mutations call `logAuditSafe`.
- `npm run build` + `npm run lint` kept green; no `prepare:false`/CORS regressions.
- Migrations numbered sequentially (0018–0021); generated via `drizzle-kit generate` (no `db:push` auto-run on prod).

## Verification
- `npm run build` passes, `npm run lint` passes, `npm run test` (vitest) green.
- `drizzle-kit generate` produces migrations 0018–0021 without conflicts.
- Spot-check new routes return org-scoped data; new pages render.
