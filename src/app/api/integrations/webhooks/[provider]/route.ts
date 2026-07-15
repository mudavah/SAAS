import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  integrations,
  integrationWebhookLogs,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAdapter } from "@/lib/integrations/adapters";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const raw = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    const rows = await db.query.integrations.findMany({
      where: and(
        eq(integrations.provider, provider),
        eq(integrations.enabled, true)
      ),
    });

    let best: typeof rows[0] | undefined;
    for (const row of rows) {
      const adapter = getAdapter(row.provider);
      if (adapter?.handleWebhook) {
        const view = {
          integrationId: row.id,
          provider: row.provider,
          organizationId: row.organizationId,
          category: row.category,
          enabled: row.enabled,
          config: row.config as Record<string, unknown>,
          credentials: row.credentials as Record<string, unknown>,
        };
        const result = await adapter.handleWebhook(view, {
          raw,
          headers,
          signature: headers["x-hub-signature-256"] as string | null,
          verified: true,
        });
        if (result.ok) {
          best = row;
          break;
        }
      }
    }

    if (!best) {
      await db.insert(integrationWebhookLogs).values({
        integrationId: rows[0]?.id || "",
        organizationId: rows[0]?.organizationId || "",
        provider,
        event: headers["x-webhook-event"] || undefined,
        verified: false,
        payload: { raw } as any,
        headers: headers as any,
        status: "received",
      });
      return NextResponse.json({ received: true, message: "Webhook logged (no handler matched)." });
    }

    await db.insert(integrationWebhookLogs).values({
      integrationId: best.id,
      organizationId: best.organizationId,
      provider,
      event: headers["x-webhook-event"] || undefined,
      verified: true,
      payload: { raw } as any,
      headers: headers as any,
      status: "received",
    });

    return NextResponse.json({ received: true, provider });
  } catch (error) {
    logger.error("Webhook error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
