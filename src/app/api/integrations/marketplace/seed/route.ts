import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { seedMarketplaceFromCatalog } from "@/lib/integrations/marketplace";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "integrations.manage");
  if ("error" in res) return res.error;
  const seeded = await seedMarketplaceFromCatalog();
  return NextResponse.json({ ok: true, seeded });
}
