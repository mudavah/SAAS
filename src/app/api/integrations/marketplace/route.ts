import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listMarketplace } from "@/lib/integrations";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;

  const { installed, available } = await listMarketplace(ctx, search);
  const installedByProvider = new Map(installed.map((i) => [i.provider, i]));

  const data = available.map((entry) => {
    const connection = installedByProvider.get(entry.id);
    return {
      id: entry.id,
      category: entry.category,
      name: entry.name,
      description: entry.description,
      authType: entry.authType,
      capabilities: entry.capabilities,
      docsUrl: entry.docsUrl,
      website: entry.website,
      configured: !!connection,
      connected: !!connection,
      integration: connection
        ? {
            id: connection.id,
            status: connection.status,
            healthStatus: connection.healthStatus,
          }
        : undefined,
    };
  });

  const categories = Array.from(new Set(available.map((e) => e.category)));

  return NextResponse.json({ data, categories });
}
