import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listCampaigns, createCampaign, sendCampaign } from "@/lib/email/campaigns";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "organization.manage_settings");
  if ("error" in res) return res.error;
  const rows = await listCampaigns(res.ctx);
  return NextResponse.json({ campaigns: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "organization.manage_settings");
  if ("error" in res) return res.error;
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "send") {
      const result = await sendCampaign(res.ctx, body.id);
      return NextResponse.json({ ...result });
    }
    const campaign = await createCampaign(res.ctx, {
      name: body.name,
      subject: body.subject,
      preheader: body.preheader,
      html: body.html,
      audience: body.audience,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process campaign" },
      { status: 400 }
    );
  }
}
