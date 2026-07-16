import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { seedSampleData } from "@/lib/onboarding/sample-data";

/**
 * POST /api/onboarding/sample
 * Loads a small set of demo data (clients, products, one invoice) into the
 * caller's organization. Idempotent — safe to call repeatedly.
 */
export async function POST(req: Request) {
  const res = await getApiContext(req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const result = await seedSampleData(ctx);
    return NextResponse.json({
      ok: true,
      alreadyLoaded: result.alreadyLoaded,
      loaded: result.loaded,
      summary: {
        clients: result.clients,
        products: result.products,
        invoices: result.invoices,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load sample data" },
      { status: 500 }
    );
  }
}
