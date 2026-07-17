import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listAnnouncements, createAnnouncement } from "@/lib/customersuccess";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "organization.view");
  if ("error" in res) return res.error;
  const rows = await listAnnouncements(res.ctx);
  return NextResponse.json({ announcements: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "organization.manage_settings");
  if ("error" in res) return res.error;
  const body = await req.json().catch(() => ({}));
  if (!body.title || !body.body) {
    return NextResponse.json({ error: "title and body are required." }, { status: 400 });
  }
  const row = await createAnnouncement(res.ctx, {
    title: body.title,
    body: body.body,
    audience: body.audience,
    planFilter: body.planFilter,
    dismissible: body.dismissible,
  });
  return NextResponse.json({ announcement: row }, { status: 201 });
}
