import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getEmployee } from "@/lib/hr/service";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const res = await requireApiContext(_req, "hr.employees.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const employee = await getEmployee(ctx.organizationId, params.id);
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  return NextResponse.json(employee);
}
