import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { requirePermission } from "./core";
import { getCatalogEntry, isKnownProvider, CATALOG } from "./catalog";

export async function listMarketplace(
  ctx: ServerContext,
  search?: string
): Promise<{ installed: any[]; available: any[] }> {
  requirePermission(ctx, "integrations.view");

  const installedRows = await db.query.integrations.findMany({
    where: eq(integrations.organizationId, ctx.organizationId),
    columns: {
      id: true,
      provider: true,
      name: true,
      category: true,
      status: true,
      enabled: true,
      healthStatus: true,
      createdAt: true,
    },
  });

  const installedMap = new Map(installedRows.map((r) => [r.provider, r]));

  const installed = installedRows.map((r) => ({
    ...r,
    catalog: getCatalogEntry(r.provider),
    isInstalled: true,
  }));

  const term = (search || "").toLowerCase();
  const available = CATALOG.filter((entry) => {
    if (installedMap.has(entry.id)) return false;
    if (!term) return true;
    return (
      entry.name.toLowerCase().includes(term) ||
      entry.description.toLowerCase().includes(term) ||
      entry.category.toLowerCase().includes(term)
    );
  });

  return { installed, available };
}
