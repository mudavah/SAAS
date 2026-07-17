import { db } from "@/db";
import { integrations, integrationMarketplace } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { requirePermission } from "./core";
import { getCatalogEntry, isKnownProvider, CATALOG } from "./catalog";

/**
 * Persist the in-code CATALOG into the `integration_marketplace` table so the
 * marketplace can carry curated metadata (featured flags, coming_soon status,
 * install counts) without code changes. Idempotent — existing rows are kept.
 */
export async function seedMarketplaceFromCatalog(): Promise<number> {
  let seeded = 0;
  for (const entry of CATALOG) {
    const existing = await db.query.integrationMarketplace.findFirst({
      where: eq(integrationMarketplace.provider, entry.id),
    });
    if (existing) continue;
    await db.insert(integrationMarketplace).values({
      provider: entry.id,
      name: entry.name,
      category: entry.category,
      description: entry.description,
      authType: entry.authType,
      configFields: entry.configFields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder,
      })),
      secretFields: entry.secretFields.map((f) => ({
        key: f.key,
        label: f.label,
        placeholder: f.placeholder,
      })),
      scopes: entry.scopes,
      capabilities: entry.capabilities,
      status: "available",
      featured: false,
    });
    seeded++;
  }
  return seeded;
}

/** Read persisted marketplace metadata keyed by provider. */
async function loadMarketplaceMeta(): Promise<Map<string, any>> {
  const rows = await db.query.integrationMarketplace.findMany();
  return new Map(rows.map((r) => [r.provider, r]));
}

/** Bump the install count for a provider when a connection is created. */
export async function bumpMarketplaceInstall(provider: string): Promise<void> {
  await db
    .update(integrationMarketplace)
    .set({ installCount: sql`${integrationMarketplace.installCount} + 1`, updatedAt: new Date() })
    .where(eq(integrationMarketplace.provider, provider))
    .catch(() => undefined);
}

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
  }).map((entry) => ({ ...entry, isInstalled: false }));

  return { installed, available };
}
