import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { loadProviderConfig } from "./engine";
import type { PaymentProviderType } from "./types";

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let r = 0;
  for (let i = 0; i < ab.length; i++) r |= ab[i] ^ bb[i];
  return r === 0;
}

/**
 * Authenticate a provider webhook (M-Pesa / Pesapal). These endpoints bypass
 * the session middleware, so they MUST be authenticated here.
 *
 * Resolution order for the expected secret:
 *   1. the organization-level `webhookSecret` for the referenced payment
 *   2. a global env override (`MPESA_WEBHOOK_SECRET` / `PESAPAL_WEBHOOK_SECRET`)
 *
 * The secret may be supplied via the `x-kf-webhook-secret` header, the
 * `Authorization: Bearer …` header, or a `?secret=` query param.
 *
 * Returns a NextResponse (401/503) when authentication fails, or `null` when
 * the request may proceed. When no secret is configured, the request is
 * allowed (with a warning) so existing deployments keep working until an
 * operator configures a secret.
 */
export async function requireWebhookSecret(
  req: Request,
  provider: PaymentProviderType,
  reference?: string
): Promise<NextResponse | null> {
  const provided =
    req.headers.get("x-kf-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(req.url).searchParams.get("secret") ||
    undefined;

  let expected: string | undefined;

  if (reference) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
      columns: { organizationId: true },
    });
    if (payment?.organizationId) {
      const cfg = await loadProviderConfig(payment.organizationId, provider);
      const orgSecret = (cfg?.webhookSecret as string | undefined) || undefined;
      if (orgSecret) expected = orgSecret;
    }
  }

  const envKey =
    provider === "mpesa"
      ? "MPESA_WEBHOOK_SECRET"
      : provider === "pesapal"
        ? "PESAPAL_WEBHOOK_SECRET"
        : null;
  if (envKey && process.env[envKey]) expected = expected || process.env[envKey];

  if (!expected) {
    console.warn(
      `[webhook] No webhook secret configured for provider "${provider}"; ` +
        `allowing unauthenticated webhook. Configure webhookSecret to secure it.`
    );
    return null;
  }

  if (!provided || !timingSafeEqual(provided, expected)) {
    console.warn(`[webhook] Rejected ${provider} webhook: bad/missing secret.`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
