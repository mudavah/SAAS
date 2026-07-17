# KaziFlow OS — Launch Checklist

> Generated: 2026-07-17. Pre/during/post launch gates for v1.0 commercial launch.

## Pre-Launch (Blocking)

### Build & Quality
- [x] `npm run build` passes (340 static pages)
- [x] `npm run lint` clean
- [x] `npm run test` green (284 passed, incl. tenant-isolation)
- [x] `drizzle-kit generate` → `0018_launch_readiness.sql` reviewed & matches schema
- [x] TypeScript `strict` compiles

### Database
- [ ] Run `npm run db:push` (or apply `0018_launch_readiness.sql`) against **staging**
- [ ] Run against **production** only after staging validation
- [ ] Verify new enums/tables created; existing rows unaffected (nullable columns)
- [ ] Seed marketplace: `POST /api/integrations/marketplace/seed` (admin)

### Secrets & Config (env)
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` set (prod keys)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set
- [ ] `DATABASE_URL` points to prod
- [ ] `RESEND_API_KEY` (email campaigns + notifications)
- [ ] `NEXT_PUBLIC_ANALYTICS_ID` (GA4/Plausible) — optional, gated
- [ ] `GOOGLE_SITE_VERIFICATION` (Search Console)
- [ ] `M-PESA_*` / `ETIMS_*` (KRA sandbox → prod credentials)
- [ ] `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (prod URL)

### Webhooks
- [ ] Stripe webhook endpoint registered in Stripe Dashboard → `/api/stripe/webhook`
- [ ] New events enabled: `invoice.payment_failed`, `customer.subscription.trial_will_end`,
      `customer.subscription.paused/resumed`
- [ ] Webhook signature verification live (`STRIPE_WEBHOOK_SECRET`)

### Monitoring & Ops
- [ ] Error tracking (Sentry/Datadog) wired
- [ ] Health endpoint `/api/health` monitored
- [ ] DB backup schedule confirmed
- [ ] Rate limits / WAF in front of Public API + auth

### Content & Assets
- [ ] Replace placeholder `public/icons/*.png` with brand assets
- [ ] Pricing page copy + plan limits finalized
- [ ] Blog seeded with ≥3 launch posts
- [ ] Demo tenant/guided tour validated
- [ ] Legal pages (ToS, Privacy) published & linked

## During Launch
- [ ] Deploy to production (blue-green / staged rollout)
- [ ] Smoke test: signup → create org → upgrade (Stripe test mode) → downgrade/cancel
- [ ] Smoke test: submit eTIMS invoice (sandbox) → queue → retry
- [ ] Smoke test: create support ticket + announcement broadcast
- [ ] Watch error rate + latency dashboards for 60 min
- [ ] Confirm audit logs populating for enterprise + billing actions

## Post-Launch (Non-blocking)
- [ ] Submit sitemap to Google Search Console
- [ ] Verify GA4/Plausible receiving events
- [ ] Send welcome email campaign (batch, with unsubscribe)
- [ ] Gather feedback via in-app widget → `customer_feedback`
- [ ] Review branch benchmarking accuracy vs. real snapshot data
- [ ] Schedule delegation-expiry cron job

## Rollback Plan
- [ ] DB migration `0018` is additive → rollback = disable new routes (feature flag),
      no destructive change to existing data
- [ ] Keep prior build artifact for instant redeploy
