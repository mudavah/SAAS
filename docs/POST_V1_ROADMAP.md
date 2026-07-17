# KaziFlow OS — Post-v1.0 Roadmap

> Generated: 2026-07-17. Phased plan building on the v1.0 commercial + enterprise foundation.

## Phase 1 — Hardening & Real Compliance (Weeks 1–4, post-launch)
- **Real KRA/eTIMS production integration**: replace simulated eTIMS submit with
  live KRA sandbox→prod endpoints; signed device invoices; ETIMS acknowledgement polling.
- **Tax-invoice PDF**: KRA-compliant invoice PDF generation (currently stores Stripe URL/pdf).
- **Delegation expiry cron**: scheduled job to auto-revoke expired delegations (currently lazy-eval).
- **Accounting real-sync**: pull chart-of-accounts / items from QuickBooks & Xero (currently connection test only).

## Phase 2 — Customer Success Depth (Weeks 5–8)
- **In-app announcement banner** component reading `announcements` (DB ready; UI widget pending).
- **Help Center rich content**: markdown KB articles + search indexing; public knowledge base.
- **Support SLA & assignment**: auto-route tickets by category/plan; agent inbox.
- **NPS & surveys**: scheduled feedback prompts; churn-risk signals.

## Phase 3 — Go-To-Market Scale (Weeks 9–12)
- **Marketplace monetization**: paid third-party integrations, install gating by plan,
  "request integration" queue (foundation: `integration_marketplace` table).
- **Email campaigns v2**: unsubscribe tokens, double opt-in, segmentation by plan/behavior,
  open/click tracking dashboards (columns already present in `email_campaigns`).
- **Localization (sw/en)**: KRA/Kenya + regional (TZ, UG, NG) tax regimes.
- **Partner/reseller portal**: delegated admin already supports branch + org scope.

## Phase 4 — Platform & Scale (Quarter 2)
- **Mobile apps** (iOS/Android) using existing Public API + API Keys.
- **Data residency**: region-pinned DB tenants (multi-region schema extension).
- **Enterprise SSO**: SAML/OIDC beyond current OAuth providers.
- **AI ops expansion**: anomaly detection on compliance + finance; predictive cash-flow.

## Success Metrics (track via Enterprise Analytics + GA4)
- Trial→paid conversion, coupon redemption rate, grace-period recovery rate.
- eTIMS submission success rate + mean retry count.
- Integration install counts (marketplace), API-key adoption.
- Support ticket resolution time, NPS.

## Backlog (research)
- White-label tenant theming.
- Marketplace developer SDK + revenue share.
- Offline-first POS sync for low-connectivity branches.
