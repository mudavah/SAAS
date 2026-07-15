import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, projects } from "@/db/schema";
import { taskSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "tasks.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.tasks.findMany({
    where: eq(tasks.organizationId, ctx.organizationId),
    orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "tasks.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = taskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { projectId } = parsed.data;

    if (projectId) {
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.organizationId, ctx.organizationId)
        ),
        columns: { id: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const [task] = await db
      .insert(tasks)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
        projectId: projectId || null,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "task.create",
      category: "tasks",
      resourceType: "task",
      resourceId: task.id,
      description: `Created task ${task.title}`,
      newValues: { title: task.title, priority: task.priority },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    logger.error("Create task error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
