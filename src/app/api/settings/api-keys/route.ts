import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { generateApiSecret, hashApiSecret } from "@/lib/api/auth";
import { ALL_PERMISSION_KEYS } from "@/lib/rbac";

const createKeySchema = z.object({
  name: z.string().min(2, "Name is required"),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
});

function maskSecret(prefix: string): string {
  return `${prefix}••••••••`;
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "api.keys.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.organizationId, ctx.organizationId),
    orderBy: (k) => [desc(k.createdAt)],
  });

  return NextResponse.json(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: maskSecret(k.keyPrefix),
      scopes: k.scopes,
      status: k.status,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt,
    }))
  );
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "api.keys.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Validate that every requested scope is a real permission key.
    const invalid = parsed.data.scopes.filter(
      (s) => s !== "*" && !ALL_PERMISSION_KEYS.includes(s as never)
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }

    const { secret, prefix } = generateApiSecret("live");
    const secretHash = await hashApiSecret(secret);

    const [key] = await db
      .insert(apiKeys)
      .values({
        organizationId: ctx.organizationId,
        name: parsed.data.name,
        keyPrefix: prefix,
        secretHash,
        scopes: parsed.data.scopes,
        status: "active",
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        createdBy: ctx.userId!,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "api.key.create",
      category: "api",
      resourceType: "api_key",
      resourceId: key.id,
      description: `Created API key "${key.name}"`,
      newValues: { name: key.name, scopes: key.scopes },
    });

    // The plaintext secret is returned exactly once.
    return NextResponse.json(
      {
        id: key.id,
        name: key.name,
        secret,
        keyPrefix: maskSecret(prefix),
        scopes: key.scopes,
        expiresAt: key.expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
