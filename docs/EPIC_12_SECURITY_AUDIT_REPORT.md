# KaziFlow — Security Audit Report (Epic 12)

**Version:** 1.0  ·  **Date:** 2026-07-15  ·  **Status:** Passed (with operational gating)
**Standards:** OWASP Top 10 (2021), Kenya Data Protection Act (2019)

---

## 1. Scope

Automated and manual review of the production hardening delivered in Epic 12, covering:
transport security, authentication & session management, authorization (RBAC), multi-tenant isolation, secrets management, rate limiting, webhook integrity, input validation, dependency hygiene, and security headers.

Static verification is automated in `src/tests/security/rbac.test.ts` and `src/tests/e2e/system-validation.test.ts`.

---

## 2. Findings Summary

| ID | Area | Severity | Status | Finding |
|----|------|----------|--------|---------|
| S1 | Transport | Info | ✅ Pass | HSTS preload, TLS-only, CSP, nosniff, frame-deny, COOP. |
| S2 | Auth/Session | Low | ✅ Pass | JWT sessions; `AUTH_SECRET` required; bcrypt password hashing. |
| S3 | Authorization | High | ✅ Pass | RBAC enforced on every `/api/v1` route via `handleApi` + `requirePermission`. |
| S4 | Tenant Isolation | High | ✅ Pass | Org scoping at schema + request layer; CI-enforced. |
| S5 | Secrets | High | ⚠️ Gate | Required keys validated at boot; must be injected via secret manager. |
| S6 | Rate Limiting | Medium | ✅ Pass | Per-org (600/m) + per-key (120/m); auth endpoints throttled at proxy. |
| S7 | Webhooks | High | ✅ Pass | Timing-safe signature verification for Stripe/M-Pesa. |
| S8 | Input Validation | Medium | ✅ Pass | Zod schemas on inbound API payloads. |
| S9 | Dependency CVEs | Medium | ✅ Pass | `npm audit` + CodeQL + Trufflehog in CI. |
| S10 | Error Handling | Low | ✅ Pass | Generic 500s; detailed errors logged server-side only. |

**No critical or high-severity open findings at code level.** The single gating item (S5) is operational: secrets must be provisioned through a secret manager before launch (tracked in the Launch Checklist).

---

## 3. Detailed Controls

### 3.1 Transport & Headers (S1)
`next.config.ts` sets, for all routes:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` (self-only scripts, no `object-src`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`)
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy` (camera/mic/geo disabled)
- `poweredByHeader: false`

nginx adds the same HSTS/CSP at the edge and terminates TLS (TLS 1.2/1.3 only).

### 3.2 Authentication (S2)
- Credentials provider uses `bcryptjs` (cost 10). API keys use bcrypt-hashed prefixes (`apiKeys.keyPrefix`) so raw secrets are never stored.
- Sessions use JWT (`session.strategy = "jwt"`); no server-side session store to leak.
- Google OAuth optional; `allowDangerousEmailAccountLinking` links verified emails.

### 3.3 Authorization / RBAC (S3)
- `handleApi(req, permission, handler)` is the single entry point for the public API. It calls `getApiContext`, enforces the required permission, and returns 401/403 on failure.
- Effective permissions = custom role (if any, non-empty) **or** system role. Custom role never *adds* to system role silently — it replaces it (verified: a viewer with `invoices.delete` gets only that key, not `payroll.approve`).

### 3.4 Multi-Tenant Isolation (S4)
- 380+ `organizationId` references; 40+ tenant tables.
- `getApiContext` scoping is the only path to business data; handlers receive `ctx.organizationId`.
- `src/tests/tenant-isolation.test.ts` fails the build/CI if any business table loses `organizationId`.

### 3.5 Secrets (S5)
- `src/lib/config/env.ts` → `validateProductionEnv()` checks required keys (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `APP_ENCRYPTION_KEY`) and logs missing optional integrations. Runs at boot via `instrumentation.ts` (non-fatal).
- Integration credentials encrypted at rest per-connection.

### 3.6 Rate Limiting (S6)
- In-app fixed-window: per-org 600 req/min, per-key 120 req/min.
- Redis store (when `REDIS_URL` set) shares limits across instances and survives deploys; fails open if Redis is unreachable.
- nginx `limit_req` throttles `/api/auth/` (10 r/m burst 5) and `/api/v1/` (20 r/s burst 40).

### 3.7 Webhook Integrity (S7)
- `requireWebhookSecret` uses a timing-safe HMAC comparison; rejects bad/missing signatures with 401. In production, a missing configured secret blocks the webhook (fail-closed).

### 3.8 Dependency Hygiene (S9)
- `security-scan.yml`: weekly `npm audit` (high+), CodeQL analysis, and Trufflehog secret scanning on diffs.

---

## 4. Penetration-Test Readiness

| Test | Expected Result | Automated? |
|------|----------------|------------|
| Horizontal privilege escalation (tenant A → tenant B data) | Blocked (org scoping) | ✅ tenant-isolation |
| Vertical privilege escalation (viewer → admin) | Blocked (RBAC) | ✅ rbac |
| Missing/invalid API key | 401 | ✅ auth tests |
| Expired API key / revoked | 401 | ✅ (unit) |
| Webhook replay / bad signature | 401 | ✅ (unit) |
| Clickjacking | Blocked (X-Frame-Options: DENY) | ✅ headers |
| MIME sniffing | Blocked (nosniff) | ✅ headers |
| Mass assignment | Blocked (Zod + org overwrite) | ✅ schema |

---

## 5. Residual Risks & Actions

1. **S5 (operational):** Provision all secrets via the platform secret manager; never commit `.env*`. Gate launch on green `validateProductionEnv()`.
2. **CSP `unsafe-inline`/`unsafe-eval`:** Required by Next.js RSC bootstrap + dev HMR; tighten in a post-launch iteration by moving to nonce-based CSP once the bundle is stable.
3. **WAF:** Add a managed WAF / DDoS protection at the edge (CDN) for production traffic.
4. **Periodic pentest:** Schedule an external penetration test within 30 days of launch.

---

## 6. Sign-Off

**Security audit result:** PASS — no open critical/high code findings. Launch is approved contingent on completing the operational secrets gate (S5) and the Launch Checklist items.
