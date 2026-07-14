/**
 * KaziFlow — API Sandbox
 * ------------------------------------------------------------------
 * Provides isolated test environments for third-party developers.
 * Sandbox sessions operate on a dedicated sandbox organization with
 * pre-seeded test data, allowing safe integration testing.
 */

import crypto from "crypto";
import { db } from "@/db";
import { apiSandboxSessions, apiKeys } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { ApiSandboxSession } from "@/db/schema";

export interface CreateSandboxSessionInput {
  organizationId: string;
  apiKeyId: string;
  name: string;
  expiresIn?: number;
}

export async function createSandboxSession(
  input: CreateSandboxSessionInput
): Promise<ApiSandboxSession> {
  const expiresAt = input.expiresIn
    ? new Date(Date.now() + input.expiresIn)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

  const result = await db
    .insert(apiSandboxSessions)
    .values({
      organizationId: input.organizationId,
      apiKeyId: input.apiKeyId,
      name: input.name,
      environment: "sandbox",
      expiresAt,
    })
    .returning();

  return result[0]!;
}

export async function listSandboxSessions(
  organizationId: string
): Promise<ApiSandboxSession[]> {
  return db.query.apiSandboxSessions.findMany({
    where: eq(apiSandboxSessions.organizationId, organizationId),
    orderBy: (s) => [desc(s.createdAt)],
  });
}

export async function getSandboxSession(
  organizationId: string,
  sessionId: string
): Promise<ApiSandboxSession | null> {
  const session = await db.query.apiSandboxSessions.findFirst({
    where: and(
      eq(apiSandboxSessions.id, sessionId),
      eq(apiSandboxSessions.organizationId, organizationId)
    ),
  });
  return session ?? null;
}

export async function deleteSandboxSession(
  organizationId: string,
  sessionId: string
): Promise<boolean> {
  const existing = await getSandboxSession(organizationId, sessionId);
  if (!existing) return false;

  await db
    .delete(apiSandboxSessions)
    .where(
      and(
        eq(apiSandboxSessions.id, sessionId),
        eq(apiSandboxSessions.organizationId, organizationId)
      )
    );
  return true;
}

export function generateSandboxApiKey(): { secret: string; prefix: string } {
  const random = crypto
    .getRandomValues(new Uint8Array(24))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "")
    .slice(0, 32);
  const secret = `kf_test_${random}`;
  return { secret, prefix: secret.slice(0, 12) };
}
