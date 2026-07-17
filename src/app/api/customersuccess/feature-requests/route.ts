import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import {
  listFeatureRequests,
  createFeatureRequest,
  voteFeatureRequest,
} from "@/lib/customersuccess";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "organization.view");
  if ("error" in res) return res.error;
  const rows = await listFeatureRequests(res.ctx);
  return NextResponse.json({ featureRequests: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req).catch(() => null);
  const ctx = res && !("error" in res) ? res.ctx : null;
  const body = await req.json().catch(() => ({}));
  if (!body.title || !body.description) {
    return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
  }
  if (body.action === "vote") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const row = await voteFeatureRequest(ctx ?? null, body.id);
    return NextResponse.json({ featureRequest: row });
  }
  const row = await createFeatureRequest({
    organizationId: ctx?.organizationId ?? null,
    userId: ctx?.userId ?? null,
    userEmail: body.userEmail ?? null,
    title: body.title,
    description: body.description,
  });
  return NextResponse.json({ featureRequest: row }, { status: 201 });
}
