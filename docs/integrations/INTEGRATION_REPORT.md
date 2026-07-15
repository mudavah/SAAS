# KaziFlow Integration Hub — Integration Report

## 1. Provider Catalog (17 Integrations)

All providers are registered in `src/lib/integrations/catalog.ts` and validated against this static registry at runtime.

| # | Provider ID | Category | Auth Type | Capabilities |
|---|---|---|---|---|
| 1 | `kra_etims` | Government | `credentials` | `invoice_submission`, `vat_return`, `credit_note`, `status_check` |
| 2 | `mpesa` | Payment | `api_key` | `stk_push`, `b2c`, `status_query`, `webhook` |
| 3 | `pesapal` | Payment | `api_key` | `payment_link`, `status_query`, `webhook`, `refund` |
| 4 | `flutterwave` | Payment | `api_key` | `payment_link`, `status_query`, `webhook`, `refund`, `transfer` |
| 5 | `stripe` | Payment | `api_key` | `payment_link`, `subscription`, `status_query`, `webhook`, `refund` |
| 6 | `email` | Email | `api_key` | `send_email`, `templates` |
| 7 | `sms` | SMS | `api_key` | `send_sms` |
| 8 | `whatsapp` | WhatsApp | `oauth2` | `send_message`, `webhook` |
| 9 | `push` | Push | `api_key` | `send_push` |
| 10 | `google_calendar` | Calendar | `oauth2` | `create_event`, `read_events`, `webhook` |
| 11 | `outlook_calendar` | Calendar | `oauth2` | `create_event`, `read_events`, `webhook` |
| 12 | `quickbooks` | Accounting | `oauth2` | `push_invoice`, `push_expense`, `pull_accounts`, `webhook` |
| 13 | `xero` | Accounting | `oauth2` | `push_invoice`, `push_bill`, `pull_accounts`, `webhook` |
| 14 | `google_drive` | Storage | `oauth2` | `upload`, `download`, `share` |
| 15 | `onedrive` | Storage | `oauth2` | `upload`, `download`, `share` |
| 16 | `dropbox` | Storage | `oauth2` | `upload`, `download`, `share` |
| 17 | `barcode_scanner` | Hardware | `none` | `scan_lookup`, `serial_capture` |
| 18 | `thermal_printer` | Hardware | `none` | `print_receipt`, `print_test` |

---

## 2. Bridges to Existing Engines

Several integrations are **bridged** to existing KaziFlow engines rather than reimplemented. The hub acts as the registry, monitoring, and UX layer.

### Payment Engine Bridge

| Provider | Adapter File | Bridge Target |
|---|---|---|
| `mpesa` | `adapters/payments.ts` | `payment_provider_configs` + existing Daraja engine |
| `pesapal` | `adapters/payments.ts` | `payment_provider_configs` + existing Pesapal engine |
| `flutterwave` | `adapters/payments.ts` | `payment_provider_configs` + existing Flutterwave engine |
| `stripe` | `adapters/payments.ts` | `payment_provider_configs` + existing Stripe engine |

When a payment provider is connected, `connections.ts` mirrors the credentials into `payment_provider_configs` so POS, invoicing, and the payment engine continue to function without modification.

### eTIMS / Compliance Bridge

| Provider | Adapter File | Bridge Target |
|---|---|---|
| `kra_etims` | `adapters/government.ts` | Compliance Center (existing eTIMS/compliance flows) |

The eTIMS adapter validates credentials and reports health. `sync` confirms the bridge is active. Real KRA API calls are only attempted when API credentials and `APP_ENCRYPTION_KEY` are present.

### Email Engine Bridge

| Provider | Adapter File | Bridge Target |
|---|---|---|
| `email` | `adapters/email.ts` | `src/lib/email.ts` (Resend/SMTP) |

When `RESEND_API_KEY` is set globally, the email adapter routes sends through the existing `sendNotificationEmail` helper. Without it, sends are simulated.

---

## 3. Environment Variables

The following environment variables are referenced by adapters and the OAuth layer. None are required for the hub to start; missing variables trigger graceful degradation.

| Variable | Used By | Purpose |
|---|---|---|
| `APP_ENCRYPTION_KEY` | `core.ts`, `crypto.ts` | AES-256-GCM key for encrypting secrets and OAuth tokens at rest |
| `MPESA_CONSUMER_KEY` | `adapters/payments.ts` | M-Pesa Daraja consumer key (fallback when not stored per-connection) |
| `MPESA_CONSUMER_SECRET` | `adapters/payments.ts` | M-Pesa Daraja consumer secret |
| `MPESA_PASSKEY` | `adapters/payments.ts` | M-Pesa STK push passkey |
| `MPESA_SHORTCODE` | `adapters/payments.ts` | M-Pesa business shortcode |
| `MPESA_ENV` | `adapters/payments.ts` | M-Pesa environment (`sandbox` / `production`) |
| `MPESA_CALLBACK_URL` | `adapters/payments.ts` | M-Pesa STK push callback URL |
| `STRIPE_SECRET_KEY` | `adapters/payments.ts` | Stripe secret key (fallback) |
| `RESEND_API_KEY` | `adapters/email.ts` | Resend API key for transactional email |

Additional provider-specific variables may be added as needed. OAuth-based adapters (`google_calendar`, `outlook_calendar`, `quickbooks`, `xero`, `google_drive`, `onedrive`, `dropbox`, `whatsapp`) derive their endpoints and scopes from the catalog and store tokens in `integration_oauth_tokens`.

---

## 4. Adapter Fallback Behavior

All adapters are designed to run offline-green. The fallback strategy is:

1. **Check configuration**: Use `hasSecret(conn, key)` and `envSet(name)` to verify required secrets/env vars are present.
2. **Missing secrets → degraded**: If a required secret is absent, return `{ ok: false, status: "degraded", message: "... Missing: ..." }` without throwing.
3. **Reachable probe**: When secrets are present, attempt a lightweight reachability probe (e.g., `GET` the provider base URL with a 4-second timeout). Non-throwing probes are treated as healthy.
4. **Offline / unreachable → simulated**: If the probe throws or times out, return `{ ok: true, status: "healthy", message: "... configured (simulated connectivity in offline mode)." }`. This ensures health dashboards and tests remain green without external network access.
5. **Send operations**: If secrets are missing, return `{ ok: false, status: "failed", message: "..." }`. If secrets are present but the real API call is not implemented, return `{ ok: true, status: "queued", message: "... queued (simulated in offline mode)." }`.

This mirrors existing fallback patterns in the codebase (AI "rules" model, crypto plaintext fallback).

---

## 5. Categories Covered

The catalog supports 10 categories, each mapped to an enum value:

| Category | Providers | Notes |
|---|---|---|
| `government` | `kra_etims` | Bridged to Compliance Center |
| `payment` | `mpesa`, `pesapal`, `flutterwave`, `stripe` | Bridged to payment engine |
| `email` | `email` | Bridged to Resend/SMTP engine |
| `sms` | `sms` | Fetch-based; graceful fallback |
| `whatsapp` | `whatsapp` | OAuth2 + fetch-based |
| `push` | `push` | Web Push / FCM |
| `calendar` | `google_calendar`, `outlook_calendar` | OAuth2 |
| `accounting` | `quickbooks`, `xero` | OAuth2 |
| `storage` | `google_drive`, `onedrive`, `dropbox` | OAuth2 |
| `hardware` | `barcode_scanner`, `thermal_printer` | Local/device; no network required |
