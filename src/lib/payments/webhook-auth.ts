import { NextResponse } from "next/server";
import crypto from "crypto";
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

function computeSignature(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export interface WebhookAuthResult {
  /** null means "allow" (no error); a NextResponse means reject. */
  error: NextResponse | null;
  /** Organization resolved from the payment reference, if any. */
  organizationId?: string | null;
}

export async function requireWebhookSecret(
  req: Request,
  provider: PaymentProviderType,
  reference?: string,
  rawBody?: string,
): Promise<WebhookAuthResult> {
  let expected: string | undefined;
  let organizationId: string | null | undefined;

  if (reference) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
      columns: { organizationId: true },
    });
    if (payment?.organizationId) {
      organizationId = payment.organizationId;
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
    if (process.env.NODE_ENV === "production") {
      return {
        error: NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 401 }
        ),
        organizationId,
      };
    }
    console.warn(
      `[webhook] No webhook secret configured for provider "${provider}"; ` +
        "allowing unauthenticated webhook. Configure webhookSecret to secure it."
    );
    return { error: null, organizationId };
  }

  const signature = req.headers.get("x-kf-signature");
  if (signature && rawBody) {
    const expectedSig = computeSignature(rawBody, expected);
    if (!timingSafeEqual(signature, expectedSig)) {
      return {
        error: NextResponse.json({ error: "Invalid signature" }, { status: 401 }),
        organizationId,
      };
    }
    return { error: null, organizationId };
  }

  const provided =
    req.headers.get("x-kf-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    undefined;

  if (!provided || !timingSafeEqual(provided, expected)) {
    console.warn(`[webhook] Rejected ${provider} webhook: bad/missing secret.`);
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      organizationId,
    };
  }

  return { error: null, organizationId };
}
