import { NextResponse } from "next/server";
import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { listTickets, createTicket, updateTicket } from "@/lib/customersuccess";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "organization.view");
  if ("error" in res) return res.error;
  const url = new URL(req.url);
  const rows = await listTickets(res.ctx, { status: url.searchParams.get("status") || undefined });
  return NextResponse.json({ tickets: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.subject || !body.description) {
    return NextResponse.json({ error: "Subject and description are required." }, { status: 400 });
  }
  // Best-effort auth; public visitors may submit with an email.
  const res = await requireApiContext(req);
  const ctx = res && !("error" in res) ? res.ctx : null;
  const row = await createTicket({
    organizationId: ctx?.organizationId ?? null,
    userId: ctx?.userId ?? null,
    userEmail: body.userEmail ?? ctx?.email ?? null,
    subject: body.subject,
    description: body.description,
    priority: body.priority,
    category: body.category,
  });
  return NextResponse.json({ ticket: row }, { status: 201 });
}

export async function PATCH(req: Request) {
  const res = await requireApiContext(req, "organization.manage_settings");
  if ("error" in res) return res.error;
  const body = await req.json().catch(() => ({}));
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: "Ticket id required." }, { status: 400 });
  const row = await updateTicket(res.ctx, id, patch);
  return NextResponse.json({ ticket: row });
}
