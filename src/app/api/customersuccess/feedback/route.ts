import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createFeedback } from "@/lib/customersuccess";

export async function POST(req: Request) {
  const res = await requireApiContext(req).catch(() => null);
  const ctx = res && !("error" in res) ? res.ctx : null;
  const body = await req.json().catch(() => ({}));
  if (!body.message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  const row = await createFeedback({
    organizationId: ctx?.organizationId ?? null,
    userId: ctx?.userId ?? null,
    userEmail: body.userEmail ?? null,
    rating: typeof body.rating === "number" ? body.rating : null,
    message: body.message,
    page: body.page ?? null,
  });
  return NextResponse.json({ feedback: row }, { status: 201 });
}
