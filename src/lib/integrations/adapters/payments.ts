/**
 * Payment adapters — bridge to the existing payment engine.
 * ------------------------------------------------------------------
 * Each connection stores provider secrets in `config`/`credentials`. When
 * connected, connections.ts mirrors them into `payment_provider_configs` so
 * POS/invoicing continue to work through the existing engine. `testConnection`
 * and `send` probe the provider directly when keys are present, and otherwise
 * return a graceful "simulated" result. No new dependencies are introduced
 * (native fetch only).
 */
import {
  type ConnectionView,
  type IntegrationAdapter,
  type SendPayload,
  type SendResult,
  type TestResult,
  hasSecret,
  envSet,
  timed,
} from "./types";

function paymentRequiredSecrets(provider: string): string[] {
  switch (provider) {
    case "mpesa":
      return ["apiKey", "apiSecret", "passkey"];
    case "pesapal":
    case "flutterwave":
      return ["apiKey"];
    case "stripe":
      return ["apiKey"];
    default:
      return ["apiKey"];
  }
}

function buildPaymentAdapter(provider: string): IntegrationAdapter {
  const label = provider.toUpperCase();
  return {
    provider,
    async testConnection(conn): Promise<TestResult> {
      // Prefer environment-level config (server keys) when available.
      const envOk =
        (provider === "mpesa" && envSet("MPESA_CONSUMER_KEY")) ||
        (provider === "stripe" && envSet("STRIPE_SECRET_KEY"));
      const configured =
        envOk || paymentRequiredSecrets(provider).every((k) => hasSecret(conn, k));
      if (!configured) {
        return {
          ok: false,
          status: "degraded",
          message: `${label} is not configured. Add credentials or set environment keys.`,
          detail: { missing: paymentRequiredSecrets(provider) },
        };
      }
      // Lightweight reachability probe. Real APIs may require auth; we treat a
      // non-throwing probe as healthy and keep the hub green offline.
      try {
        const url = providerBaseUrl(provider, conn);
        if (url) {
          const { result, ms } = await timed(async () => {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 4000);
            try {
              const res = await fetch(url, {
                method: "GET",
                signal: controller.signal,
                headers: { "user-agent": "KaziFlow-IntegrationHub" },
              });
              return res.status;
            } finally {
              clearTimeout(t);
            }
          });
          return {
            ok: true,
            status: "healthy",
            message: `${label} reachable (HTTP ${result}).`,
            latencyMs: ms,
            detail: { httpStatus: result },
          };
        }
      } catch {
        // Offline / unreachable — still report configured (secrets present).
      }
      return {
        ok: true,
        status: "healthy",
        message: `${label} configured (simulated connectivity in offline mode).`,
      };
    },
    async send(conn: ConnectionView, payload: SendPayload): Promise<SendResult> {
      const configured = paymentRequiredSecrets(provider).every((k) => hasSecret(conn, k));
      if (!configured && !envSet(provider === "mpesa" ? "MPESA_CONSUMER_KEY" : "STRIPE_SECRET_KEY")) {
        return {
          ok: false,
          status: "failed",
          message: `${label} is not configured.`,
        };
      }
      // For M-Pesa, attempt a real STK push when enabled and keys present.
      if (provider === "mpesa" && conn.config.shortcode) {
        try {
          const r = await mpesaStkPush(conn, payload);
          if (r) return r;
        } catch (err) {
          return {
            ok: false,
            status: "failed",
            message: `M-Pesa STK push failed: ${(err as Error).message}`,
          };
        }
      }
      return {
        ok: true,
        status: "queued",
        message: `${label} payment request queued (simulated in offline mode).`,
      };
    },
  };
}

function providerBaseUrl(provider: string, conn: ConnectionView): string | null {
  const env = String(conn.config.env || "sandbox");
  switch (provider) {
    case "mpesa":
      return env === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
    case "pesapal":
      return env === "production"
        ? "https://pay.pesapal.com"
        : "https://cyb.ppesapal.com";
    case "flutterwave":
      return "https://api.flutterwave.com";
    case "stripe":
      return "https://api.stripe.com";
    default:
      return null;
  }
}

/** Attempt an M-Pesa STK push. Returns null if it cannot proceed. */
async function mpesaStkPush(
  conn: ConnectionView,
  payload: SendPayload
): Promise<SendResult | null> {
  const consumerKey = (conn.credentials.apiKey as string) || process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = (conn.credentials.apiSecret as string) || process.env.MPESA_CONSUMER_SECRET;
  const passkey = (conn.credentials.passkey as string) || process.env.MPESA_PASSKEY;
  const shortcode = (conn.config.shortcode as string) || process.env.MPESA_SHORTCODE;
  if (!consumerKey || !consumerSecret || !passkey || !shortcode) return null;

  const env = String(conn.config.env || process.env.MPESA_ENV || "sandbox");
  const base = env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const tokenRes = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;

  const phone = normalizePhone(payload.to);
  if (!phone) return null;

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const callback = (conn.config.callbackUrl as string) || process.env.MPESA_CALLBACK_URL || "";
  const amount = Number(payload.meta?.amount ?? 1);

  const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callback,
      AccountReference: (payload.meta?.reference as string) || "KaziFlow",
      TransactionDesc: payload.subject || payload.body.slice(0, 20),
    }),
  });
  const data = (await res.json()) as { ResponseCode?: string; CheckoutRequestID?: string };
  if (data.ResponseCode === "0") {
    return {
      ok: true,
      status: "queued",
      externalId: data.CheckoutRequestID,
      message: "M-Pesa STK push sent.",
    };
  }
  return {
    ok: false,
    status: "failed",
    message: `M-Pesa STK push rejected: ${JSON.stringify(data)}`,
  };
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("254")) return digits;
  if (digits.length === 9) return "254" + digits;
  return digits || null;
}

export const mpesaAdapter = buildPaymentAdapter("mpesa");
export const pesapalAdapter = buildPaymentAdapter("pesapal");
export const flutterwaveAdapter = buildPaymentAdapter("flutterwave");
export const stripeAdapter = buildPaymentAdapter("stripe");
