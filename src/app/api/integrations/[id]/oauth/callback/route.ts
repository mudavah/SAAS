import { NextResponse } from "next/server";
import { getIntegration } from "@/lib/integrations";
import { logger } from "@/lib/logger";
import {
  verifyState,
  getIntegrationForState,
  exchangeCode,
  storeTokens,
} from "@/lib/integrations/oauth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * OAuth callback (public — no session required; identity proven by signed
 * state). Exchanges the code for tokens, stores them encrypted, then redirects
 * back to the integration detail page.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/integrations/${id}?oauth=error&reason=${error || "missing_params"}`
    );
  }

  const parsed = verifyState(state);
  if (!parsed || parsed.integrationId !== id) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/integrations/${id}?oauth=invalid_state`
    );
  }

  try {
    const integration = await getIntegrationForState(
      parsed.organizationId,
      id
    );
    const redirectUri = `${APP_URL}/api/integrations/${id}/oauth/callback`;
    const tokens = await exchangeCode(
      integration.provider,
      code,
      redirectUri,
      (integration.config as Record<string, unknown>) || {}
    );
    await storeTokens(parsed.organizationId, id, tokens);
    return NextResponse.redirect(`${APP_URL}/dashboard/integrations/${id}?oauth=success`);
  } catch (err) {
    logger.error("OAuth callback error:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.redirect(
      `${APP_URL}/dashboard/integrations/${id}?oauth=error&reason=exchange_failed`
    );
  }
}
