import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, paymentProviderConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProvider, getAvailableProviders, saveProviderConfig, loadProviderConfig } from "@/lib/payments/engine";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "integrations.configure");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const available = getAvailableProviders();
  const orgConfigs = await db.query.paymentProviderConfigs.findMany({
    where: eq(paymentProviderConfigs.organizationId, ctx.organizationId),
  });

  const configs: Record<string, { enabled: boolean; isDefault: boolean; environment: string }> = {};
  for (const config of orgConfigs) {
    configs[config.provider] = {
      enabled: config.enabled,
      isDefault: config.isDefault,
      environment: config.environment,
    };
  }

  return NextResponse.json({ available, configs });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "integrations.configure");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const { provider, config: providerConfig } = body;

    if (!provider || !providerConfig) {
      return NextResponse.json({ error: "Provider and config are required" }, { status: 400 });
    }

    await saveProviderConfig(ctx.organizationId, provider, providerConfig);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment provider config error:", error);
    return NextResponse.json({ error: "Failed to save provider config" }, { status: 500 });
  }
}
