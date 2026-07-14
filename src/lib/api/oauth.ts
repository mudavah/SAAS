/**
 * KaziFlow — OAuth 2.0 Server
 * ------------------------------------------------------------------
 * Implements the Authorization Code flow for third-party integrations.
 * Clients register apps, users authorize them, and apps receive
 * access/refresh tokens. All tokens are hashed at rest; plaintext
 * is returned exactly once.
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  oauthClients,
  oauthAccessTokens,
  oauthRefreshTokens,
  oauthAuthorizationCodes,
} from "@/db/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import type {
  OauthClient,
  OauthAccessToken,
  OauthRefreshToken,
  OauthAuthorizationCode,
} from "@/db/schema";

const AUTHORIZATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Client Management ──────────────────────────────────────────────────────

export interface CreateOAuthClientInput {
  organizationId: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  createdBy: string;
}

export async function createOAuthClient(
  input: CreateOAuthClientInput
): Promise<{ client: OauthClient; plaintextSecret: string }> {
  const clientId = `kf_oauth_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const plaintextSecret = crypto.randomBytes(32).toString("hex");
  const secretHash = await bcrypt.hash(plaintextSecret, 10);

  const result = await db
    .insert(oauthClients)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description || null,
      redirectUris: input.redirectUris,
      scopes: input.scopes,
      clientId,
      clientSecretHash: secretHash,
      status: "active",
      createdBy: input.createdBy,
    })
    .returning();

  return { client: result[0]!, plaintextSecret };
}

export async function verifyOAuthClient(
  clientId: string,
  clientSecret: string
): Promise<OauthClient | null> {
  const client = await db.query.oauthClients.findFirst({
    where: eq(oauthClients.clientId, clientId),
  });
  if (!client || client.status !== "active") return null;

  const valid = await bcrypt.compare(clientSecret, client.clientSecretHash);
  if (!valid) return null;

  return client;
}

export async function getOAuthClient(clientId: string): Promise<OauthClient | null> {
  const client = await db.query.oauthClients.findFirst({
    where: eq(oauthClients.clientId, clientId),
  });
  return client ?? null;
}

// ── Authorization Code Flow ─────────────────────────────────────────────────

export interface CreateAuthorizationCodeInput {
  organizationId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export async function createAuthorizationCode(
  input: CreateAuthorizationCodeInput
): Promise<{ code: string; codeHash: string }> {
  const code = crypto.randomBytes(32).toString("hex");
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS);

  await db.insert(oauthAuthorizationCodes).values({
    organizationId: input.organizationId,
    clientId: input.clientId,
    codeHash,
    redirectUri: input.redirectUri,
    scopes: input.scopes,
    expiresAt,
  });

  return { code, codeHash };
}

export async function verifyAuthorizationCode(
  code: string,
  clientId: string,
  redirectUri: string
): Promise<OauthAuthorizationCode | null> {
  const allCodes = await db.query.oauthAuthorizationCodes.findMany({
    where: and(
      eq(oauthAuthorizationCodes.clientId, clientId),
      eq(oauthAuthorizationCodes.redirectUri, redirectUri),
      gt(oauthAuthorizationCodes.expiresAt, new Date())
    ),
  });

  for (const codeRecord of allCodes) {
    const valid = await bcrypt.compare(code, codeRecord.codeHash);
    if (valid) {
      if (codeRecord.usedAt) return null;
      return codeRecord;
    }
  }
  return null;
}

export async function markAuthorizationCodeUsed(
  codeHash: string
): Promise<void> {
  await db
    .update(oauthAuthorizationCodes)
    .set({ usedAt: new Date() })
    .where(eq(oauthAuthorizationCodes.codeHash, codeHash));
}

// ── Token Management ───────────────────────────────────────────────────────

export interface CreateTokenInput {
  organizationId: string;
  clientId: string;
  scopes: string[];
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
}

export async function createAccessToken(
  input: CreateTokenInput
): Promise<{ token: string; refreshToken: string; accessToken: OauthAccessToken; refreshTokenRecord: OauthRefreshToken }> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + (input.accessTokenExpiresIn || ACCESS_TOKEN_TTL_MS));
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  const refreshExpiresAt = new Date(Date.now() + (input.refreshTokenExpiresIn || REFRESH_TOKEN_TTL_MS));

  const [accessToken] = await db
    .insert(oauthAccessTokens)
    .values({
      organizationId: input.organizationId,
      clientId: input.clientId,
      tokenHash,
      scopes: input.scopes,
      expiresAt,
    })
    .returning();

  const [refreshTokenRecord] = await db
    .insert(oauthRefreshTokens)
    .values({
      organizationId: input.organizationId,
      clientId: input.clientId,
      accessTokenId: accessToken.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshExpiresAt,
    })
    .returning();

  return { token, refreshToken, accessToken, refreshTokenRecord };
}

export async function verifyAccessToken(
  token: string
): Promise<OauthAccessToken | null> {
  const allTokens = await db.query.oauthAccessTokens.findMany({
    where: and(
      gt(oauthAccessTokens.expiresAt, new Date()),
      eq(oauthAccessTokens.revokedAt, null as any)
    ),
  });

  for (const tokenRecord of allTokens) {
    const valid = await bcrypt.compare(token, tokenRecord.tokenHash);
    if (valid) {
      if (tokenRecord.revokedAt) return null;
      return tokenRecord;
    }
  }
  return null;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ token: string; refreshToken: string; accessToken: OauthAccessToken; refreshTokenRecord: OauthRefreshToken } | null> {
  const allRefreshTokens = await db.query.oauthRefreshTokens.findMany({
    where: and(
      gt(oauthRefreshTokens.expiresAt, new Date()),
      eq(oauthRefreshTokens.revokedAt, null as any)
    ),
    with: { accessToken: true },
  });

  for (const rt of allRefreshTokens) {
    const valid = await bcrypt.compare(refreshToken, rt.tokenHash);
    if (valid) {
      if (rt.revokedAt) return null;

      // Revoke old access token
      if (!rt.accessTokenId) return null;
      await db
        .update(oauthAccessTokens)
        .set({ revokedAt: new Date() })
        .where(eq(oauthAccessTokens.id, rt.accessTokenId));

      // Create new tokens
      const at = rt.accessToken as any;
      return createAccessToken({
        organizationId: rt.organizationId,
        clientId: rt.clientId,
        scopes: at.scopes,
      });
    }
  }
  return null;
}

export async function revokeAccessToken(tokenHash: string): Promise<void> {
  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthAccessTokens.tokenHash, tokenHash));
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthRefreshTokens.tokenHash, tokenHash));
}
