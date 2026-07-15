import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { isOAuthProvider, buildAuthUrl } from "@/lib/integrations/oauth";
import { IntegrationError } from "@/lib/integrations/core";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const integration = await getIntegration(ctx, id);
    if (!isOAuthProvider(integration.provider)) {
      return NextResponse.json(
        { error: "Provider does not support OAuth" },
        { status: 400 }
      );
    }
    const redirectUri = `${APP_URL}/api/integrations/${id}/oauth/callback`;
    const authUrl = buildAuthUrl(integration.provider, ctx.organizationId, id, {
      scopes: (integration.config?.scopes as string[]) || [],
      redirectUri,
      clientId: integration.config?.clientId as string | undefined,
    });
    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.redirect(`${APP_URL}/dashboard/integrations/${id}?oauth=error`);
  }
}
