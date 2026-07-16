# KaziFlow OS — Admin Guide

**Audience:** Organization owners, admins, and enterprise branch managers.

## 1. Admin Console

Access via **Settings → Organization** and the **Admin** and **Enterprise** dashboard sections. Admin capabilities are governed by RBAC (`src/lib/rbac`): 9 system roles, 60+ granular permissions, plus custom roles.

## 2. Roles & Permissions (RBAC)

- System roles: `owner`, `admin`, `manager`, `accountant`, `employee`, `viewer`, `hr`, `payroll`, `auditor` (plus custom roles).
- Permissions are a `Set<Permission>` evaluated at the API boundary via `requireApiContext(req, "permission")`.
- Custom roles: create via Settings → Team → Roles; assign to members.

## 3. Organization Settings

- Business details, currency, tax regime (VAT/KRA), eTIMS config.
- Security: session/JWT, API keys (`/dashboard/developer/keys`), webhook signatures.
- Encryption: integration credentials and eTIMS PINs are stored **encrypted at rest** (fail-closed gate in `src/lib/config/env.ts`).

## 4. AI Usage & Cost Monitoring

Every AI request increments the organization's monthly `usageRecords` row with:
- `ai_requests`, `ai_prompt_tokens`, `ai_completion_tokens`, `ai_cost_cents`, `ai_model`.

Plan limits (`PLAN_LIMITS` in `src/lib/utils.ts`):
| Plan | AI requests/month |
|------|-------------------|
| Free | 10 |
| Pro | 100 |
| Business | Unlimited |

Cost is estimated from model pricing (`src/lib/ai/usage.ts`, configurable). Responses served from cache (`cached: true`) incur no token cost. View cumulative spend via the audit log (`/dashboard/audit`) filtered by `category=ai`.

## 5. Audit Logs

Append-only, organization-scoped (`src/lib/audit.ts`, `auditLogs` table). Filter by resource type, action, and date. Export via the audit API.

## 6. Multi-Tenancy & Isolation

All business tables carry `organizationId` (NOT NULL enforced via backfill). Cross-tenant access is prevented at the query layer. Enterprise mode adds branches with inter-branch transfers and centralized procurement.

## 7. Disaster Recovery

See `docs/backup-dr.md`. Admins trigger and verify restores; PITR via managed PostgreSQL.
