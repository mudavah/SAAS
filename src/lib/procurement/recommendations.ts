/**
 * KaziFlow — Procurement AI (recommendations & low-stock suggestions)
 * ------------------------------------------------------------------
 * Generates AI purchase recommendations (reorder quantities + best supplier)
 * and low-stock suggestions, persisted to `procurement_ai_recommendations`.
 * Uses OpenAI when configured, with deterministic fallbacks so the feature
 * always works offline.
 */
import { db } from "@/db";
import {
  procurementAiRecommendations,
  inventoryProducts,
  inventorySuppliers,
  procurementSupplierQuotations,
  procurementSupplierQuotationItems,
  procurementPurchaseOrders,
  procurementBudgets,
} from "@/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { getLowStockProducts } from "./metrics";

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/** Determine the best supplier + unit cost for a product from recent quotations. */
async function bestQuotationForProduct(
  organizationId: string,
  productId: string | null
): Promise<{ supplierId: string | null; unitPrice: number | null }> {
  if (!productId) return { supplierId: null, unitPrice: null };
  const quotes = (await db.query.procurementSupplierQuotationItems.findMany({
    where: and(
      eq(procurementSupplierQuotationItems.organizationId, organizationId),
      eq(procurementSupplierQuotationItems.productId, productId)
    ),
    orderBy: (q) => [desc(q.unitPrice)],
    with: { quotation: true },
  })) as any[];
  if (quotes.length === 0) return { supplierId: null, unitPrice: null };
  const best = quotes[0];
  return { supplierId: (best.quotation as any).supplierId, unitPrice: Number(best.unitPrice) };
}

/**
 * Recompute and persist open AI recommendations for an organization. Returns
 * the current set of open recommendations.
 */
export async function generateRecommendations(
  organizationId: string,
  userId?: string | null
): Promise<(typeof procurementAiRecommendations.$inferSelect)[]> {
  // Refresh low-stock recommendations: drop stale open ones, then re-create.
  await db
    .delete(procurementAiRecommendations)
    .where(
      and(
        eq(procurementAiRecommendations.organizationId, organizationId),
        eq(procurementAiRecommendations.status, "open"),
        eq(procurementAiRecommendations.type, "low_stock")
      )
    );

  const lowStock = await getLowStockProducts(organizationId);
  for (const p of lowStock) {
    const best = await bestQuotationForProduct(organizationId, p.id);
    const product = await db.query.inventoryProducts.findFirst({
      where: eq(inventoryProducts.id, p.id),
      columns: { costPrice: true },
    });
    const estUnit = best.unitPrice ?? Number(product?.costPrice || 0);
    const estCost = Math.round(p.suggestedReorderQty * estUnit * 100) / 100;
    const supplierName = best.supplierId
      ? (await db.query.inventorySuppliers.findFirst({
          where: eq(inventorySuppliers.id, best.supplierId),
          columns: { name: true },
        }))?.name
      : null;

    await db.insert(procurementAiRecommendations).values({
      organizationId,
      userId: userId ?? null,
      type: "low_stock",
      title: `Reorder ${p.name}`,
      description: `Stock is at ${p.totalStock} (reorder point ${p.reorderPoint}). Suggested reorder: ${p.suggestedReorderQty} units${supplierName ? ` from ${supplierName}` : ""}.`,
      priority: p.totalStock === 0 ? "high" : "normal",
      productId: p.id,
      recommendedSupplierId: best.supplierId ?? null,
      recommendedQty: p.suggestedReorderQty.toString(),
      estimatedCost: estCost.toString(),
      status: "open",
      data: {
        totalStock: p.totalStock,
        reorderPoint: p.reorderPoint,
        unitPrice: estUnit,
        supplierName,
      },
    });
  }

  return getOpenRecommendations(organizationId);
}

export async function getOpenRecommendations(organizationId: string) {
  return db.query.procurementAiRecommendations.findMany({
    where: and(
      eq(procurementAiRecommendations.organizationId, organizationId),
      eq(procurementAiRecommendations.status, "open")
    ),
    orderBy: (r) => [desc(r.priority), desc(r.createdAt)],
    with: { product: true, recommendedSupplier: true },
  });
}

export async function updateRecommendationStatus(
  organizationId: string,
  id: string,
  status: "open" | "dismissed" | "applied"
) {
  const [updated] = await db
    .update(procurementAiRecommendations)
    .set({ status })
    .where(
      and(
        eq(procurementAiRecommendations.id, id),
        eq(procurementAiRecommendations.organizationId, organizationId)
      )
    )
    .returning();
  return updated;
}

/**
 * Produce a natural-language procurement briefing using OpenAI, with a
 * deterministic fallback derived from live data.
 */
export async function getProcurementAdvice(organizationId: string): Promise<string> {
  const lowStock = await getLowStockProducts(organizationId);
  const [commitmentRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${procurementPurchaseOrders.total}::numeric),0)` })
    .from(procurementPurchaseOrders)
    .where(
      and(
        eq(procurementPurchaseOrders.organizationId, organizationId),
        sql`${procurementPurchaseOrders.status} IN ('approved','ordered','partially_received','received')`
      )
    );
  const [budgetRow] = await db
    .select({
      allocated: sql<number>`COALESCE(SUM(${procurementBudgets.amount}::numeric),0)`,
      spent: sql<number>`COALESCE(SUM(${procurementBudgets.spent}::numeric),0)`,
    })
    .from(procurementBudgets)
    .where(eq(procurementBudgets.organizationId, organizationId));

  const lowStockSummary = lowStock
    .map((p) => `${p.name} (stock ${p.totalStock}, reorder ${p.reorderPoint}, suggest ${p.suggestedReorderQty})`)
    .join("; ");
  const committed = Number(commitmentRow?.total || 0);
  const allocated = Number(budgetRow?.allocated || 0);
  const spent = Number(budgetRow?.spent || 0);
  const utilisation = allocated ? Math.round((spent / allocated) * 100) : 0;

  const context = `Procurement snapshot — committed PO spend: ${committed}; budget allocated: ${allocated}, spent: ${spent} (${utilisation}% used); low-stock items: ${lowStock.length}. Low stock detail: ${lowStockSummary || "none"}.`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildFallbackAdvice(lowStock.length, lowStockSummary, committed, utilisation);
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are KaziFlow AI for a Kenyan SME. Give concise, actionable procurement advice. Recommend specific reorder quantities and name the best supplier where data allows.",
          },
          { role: "user", content: context },
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
    });
    if (!res.ok) return buildFallbackAdvice(lowStock.length, lowStockSummary, committed, utilisation);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? buildFallbackAdvice(lowStock.length, lowStockSummary, committed, utilisation);
  } catch {
    return buildFallbackAdvice(lowStock.length, lowStockSummary, committed, utilisation);
  }
}

function buildFallbackAdvice(
  lowStockCount: number,
  lowStockSummary: string,
  committed: number,
  utilisation: number
): string {
  const lines: string[] = [];
  lines.push("Procurement summary (AI offline — using rule-based insights):");
  if (lowStockCount > 0) {
    lines.push(`• ${lowStockCount} item(s) are at or below reorder point. Consider raising purchase orders for: ${lowStockSummary}.`);
  } else {
    lines.push("• Stock levels look healthy — no immediate reorders required.");
  }
  lines.push(`• Committed purchase-order spend is ${committed}.`);
  lines.push(`• Budget utilisation is at ${utilisation}% — ${utilisation > 90 ? "approaching limit, review before new commitments." : "within healthy range."}`);
  lines.push("• Tip: issue RFQs to at least 2–3 suppliers per reorder to optimise cost and lead time.");
  return lines.join("\n");
}
