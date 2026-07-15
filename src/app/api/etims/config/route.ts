import { NextResponse } from "next/server";
import { db } from "@/db";
import { etimsConfig } from "@/db/schema";
import { etimsConfigSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { encryptConfigSecrets, decryptConfigSecrets } from "@/lib/crypto";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const config = await db.query.etimsConfig.findFirst({
    where: eq(etimsConfig.organizationId, ctx.organizationId),
  });

  return NextResponse.json(decryptConfigSecrets(config) || {});
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "compliance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = etimsConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await db.query.etimsConfig.findFirst({
      where: eq(etimsConfig.organizationId, ctx.organizationId),
    });

    if (existing) {
      const [updated] = await db
        .update(etimsConfig)
        .set({
          ...encryptConfigSecrets(parsed.data),
          organizationId: ctx.organizationId,
          updatedAt: new Date(),
        })
        .where(eq(etimsConfig.organizationId, ctx.organizationId))
        .returning();

      await logAuditSafe(ctx, {
        action: "etims_config.update",
        category: "compliance",
        resourceType: "etims_config",
        resourceId: updated.id,
        description: "Updated eTIMS configuration",
        newValues: parsed.data,
      });

      return NextResponse.json(updated);
    }

    const [config] = await db
      .insert(etimsConfig)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...encryptConfigSecrets(parsed.data),
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "etims_config.create",
      category: "compliance",
      resourceType: "etims_config",
      resourceId: config.id,
      description: "Created eTIMS configuration",
      newValues: parsed.data,
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    logger.error("Save eTIMS config error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
