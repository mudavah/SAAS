/**
 * KaziFlow — Integration Hub OAuth2 helper
 * ------------------------------------------------------------------
 * Generic OAuth2 authorization-code flow used by calendar/accounting/storage
 * providers. Builds a signed, tamper-evident `state`, exchanges the code for
 * tokens, and persists encrypted tokens (access/refresh) in
 * integration_oauth_tokens. Per-provider endpoints are declared here; client
 * credentials are read from the connection config or provider env vars.
 *
 * No new dependencies — uses native fetch + Node crypto (HMAC state signature).
 */
import { db } from "@/db";
import { integrations, integrationOauthTokens } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { IntegrationError, notFound } from "./core";

interface ProviderOAuth {
  authorizeUrl: string;
  tokenUrl: string;
  /** Client id/secret env names (fallback to connection config). */
  envClientId?: string;
  envClientSecret?: string;
  /** PKCE not used; standard code grant. */
}

const OAUTH_PROVIDERS: Record<string, ProviderOAuth> = {
  google_calendar: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    envClientId: "AUTH_GOOGLE_ID",
    envClientSecret: "AUTH_GOOGLE_SECRET",
  },
  google_drive: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    envClientId: "AUTH_GOOGLE_ID",
    envClientSecret: "AUTH_GOOGLE_SECRET",
  },
  outlook_calendar: {
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  },
  onedrive: {
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  },
  quickbooks: {
    authorizeUrl: "https://appcenter.intuit.com/connect/oauth2",
    tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  },
  xero: {
    authorizeUrl: "https://login.xero.com/identity/connect/authorize",
    tokenUrl: "https://identity.xero.com/connect/token",
  },
};

export function isOAuthProvider(provider: string): boolean {
  return provider in OAUTH_PROVIDERS;
}

function stateSecret(): string {
  return (
    process.env.APP_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    "kaziflow-integration-hub-state"
  );
}

/** Sign state so the callback can verify it was issued by us. */
export function signState(organizationId: string, integrationId: string): string {
  const raw = `${organizationId}:${integrationId}:${randomBytes(8).toString("hex")}`;
  const sig = createHmac("sha256", stateSecret()).update(raw).digest("base64url");
  return `${Buffer.from(raw).toString("base64url")}.${sig}`;
}

/** Verify + parse a signed state. Returns null when invalid. */
export function verifyState(
  state: string
): { organizationId: string; integrationId: string; nonce: string } | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", stateSecret())
    .update(Buffer.from(payload, "base64url").toString())
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const decoded = Buffer.from(payload, "base64url").toString().split(":");
  if (decoded.length !== 3) return null;
  return { organizationId: decoded[0], integrationId: decoded[1], nonce: decoded[2] };
}

/** Build the provider authorize URL. `redirectUri` must match the callback route. */
export function buildAuthUrl(
  provider: string,
  organizationId: string,
  integrationId: string,
  opts: { scopes?: string[]; redirectUri: string; clientId?: string; prompt?: string }
): string {
  const meta = OAUTH_PROVIDERS[provider];
  if (!meta) throw new IntegrationError(`OAuth not supported for ${provider}`, 400);
  const params = new URLSearchParams({
    client_id: opts.clientId || "",
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: (opts.scopes || []).join(" "),
    state: signState(organizationId, integrationId),
    access_type: "offline",
    prompt: opts.prompt || "consent",
  });
  return `${meta.authorizeUrl}?${params.toString()}`;
}

function clientCreds(provider: string, config: Record<string, unknown>) {
  const meta = OAUTH_PROVIDERS[provider];
  return {
    clientId: (config.clientId as string) || (meta?.envClientId ? process.env[meta.envClientId] : "") || "",
    clientSecret:
      (config.clientSecret as string) ||
      (meta?.envClientSecret ? process.env[meta.envClientSecret] : "") ||
      "",
  };
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresIn?: number;
}

/** Exchange an authorization code for tokens (native fetch). */
export async function exchangeCode(
  provider: string,
  code: string,
  redirectUri: string,
  config: Record<string, unknown>
): Promise<TokenSet> {
  const meta = OAUTH_PROVIDERS[provider];
  if (!meta) throw new IntegrationError(`OAuth not supported for ${provider}`, 400);
  const { clientId, clientSecret } = clientCreds(provider, config);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(meta.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.access_token) {
    throw new IntegrationError(`Token exchange failed: ${JSON.stringify(data)}`, 400);
  }
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    tokenType: data.token_type ? String(data.token_type) : "Bearer",
    scope: data.scope ? String(data.scope) : undefined,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : undefined,
  };
}

/** Encrypt and persist the token set for a connection. */
export async function storeTokens(
  organizationId: string,
  integrationId: string,
  tokens: TokenSet
): Promise<void> {
  const expiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000)
    : null;
  const existing = await db.query.integrationOauthTokens.findFirst({
    where: eq(integrationOauthTokens.integrationId, integrationId),
  });
  if (existing) {
    await db
      .update(integrationOauthTokens)
      .set({
        accessToken: encryptSecret(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : existing.refreshToken,
        tokenType: tokens.tokenType ?? existing.tokenType,
        scope: tokens.scope ?? existing.scope,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(integrationOauthTokens.id, existing.id));
  } else {
    await db.insert(integrationOauthTokens).values({
      integrationId,
      organizationId,
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      tokenType: tokens.tokenType ?? "Bearer",
      scope: tokens.scope ?? null,
      expiresAt,
    });
  }
  await db
    .update(integrations)
    .set({ status: "connected", updatedAt: new Date() })
    .where(eq(integrations.id, integrationId));
}

/** Refresh an access token using the stored refresh token. */
export async function refreshTokens(integrationId: string): Promise<TokenSet | null> {
  const tokenRow = await db.query.integrationOauthTokens.findFirst({
    where: eq(integrationOauthTokens.integrationId, integrationId),
  });
  if (!tokenRow?.refreshToken) return null;
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  });
  if (!integration) return null;
  const meta = OAUTH_PROVIDERS[integration.provider];
  if (!meta) return null;
  const refreshToken = decryptSecret(tokenRow.refreshToken);
  const { clientId, clientSecret } = clientCreds(integration.provider, integration.config as any);
  const res = await fetch(meta.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken!,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.access_token) return null;
  const tokens: TokenSet = {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : refreshToken!,
    tokenType: data.token_type ? String(data.token_type) : "Bearer",
    scope: data.scope ? String(data.scope) : tokenRow.scope ?? undefined,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : undefined,
  };
  await storeTokens(integration.organizationId, integrationId, tokens);
  return tokens;
}

/** Get the (decrypted) active access token, refreshing if expired. */
export async function getAccessToken(integrationId: string): Promise<string | null> {
  const tokenRow = await db.query.integrationOauthTokens.findFirst({
    where: eq(integrationOauthTokens.integrationId, integrationId),
  });
  if (!tokenRow?.accessToken) return null;
  const access = decryptSecret(tokenRow.accessToken);
  if (tokenRow.expiresAt && tokenRow.expiresAt.getTime() <= Date.now()) {
    const refreshed = await refreshTokens(integrationId);
    return (refreshed?.accessToken ?? access) ?? null;
  }
  return access ?? null;
}

export async function getIntegrationForState(
  organizationId: string,
  integrationId: string
) {
  const row = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, integrationId),
      eq(integrations.organizationId, organizationId)
    ),
  });
  if (!row) notFound("Integration not found");
  return row;
}
