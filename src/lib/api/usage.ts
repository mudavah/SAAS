/**
 * KaziFlow Public API — usage tracking
 * ------------------------------------------------------------------
 * Records every authenticated API request to `api_usage` for observability,
 * quota monitoring, and billing. Called from the API handler wrapper.
 */
import { db } from "@/db";
import { apiUsage } from "@/db/schema";
import { logger } from "@/lib/logger";

export async function recordApiUsage(input: {
  apiKeyId: string;
  organizationId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
}): Promise<void> {
  try {
    await db.insert(apiUsage).values({
      apiKeyId: input.apiKeyId,
      organizationId: input.organizationId,
      endpoint: input.endpoint,
      method: input.method,
      statusCode: input.statusCode,
      responseTimeMs: input.responseTimeMs,
    });
  } catch (err) {
    logger.error("API usage recording failed:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  }
}
