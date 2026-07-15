/**
 * KaziFlow — production environment validation (Production Environment Config)
 * ------------------------------------------------------------------
 * Validates that the environment is correctly configured for production. This
 * is intentionally NON-FATAL: it logs warnings (and, in production, a single
 * aggregated error-level record) but never throws, so a missing optional key
 * can't crash boot. Operators get a clear checklist of what to set.
 *
 * Wire it from src/instrumentation.ts (register()) so it runs once at boot.
 */
import { logger } from "@/lib/logger";

export interface EnvCheck {
  key: string;
  required: boolean;
  present: boolean;
  secret: boolean;
  note: string;
}

const PROD_REQUIRED: { key: string; secret?: boolean; note: string }[] = [
  { key: "DATABASE_URL", note: "PostgreSQL connection string (pooled for prod)." },
  { key: "AUTH_SECRET", secret: true, note: "Session/JWT signing secret." },
  { key: "AUTH_URL", note: "Canonical app URL (https://...)." },
  { key: "NEXT_PUBLIC_APP_URL", note: "Public app base URL (https://...)." },
  { key: "APP_ENCRYPTION_KEY", secret: true, note: "Encrypts integration credentials at rest." },
];

const RECOMMENDED: { key: string; secret?: boolean; note: string }[] = [
  { key: "REDIS_URL", note: "Enables shared cache + distributed rate limiting." },
  { key: "STRIPE_SECRET_KEY", secret: true, note: "Required for subscriptions/billing." },
  { key: "STRIPE_WEBHOOK_SECRET", secret: true, note: "Verifies Stripe webhooks." },
  { key: "OPENAI_API_KEY", secret: true, note: "Powers AI features." },
  { key: "RESEND_API_KEY", secret: true, note: "Transactional email delivery." },
  { key: "SENTRY_DSN", secret: true, note: "Error monitoring (optional)." },
  { key: "MPESA_CONSUMER_KEY", secret: true, note: "M-Pesa STK push (optional)." },
  { key: "MPESA_CONSUMER_SECRET", secret: true, note: "M-Pesa STK push (optional)." },
];

function check(
  list: { key: string; secret?: boolean; note: string }[],
  required: boolean
): EnvCheck[] {
  return list.map(({ key, secret, note }) => ({
    key,
    required,
    secret: !!secret,
    note,
    present: !!(process.env[key] && process.env[key]!.trim().length > 0),
  }));
}

export function validateProductionEnv(): {
  ok: boolean;
  checks: EnvCheck[];
  missingRequired: string[];
  missingRecommended: string[];
} {
  const required = check(PROD_REQUIRED, true);
  const recommended = check(RECOMMENDED, false);
  const missingRequired = required.filter((c) => !c.present).map((c) => c.key);
  const missingRecommended = recommended
    .filter((c) => !c.present)
    .map((c) => c.key);

  const isProd = process.env.NODE_ENV === "production";
  const ok = missingRequired.length === 0;

  if (isProd) {
    if (!ok) {
      logger.error("Production environment incomplete", {
        missingRequired,
        missingRecommended,
      });
    } else if (missingRecommended.length) {
      logger.warn("Production environment ready (optional keys missing)", {
        missingRecommended,
      });
    } else {
      logger.info("Production environment validated");
    }
  }

  return {
    ok,
    checks: [...required, ...recommended],
    missingRequired,
    missingRecommended,
  };
}
