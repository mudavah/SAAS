# KaziFlow OS — Architecture Transformation Plan
**Epic:** Platform Evolution to Production-Grade Business Operating System  
**Date:** 2026-07-11  
**Architect:** Principal Software Architect (Kilo)  
**Scope:** Evolve existing KaziFlow into enterprise-ready SaaS platform

---

## Executive Summary

This plan transforms the existing KaziFlow foundation into a world-class Business Operating System while preserving 100% backward compatibility. The existing codebase already has strong multi-tenant isolation, RBAC, payment engines, and audit logging. We will extend and harden every layer.

**Strategy:** Incremental enhancement with parallel workstreams. No technology replacements. No rewrites.

---

## Current State Assessment

| Component | Status | Strength |
|-----------|--------|----------|
| Multi-tenancy | ✅ Solid | Org-scoped tables, tenant isolation |
| RBAC | ✅ Excellent | 9 roles, 60+ permissions, custom roles |
| Auth | ✅ Strong | NextAuth v5, JWT, email + Google OAuth |
| Payments | ✅ Modular | M-Pesa, Stripe, Pesapal, Bank Transfer abstraction |
| eTIMS | ⚠️ Basic | Exists but needs full Compliance Center |
| AI | ⚠️ Isolated | Basic content generation, needs copilot |
| Database | ⚠️ Needs hardening | Missing constraints, nullable org IDs |
| Security | ❌ Critical gaps | CORS, webhooks, mass assignment, secrets |
| PWA/Offline | ❌ Missing | No offline capability |
| Monitoring | ❌ Missing | No structured logging, metrics |
| Mobile UX | ⚠️ Needs improvement | Basic responsive, needs mobile-first redesign |

---

## Workstream 1: Compliance Center

**Goal:** Transform basic eTIMS into flagship Compliance Center.

### Changes
1. **Schema Extensions** (`db/schema.ts`)
   - Add `complianceHealthScore` to organizations
   - Add `complianceAlerts` table
   - Add `taxReports` table
   - Add `taxCalendar` table
   - Add `complianceSettings` table
   - Add `complianceAnalytics` view
   - Make `etimsConfig.apiKey` / `pin` encrypted at app level

2. **API Routes** (`app/api/compliance/*`)
   - `GET /api/compliance/health` — Compliance health score
   - `GET /api/compliance/alerts` — Active alerts
   - `GET /api/compliance/reports` — Tax reports
   - `POST /api/compliance/reports` — Generate tax report
   - `GET /api/compliance/calendar` — Tax calendar
   - `POST /api/compliance/validate` — PIN/invoice validation
   - `GET /api/compliance/submissions` — Submission history with filters
   - `POST /api/compliance/submissions/retry` — Retry failed submissions
   - `GET /api/compliance/analytics` — Compliance analytics
   - `GET /api/compliance/invoice/[id]` — Per-invoice compliance status

3. **Pages** (`app/dashboard/compliance/*`)
   - `page.tsx` — Compliance dashboard (health score, stats, recent submissions)
   - `config/page.tsx` — eTIMS configuration
   - `reports/page.tsx` — Tax reports list and generation
   - `calendar/page.tsx` — Tax deadline calendar
   - `alerts/page.tsx` — Compliance alerts management
   - `submissions/page.tsx` — Failed submission queue with retry
   - `history/page.tsx` — Full submission history with filters

4. **Business Logic** (`lib/compliance/*`)
   - `engine.ts` — Submission orchestration, retry logic, scoring
   - `analytics.ts` — Compliance analytics calculations
   - `reports.ts` — Tax report generation
   - `calendar.ts` — Tax deadline calculations
   - `alerts.ts` — Alert generation and management

### Backward Compatibility
- Existing `etimsConfig` and `etimsInvoices` tables preserved
- Existing eTIMS pages enhanced, not replaced
- All existing eTIMS API routes maintained

---

## Workstream 2: AI Business Copilot

**Goal:** Replace isolated AI page with unified, organization-aware copilot.

### Changes
1. **Schema Extensions** (`db/schema.ts`)
   - Add `aiConversations` table
   - Add `aiMessages` table
   - Add `aiInsights` table
   - Add `aiBusinessHealth` table

2. **API Routes** (`app/api/ai/*`)
   - `POST /api/ai/copilot` — Unified copilot endpoint
   - `GET /api/ai/conversations` — Conversation history
   - `POST /api/ai/conversations` — New conversation
   - `GET /api/ai/insights` — AI-generated insights
   - `POST /api/ai/insights` — Generate new insight
   - `GET /api/ai/health-score` — Business health score

3. **Pages** (`app/dashboard/ai/*`)
   - `page.tsx` — Redesigned copilot interface
   - `insights/page.tsx` — AI-generated insights dashboard
   - `history/page.tsx` — Conversation history

4. **Core Logic** (`lib/ai/*`)
   - `copilot.ts` — Context-aware prompt engineering with org data
   - `insights.ts` — Scheduled insight generation
   - `health-score.ts` — Business health scoring algorithm

### Copilot Capabilities
- Financial Q&A with org context
- Inventory predictions
- Tax insights
- Revenue forecasting
- Cash flow analysis
- Customer analytics
- Business health scoring
- Natural language search across business data

### Backward Compatibility
- Existing `/api/ai` endpoint maintained for backward compatibility
- Existing AI page enhanced with copilot features
- Legacy `generateAiContent` preserved

---

## Workstream 3: Business Timeline

**Goal:** Create centralized activity aggregation feed.

### Changes
1. **Schema Extensions** (`db/schema.ts`)
   - Add `businessTimeline` table
   - Add `timelineEventTypes` enum

2. **API Routes** (`app/api/timeline/*`)
   - `GET /api/timeline` — Paginated, filterable timeline
   - `GET /api/timeline/stats` — Activity statistics

3. **Pages** (`app/dashboard/timeline/page.tsx`)
   - Unified timeline with filtering, search, pagination
   - Live updates via polling

4. **Integration Points**
   - Invoice events → timeline
   - Payment events → timeline
   - Inventory events → timeline
   - Expense events → timeline
   - Bookkeeping events → timeline
   - Subscription events → timeline
   - Notification events → timeline
   - Audit log events → timeline
   - Compliance events → timeline
   - AI events → timeline
   - User events → timeline

### Backward Compatibility
- All existing modules unchanged
- Timeline is additive read-only aggregation

---

## Workstream 4: Mobile-First UX

**Goal:** Redesign all interfaces for mobile-first usage.

### Changes
1. **Design System** (`components/ui/*`)
   - Mobile-first card variants
   - Touch-optimized buttons (min 44px tap targets)
   - Swipeable cards
   - Bottom sheet components
   - Mobile table patterns
   - Pull-to-refresh containers

2. **Navigation**
   - Bottom tab bar for mobile
   - Hamburger menu refinement
   - Breadcrumb optimization for mobile

3. **Forms**
   - Single-column layouts on mobile
   - Floating labels
   - Larger input fields
   - Native date/time pickers
   - Optimized select components

4. **Tables**
   - Card view on mobile
   - Horizontal scroll with sticky first column
   - Expandable rows

5. **Loading & States**
   - Skeleton screens
   - Progressive loading
   - Touch feedback animations

6. **Accessibility**
   - ARIA labels
   - Focus management
   - Screen reader support
   - High contrast mode

7. **Dark Mode**
   - Consistent dark theme across all components
   - Proper contrast ratios

### Backward Compatibility
- All existing desktop views preserved
- Responsive breakpoints added, not replaced

---

## Workstream 5: Progressive Web App

**Goal:** Transform KaziFlow into production-ready PWA.

### Changes
1. **Manifest** (`public/manifest.json`)
   - App name, icons, theme colors
   - Standalone display mode
   - Orientation lock
   - Scope configuration

2. **Service Worker** (`public/sw.js`)
   - Cache-first for static assets
   - Network-first for API calls
   - Offline fallback pages
   - Background sync registration

3. **Installation**
   - Install prompt component
   - BeforeInstallPromptEvent handling
   - iOS add-to-homescreen guidance

4. **Next.js Config** (`next.config.ts`)
   - PWA plugin integration
   - Cache headers for static assets
   - Service worker path configuration

### Backward Compatibility
- All existing functionality unchanged
- PWA is additive enhancement

---

## Workstream 6: Offline-First Architecture

**Goal:** Implement IndexedDB powered offline storage with sync.

### Changes
1. **Database Layer** (`lib/offline/*`)
   - IndexedDB wrapper (`idb-keyval` or custom)
   - Schema versioning
   - Entity stores: clients, products, invoices, payments, settings

2. **Sync Engine** (`lib/sync/*`)
   - Operation queue
   - Delta tracking
   - Conflict detection
   - Conflict resolution strategies
   - Retry with exponential backoff
   - Duplicate detection via UUID

3. **React Integration** (`hooks/use-offline.ts`)
   - `useOnlineStatus` — connectivity detection
   - `useSyncStatus` — sync progress
   - `useOfflineQueue` — queue management
   - `useOptimisticMutation` — optimistic updates

4. **API Routes** (`app/api/sync/*`)
   - `POST /api/sync/push` — Upload queued changes
   - `GET /api/sync/pull` — Download server changes
   - `POST /api/sync/conflict` — Resolve conflicts
   - `GET /api/sync/status` — Current sync state

5. **Components**
   - Offline banner
   - Sync progress indicator
   - Conflict resolution modal
   - Manual sync trigger

### Backward Compatibility
- Existing online flows unchanged
- Offline mode is enhancement for supported operations

---

## Workstream 7: Background Synchronization

**Goal:** Implement reliable background sync with integrity verification.

### Changes
1. **Sync Engine** (`lib/sync/*`)
   - Delta sync (only changed records)
   - Background upload/download
   - Queue prioritization
   - Progress tracking
   - Integrity verification (hash checksums)
   - Automatic recovery on failure
   - Transaction replay

2. **Service Worker Integration**
   - Background sync API
   - Periodic background sync
   - Push notification triggers

### Backward Compatibility
- Existing API routes unchanged
- Sync is enhancement layer

---

## Workstream 8: Guided Business Onboarding

**Goal:** Replace empty dashboard with onboarding wizard.

### Changes
1. **Schema Extensions** (`db/schema.ts`)
   - Add `onboardingSteps` table
   - Add `onboardingProgress` table
   - Add `onboardingTips` table

2. **API Routes** (`app/api/onboarding/*`)
   - `GET /api/onboarding/steps` — Available steps
   - `GET /api/onboarding/progress` — Current progress
   - `POST /api/onboarding/complete` — Mark step complete
   - `GET /api/onboarding/tips` — Contextual tips

3. **Pages** (`app/onboarding/*`)
   - `welcome/page.tsx` — Welcome screen
   - `organization/page.tsx` — Create organization
   - `business-details/page.tsx` — Business info
   - `branches/page.tsx` — Branch setup
   - `tax-config/page.tsx` — Tax configuration
   - `etims/page.tsx` — eTIMS setup
   - `payments/page.tsx` — M-Pesa/Payment setup
   - `customers/page.tsx` — Import customers
   - `products/page.tsx` — Import products
   - `invoice/page.tsx` — Create first invoice
   - `team/page.tsx` — Invite employees
   - `complete/page.tsx` — Setup complete

4. **Components**
   - Onboarding progress stepper
   - Contextual help tooltips
   - Skip steps option
   - Resume incomplete onboarding

### Backward Compatibility
- Existing onboarding enhanced, not replaced
- Legacy onboarding flow maintained

---

## Workstream 9: Performance Optimization

**Goal:** Dashboard <2s, excellent Lighthouse, great Core Web Vitals.

### Changes
1. **Database**
   - Add missing indexes
   - Optimize queries (use SQL aggregations)
   - Connection pooling verification

2. **Caching**
   - Redis for rate limiting (replace in-memory)
   - Query result caching for org permissions
   - Static asset caching headers

3. **Frontend**
   - Code splitting optimization
   - Dynamic imports for heavy components
   - Virtual scrolling for large tables
   - Image optimization (next/image)
   - Font optimization
   - Bundle size analysis and reduction

4. **API**
   - Pagination on all list endpoints
   - Request deduplication
   - Response compression

5. **Security Fixes** (from Production Readiness Report)
   - CORS origin restriction
   - Stripe webhook consolidation
   - M-Pesa webhook org validation
   - Mass assignment protection
   - Unique invoice number constraint
   - Remove `prepare: false`
   - Webhook signature verification
   - Payment link auth
   - Race condition idempotency
   - Request size limits

### Backward Compatibility
- All existing API endpoints maintained
- Performance improvements are transparent

---

## Workstream 10: Monitoring & Observability

**Goal:** Production monitoring and alerting.

### Changes
1. **Logging** (`lib/logger.ts`)
   - Structured logging with Pino
   - Correlation IDs
   - Log levels configuration

2. **Health Checks** (`app/api/health/*`)
   - `GET /api/health` — App health
   - `GET /api/health/ready` — DB connectivity
   - `GET /api/health/live` — Liveness probe

3. **Metrics** (`lib/metrics/*`)
   - API latency tracking
   - Database query metrics
   - Background job metrics
   - Error rate tracking

4. **Error Monitoring**
   - Sentry integration
   - Error boundary components
   - Source map configuration

5. **Alerting**
   - Alert webhook endpoints
   - Threshold configuration

### Backward Compatibility
- Existing error handling preserved
- Monitoring is additive

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Database schema migrations
- Security hardening (all CRITICAL items)
- Compliance Center schema
- AI Copilot schema
- Business Timeline schema
- Onboarding schema
- Monitoring foundation

### Phase 2: Core Features (Week 2-3)
- Compliance Center pages and APIs
- AI Business Copilot core
- Business Timeline
- Guided Onboarding
- Offline-first storage

### Phase 3: UX & PWA (Week 3-4)
- Mobile-first redesign
- PWA implementation
- Background sync
- Performance optimization

### Phase 4: Hardening & Launch (Week 4-5)
- Security review
- Performance benchmarks
- Testing
- Monitoring integration
- Production readiness report

---

## Technology Stack (Preserved)

| Layer | Current | Preserved |
|-------|---------|-----------|
| Framework | Next.js 15 | ✅ |
| Language | TypeScript | ✅ |
| Database | PostgreSQL + Drizzle ORM | ✅ |
| Auth | NextAuth v5 | ✅ |
| Styling | Tailwind CSS + shadcn/ui | ✅ |
| Payments | Stripe + M-Pesa + Pesapal | ✅ |
| AI | OpenAI API | ✅ |
| Email | Resend | ✅ |
| ORM | Drizzle ORM | ✅ |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Schema migration conflicts | Use `db:generate` + manual review |
| Breaking existing APIs | Maintain backward-compatible routes |
| Performance regression | Benchmark before/after each change |
| PWA compatibility | Progressive enhancement, not blocking |
| Offline data conflicts | Operational transform / last-write-wins with UI resolution |

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
- [ ] Security posture improved
- [ ] Monitoring operational
- [ ] No regressions

---

## Deliverables (Post-Implementation)

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

## Agent Assignment

| Agent | Workstream | Priority |
|-------|-----------|----------|
| Agent 1 | Compliance Center | High |
| Agent 2 | AI Business Copilot | High |
| Agent 3 | Business Timeline | Medium |
| Agent 4 | Mobile-First UX + PWA | High |
| Agent 5 | Offline-First + Background Sync | Medium |
| Agent 6 | Guided Onboarding | Medium |
| Agent 7 | Security Hardening + Performance | Critical |
| Agent 8 | Monitoring + Observability | Medium |

All agents operate on the existing codebase. No file deletion. Backward compatibility mandatory.
