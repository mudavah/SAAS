# KaziFlow — Help Center Documentation

> Companion to the in-app Help Center (`/help`). Covers end-user and admin topics, plus the production-operations surface introduced in Epic 12.

## Getting Started
- **Create your organization** — After sign-up, onboarding creates your personal tenant. Every record you create is scoped to it (multi-tenant isolation).
- **Invite your team** — `Team` → invite coworkers; assign Owner / Administrator / Manager / Accountant / Employee / Viewer. Permissions are enforced per action.
- **Choose a plan** — Free (5 invoices/mo, 10 clients) → Pro → Business (unlimited, M-Pesa, tax reports, API access).

## Invoicing & Payments
- Create invoices, add line items, send by email or link, export PDF.
- Accept M-Pesa STK push (Pro/Business); statuses update via webhook.
- Manage subscriptions under `Payments → Subscriptions` (Stripe).

## Security & Privacy
- **Multi-tenancy:** every business record carries an `organizationId`; all queries are scoped to your active organization. Cross-tenant access is blocked at the API layer.
- **RBAC:** a Viewer can read but never delete; only roles with the right permission can approve payroll or manage billing.
- **Data protection:** credentials encrypted at rest; HSTS/CSP enforced; payments via PCI-compliant Stripe and M-Pesa.
- See `Privacy Policy`, `Terms of Service`, `Cookie Policy`.

## Developer & Integrations
- **Public API** (`/api/v1/*`): Business plan + API key from `Settings → API Keys`. Scopes map to RBAC permissions; calls use `Bearer <key>`.
- **Integration Hub:** connect Google, Microsoft, QuickBooks, Xero, WhatsApp, SMS; credentials encrypted per-connection.
- **Webhooks:** register endpoints; payloads are signed for verification.

## Production Operations (Epic 12)
- **Health:** `/api/health/live`, `/api/health/ready`, `/api/health/full`.
- **Metrics:** `/api/metrics` (Prometheus format).
- **Launch Readiness:** `Dashboard → Admin → Launch Readiness` shows a live score.
- **Backups:** automated daily PostgreSQL dumps with verification; restore playbook in `PRODUCTION_DEPLOYMENT_CHECKLIST.md`.
- **Deployment:** Docker (`Dockerfile`, `docker-compose.yml`), GitHub Actions CI/CD, nginx TLS proxy.

## Troubleshooting
- **Can't access a feature?** Check your plan and role — some features (M-Pesa, API) require Pro/Business or the right permission.
- **Payment not reflecting?** Allow a minute for webhook processing; check `Payments` status.
- **Need help?** Email hello@kaziflow.co.ke.
