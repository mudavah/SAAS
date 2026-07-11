# KaziFlow OS — Implementation Execution Plan

**Based on:** `.kilo/ARCHITECTURE_PLAN.md`  
**Date:** 2026-07-11  
**Status:** Ready for Execution

---

## Current State Summary

After codebase exploration, the following critical items from the Production Readiness Report have **already been fixed**:
- Invoice PATCH endpoint now uses `invoiceUpdateSchema` (`src/app/api/invoices/[id]/route.ts:41`)
- `getPaymentStats` uses SQL aggregations (`src/lib/payments/engine.ts:336-347`)
- `postgres` client no longer has `prepare: false` (`src/db/index.ts:14-20`)
- `next.config.ts` has `eslint.ignoreDuringBuilds: false` and security headers configured
- Unique index on `(organizationId, invoiceNumber)` exists (`src/db/schema.ts:373`)
- `paymentWebhookLogs` has unique index on `dedupeKey` with `onConflictDoNothing` in all webhook handlers
- Webhook auth helper (`src/lib/payments/webhook-auth.ts`) already implements signature verification

**Still requires implementation per Architecture Plan:**

| Category | Status | Items |
|----------|--------|-------|
| Security Hardening | ⚠️ Partial | CORS, encryption, payment link auth, org scoping on webhooks |
| Compliance Center | ❌ Not started | Schema extensions, APIs, pages, business logic |
| AI Business Copilot | ❌ Not started | Schema, APIs, pages, copilot logic |
| Business Timeline | ❌ Not started | Schema, APIs, page, integration |
| Mobile-First UX | ❌ Not started | Design system components |
| PWA | ❌ Not started | Manifest, service worker, config |
| Offline-First | ❌ Not started | IndexedDB, sync engine, hooks |
| Background Sync | ❌ Not started | Service worker integration |
| Guided Onboarding | ❌ Not started | Schema, APIs, pages, components |
| Monitoring | ❌ Not started | Logging, health checks, metrics |

---

## Phase 1: Foundation (Week 1)

### 1.1 Database Schema Extensions

**File:** `src/db/schema.ts` (1690 lines — append new tables)

Add the following new tables/enums:

```typescript
// Compliance Center
export const complianceHealthScoreEnum = pgEnum("compliance_health_score", ["excellent", "good", "fair", "poor"]);
export const complianceAlertSeverityEnum = pgEnum("compliance_alert_severity", ["info", "warning", "critical"]);
export const taxReportTypeEnum = pgEnum("tax_report_type", ["monthly", "quarterly", "annual"]);

export const complianceAlerts = pgTable("compliance_alerts", { ... });
export const taxReports = pgTable("tax_reports", { ... });
export const taxCalendar = pgTable("tax_calendar", { ... });
export const complianceSettings = pgTable("compliance_settings", { ... });

// AI Copilot
export const aiConversations = pgTable("ai_conversations", { ... });
export const aiMessages = pgTable("ai_messages", { ... });
export const aiInsights = pgTable("ai_insights", { ... });
export const aiBusinessHealth = pgTable("ai_business_health", { ... });

// Business Timeline
export const timelineEventTypeEnum = pgEnum("timeline_event_type", [ ... ]);
export const businessTimeline = pgTable("business_timeline", { ... });

// Onboarding
export const onboardingStepStatusEnum = pgEnum("onboarding_step_status", ["pending", "completed", "skipped"]);
export const onboardingSteps = pgTable("onboarding_steps", { ... });
export const onboardingProgress = pgTable("onboarding_progress", { ... });
export const onboardingTips = pgTable("onboarding_tips", { ... });
```

**Action:** Generate migration with `npm run db:generate`, review, then `npm run db:migrate`.

### 1.2 Security Hardening (CRITICAL — Blocking for Production)

#### 1.2.1 CORS Restriction

**File:** `src/lib/api/cors.ts`

**Current behavior:** Falls back to `Access-Control-Allow-Origin: *` when no allowed origins configured.

**Required change:**
- Require `KAZIFLOW_API_ALLOWED_ORIGINS` in production
- Reject unknown origins with 403
- Add `Vary: Origin` header

#### 1.2.2 Sensitive Field Encryption

**Files affected:**
- `src/db/schema.ts` — `etimsConfig.apiKey`, `etimsConfig.pin`, `paymentProviderConfigs.apiKey`, `paymentProviderConfigs.apiSecret`, `paymentProviderConfigs.webhookSecret`, `paymentProviderConfigs.passkey`
- `src/lib/crypto.ts` — add encryption utilities
- `src/db/index.ts` — add query extension for transparent encryption

**Approach:** Application-level AES-256-GCM encryption using `ENCRYPTION_KEY` env var.
- Create `encryptField()` / `decryptField()` helpers
- Create Drizzle query extension `encryptedText()` 
- Backfill script: `scripts/backfill-encryption.mjs`

#### 1.2.3 Webhook Organization Scoping

**Files:**
- `src/app/api/payments/webhooks/mpesa/route.ts:53` — add `organizationId` to payment lookup
- `src/app/api/payments/webhooks/pesapal/route.ts:48` — add `organizationId` to payment lookup

**Current:** `where: eq(payments.reference, webhookEvent.paymentId)`  
**Required:** `where: and(eq(payments.reference, ...), eq(payments.organizationId, payment.organizationId))`

#### 1.2.4 Payment Links Auth Check

**File:** `src/app/api/payments/links/[id]/route.ts`

**Current:** Public GET endpoint returns all link data.  
**Required:** Either:
- Add optional session auth and return full data for authenticated users, OR
- Return only public-safe fields (no internal IDs, no org info) for unauthenticated requests

#### 1.2.5 Stripe Webhook Consolidation

**Files:**
- `src/app/api/stripe/webhook/route.ts` — keep as primary handler
- `src/app/api/payments/webhooks/stripe/` — empty directory, remove

**Action:** Delete the empty stripe webhook directory, ensure `/api/stripe/webhook` handles all Stripe events.

#### 1.2.6 Request Correlation IDs

**New file:** `src/lib/request-id.ts`

- Generate `X-Request-ID` on every request
- Pass through all internal calls
- Include in logs and audit entries

#### 1.2.7 Health Check Endpoints

**New files:**
- `src/app/api/health/route.ts` — `GET /api/health` (app health)
- `src/app/api/health/ready/route.ts` — `GET /api/health/ready` (DB connectivity)
- `src/app/api/health/live/route.ts` — `GET /api/health/live` (liveness probe)

### 1.3 Encryption Backfill

**New file:** `scripts/backfill-encryption.mjs`

- Read all `etimsConfig` rows with plaintext `pin`/`apiKey`
- Encrypt values using `ENCRYPTION_KEY`
- Update rows atomically
- Same for `paymentProviderConfigs`

---

## Phase 2: Core Features (Week 2-3)

### 2.1 Compliance Center

#### 2.1.1 Business Logic

**New files:**
- `src/lib/compliance/engine.ts` — Submission orchestration, retry logic, health scoring
- `src/lib/compliance/analytics.ts` — Compliance analytics calculations
- `src/lib/compliance/reports.ts` — Tax report generation
- `src/lib/compliance/calendar.ts` — Tax deadline calculations
- `src/lib/compliance/alerts.ts` — Alert generation and management

#### 2.1.2 API Routes

**New files:**
- `src/app/api/compliance/health/route.ts`
- `src/app/api/compliance/alerts/route.ts`
- `src/app/api/compliance/reports/route.ts`
- `src/app/api/compliance/calendar/route.ts`
- `src/app/api/compliance/validate/route.ts`
- `src/app/api/compliance/submissions/route.ts`
- `src/app/api/compliance/submissions/retry/route.ts`
- `src/app/api/compliance/analytics/route.ts`
- `src/app/api/compliance/invoice/[id]/route.ts`

All use `requireApiContext(req, "compliance.view")` pattern.

#### 2.1.3 Pages

**New files:**
- `src/app/dashboard/compliance/page.tsx` — Already exists, enhance with health score
- `src/app/dashboard/compliance/config/page.tsx` — eTIMS configuration
- `src/app/dashboard/compliance/reports/page.tsx` — Tax reports
- `src/app/dashboard/compliance/calendar/page.tsx` — Tax deadline calendar
- `src/app/dashboard/compliance/alerts/page.tsx` — Compliance alerts
- `src/app/dashboard/compliance/submissions/page.tsx` — Failed submission queue
- `src/app/dashboard/compliance/history/page.tsx` — Submission history

### 2.2 AI Business Copilot

#### 2.2.1 Core Logic

**New files:**
- `src/lib/ai/copilot.ts` — Context-aware prompt engineering with org data
- `src/lib/ai/insights.ts` — Scheduled insight generation
- `src/lib/ai/health-score.ts` — Business health scoring algorithm

**Preserve:** Existing `src/lib/ai.ts` `generateAiContent()` for backward compat.

#### 2.2.2 API Routes

**New files:**
- `src/app/api/ai/copilot/route.ts`
- `src/app/api/ai/conversations/route.ts`
- `src/app/api/ai/conversations/[id]/route.ts`
- `src/app/api/ai/insights/route.ts`
- `src/app/api/ai/health-score/route.ts`

#### 2.2.3 Pages

**New files:**
- `src/app/dashboard/ai/page.tsx` — Already exists, replace with copilot interface
- `src/app/dashboard/ai/insights/page.tsx`
- `src/app/dashboard/ai/history/page.tsx`

### 2.3 Business Timeline

#### 2.3.1 API Routes

**New files:**
- `src/app/api/timeline/route.ts` — Paginated, filterable timeline
- `src/app/api/timeline/stats/route.ts` — Activity statistics

#### 2.3.2 Page

**New file:**
- `src/app/dashboard/timeline/page.tsx`

#### 2.3.3 Integration Points

Add timeline event emission to:
- Invoice create/update/delete
- Payment received
- Inventory stock movement
- Expense recorded
- Journal entry posted
- Subscription changed
- Notification created
- Audit log entry
- Compliance submission
- AI insight generated
- Team member invited

### 2.4 Guided Onboarding

#### 2.4.1 API Routes

**New files:**
- `src/app/api/onboarding/steps/route.ts`
- `src/app/api/onboarding/progress/route.ts`
- `src/app/api/onboarding/tips/route.ts`

#### 2.4.2 Pages

**New files:**
- `src/app/onboarding/welcome/page.tsx`
- `src/app/onboarding/organization/page.tsx`
- `src/app/onboarding/business-details/page.tsx`
- `src/app/onboarding/branches/page.tsx`
- `src/app/onboarding/tax-config/page.tsx`
- `src/app/onboarding/etims/page.tsx`
- `src/app/onboarding/payments/page.tsx`
- `src/app/onboarding/customers/page.tsx`
- `src/app/onboarding/products/page.tsx`
- `src/app/onboarding/invoice/page.tsx`
- `src/app/onboarding/team/page.tsx`
- `src/app/onboarding/complete/page.tsx`

#### 2.4.3 Components

**New files:**
- `src/components/onboarding/stepper.tsx`
- `src/components/onboarding/progress-bar.tsx`
- `src/components/onboarding/help-tooltip.tsx`

---

## Phase 3: UX & PWA (Week 3-4)

### 3.1 Mobile-First UX

**New component files:**
- `src/components/ui/bottom-sheet.tsx`
- `src/components/ui/swipeable-card.tsx`
- `src/components/ui/pull-to-refresh.tsx`
- `src/components/ui/mobile-table.tsx`
- `src/components/ui/touch-button.tsx`

**Modify existing:**
- `src/components/dashboard/sidebar.tsx` — Add Compliance Center, Timeline, AI Insights nav items
- All dashboard pages — Add mobile-first responsive breakpoints

### 3.2 PWA

**New files:**
- `public/manifest.json`
- `public/sw.js`
- `src/components/pwa/install-prompt.tsx`

**Modify:**
- `next.config.ts` — Add PWA plugin if needed, service worker config

### 3.3 Offline-First Architecture

**New files:**
- `src/lib/offline/db.ts` — IndexedDB wrapper
- `src/lib/offline/schema.ts` — Entity stores
- `src/lib/sync/engine.ts` — Sync engine with delta tracking
- `src/lib/sync/conflict.ts` — Conflict resolution
- `src/hooks/use-offline.ts` — React hooks
- `src/hooks/use-sync-status.ts`
- `src/hooks/use-optimistic-mutation.ts`

**API Routes:**
- `src/app/api/sync/push/route.ts`
- `src/app/api/sync/pull/route.ts`
- `src/app/api/sync/conflict/route.ts`
- `src/app/api/sync/status/route.ts`

### 3.4 Background Synchronization

Extend `src/lib/sync/engine.ts` with:
- Background upload/download
- Queue prioritization
- Progress tracking
- Integrity verification (hash checksums)
- Automatic recovery

---

## Phase 4: Hardening & Launch (Week 4-5)

### 4.1 Performance Optimization

- Replace in-memory rate limiter with Redis (`src/lib/api/rate-limit.ts`)
- Add pagination to all list endpoints
- Add request timeouts on external API calls
- Implement caching layer for org/permission lookups
- Code splitting for heavy components
- Virtual scrolling for large tables

### 4.2 Monitoring & Observability

**New files:**
- `src/lib/logger.ts` — Structured logging with correlation IDs
- `src/lib/metrics.ts` — API latency, DB query metrics
- `src/app/api/health/ready/route.ts`
- `src/app/api/health/live/route.ts`

### 4.3 Security Review

- Audit all API endpoints for org scoping
- Verify encryption on sensitive fields
- Test webhook idempotency
- Load test critical paths
- Penetration testing checklist

### 4.4 Testing

- Integration tests for webhooks, payments, invoices
- Component tests for critical UI
- E2E tests for onboarding flow

---

## Agent Assignment Matrix

| Agent | Workstream | Phase | Priority |
|-------|-----------|-------|----------|
| Agent 1 | Compliance Center | 2 | High |
| Agent 2 | AI Business Copilot | 2 | High |
| Agent 3 | Business Timeline | 2 | Medium |
| Agent 4 | Mobile-First UX + PWA | 3 | High |
| Agent 5 | Offline-First + Background Sync | 3 | Medium |
| Agent 6 | Guided Onboarding | 2 | Medium |
| Agent 7 | Security Hardening + Performance | 1, 4 | Critical |
| Agent 8 | Monitoring + Observability | 4 | Medium |

---

## Execution Order

1. **Agent 7** starts immediately (Phase 1 security fixes)
2. **Agents 1, 2, 3, 6** start in parallel after schema migration (Phase 2)
3. **Agents 4, 5** start after core features (Phase 3)
4. **Agent 8** + all agents for hardening (Phase 4)

---

## Deliverables Checklist

1. Architecture Change Report
2. Database Migration Summary
3. API Change Log
4. UI Change Log
5. Security Review
6. Performance Benchmark Report
7. Testing Report
8. Production Readiness Report
9. Technical Debt Report
10. Recommendations for Epic 2 (CRM)

---

## Environment Variables to Add

```env
# Encryption
ENCRYPTION_KEY=<32+ byte hex key>

# Redis (for rate limiting, caching, sessions)
REDIS_URL=redis://localhost:6379
# OR
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# Monitoring
SENTRY_DSN=https://...
LOG_LEVEL=info

# Feature Flags
NEXT_PUBLIC_PWA_ENABLED=true
NEXT_PUBLIC_OFFLINE_ENABLED=true
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Schema migration conflicts | Use `db:generate` + manual review of all migrations |
| Breaking existing APIs | Maintain backward-compatible routes; deprecate gradually |
| Performance regression | Benchmark before/after each change |
| PWA compatibility | Progressive enhancement, not blocking |
| Offline data conflicts | Last-write-wins with UI resolution modal |

---

## Success Criteria

- [ ] All existing functionality operational
- [ ] Compliance Center production-ready
- [ ] AI Business Copilot fully integrated
- [ ] Business Timeline implemented
- [ ] Mobile-first experience significantly improved
- [ ] PWA installable
- [ ] Offline mode functional
- [ ] Background sync reliable
- [ ] Guided onboarding complete
- [ ] Dashboard <2s load
- [ ] Security posture improved (all CRITICAL items resolved)
- [ ] Monitoring operational
- [ ] No regressions
