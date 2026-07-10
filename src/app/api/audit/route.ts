import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { and, eq, desc, SQL } from "drizzle-orm";
import { getApiContext } from "@/lib/session";
import { hasPermission, type PermissionKey } from "@/lib/rbac";

const VIEW_AUDIT: PermissionKey = "audit.view";

export async function GET(req: Request) {
  const res = await getApiContext(req, VIEW_AUDIT);
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const resourceType = url.searchParams.get("resourceType");
  const action = url.searchParams.get("action");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

  const conditions: SQL<unknown>[] = [eq(auditLogs.organizationId, ctx.organizationId)];

  if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
  if (action) conditions.push(eq(auditLogs.action, action));

  const where = and(...conditions);

  const rows = await db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit);

  return NextResponse.json({ logs: rows });
}
