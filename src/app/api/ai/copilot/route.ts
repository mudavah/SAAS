import { NextResponse } from "next/server";
import { aiRequestSchema } from "@/lib/validations";
import { getApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  callOpenAI,
  buildSystemPrompt,
  fetchOrgContext,
  type CopilotOptions,
} from "@/lib/ai/copilot";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = await getApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = aiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const context = await fetchOrgContext(ctx.organizationId);
    const systemPrompt = buildSystemPrompt(context);

    const reply = await callOpenAI(systemPrompt, parsed.data.context, []);

    await logAuditSafe(ctx, {
      action: "ai.copilot",
      category: "ai",
      resourceType: "ai_copilot",
      description: `Copilot query: ${parsed.data.context.slice(0, 100)}`,
      newValues: {
        type: parsed.data.type,
        contextLength: parsed.data.context.length,
      },
    });

    return NextResponse.json({
      reply,
      contextUsed: {
        invoicesThisMonth: context.invoicesThisMonth,
        overdueInvoices: context.overdueInvoices,
        lowStockProducts: context.lowStockProducts,
        complianceAlerts: context.complianceAlerts,
      },
    });
  } catch (error) {
    logger.error("Copilot error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Copilot failed" },
      { status: 500 }
    );
  }
}
