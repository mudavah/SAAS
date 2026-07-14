import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getDepartments } from "@/lib/hr/service";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const res = await requireApiContext(_req, "hr.departments.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const departments = await getDepartments(ctx.organizationId);
  const department = departments.find((d: any) => d.id === params.id);
  if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });
  return NextResponse.json(department);
}
