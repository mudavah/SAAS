/**
 * KaziFlow — tenant & authorization context
 * ------------------------------------------------------------------
 * Single entry point for resolving the "current organization" and the
 * caller's effective permissions, for both session-authenticated app routes
 * and API-key-authenticated public API requests.
 *
 * Every business query MUST be scoped by `ctx.organizationId`. Every
 * mutating action MUST be gated with `requirePermission`. This module is the
 * only place that decides *who* the caller is and *what* they may do.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  organizationMembers,
  organizations,
  rolePermissions,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  getEffectivePermissions,
  hasPermission,
  type PermissionSet,
} from "@/lib/rbac";
import type { PermissionKey, SystemRole } from "@/lib/rbac/permissions";
import {
  extractApiCredentials,
  verifyApiKey,
  principalHasScope,
  markApiKeyUsed,
  type ApiPrincipal,
} from "@/lib/api/auth";
import {
  rateLimit,
  API_RATE_LIMIT,
  API_KEY_RATE_LIMIT,
} from "@/lib/api/rate-limit";
import { recordApiUsage } from "@/lib/api/usage";

export type RoleTypeOrApi = SystemRole | "api";

export interface ServerContext {
  userId: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  plan?: string;
  organizationId: string;
  organization: { id: string; name: string; slug: string; plan: string; ownerId: string };
  roleType: RoleTypeOrApi;
  memberId: string | null;
  permissions: PermissionSet;
  ip?: string;
  userAgent?: string;
  authMethod: "session" | "apikey";
  apiKeyId?: string;
}

/** Result of resolving an API request's caller. Use `if ("error" in res)` to
 *  branch; the success branch narrows `ctx` to a non-null ServerContext. */
export type ApiResult =
  | { ctx: ServerContext }
  | { error: NextResponse };

function getRequestMeta(req: Request): { ip?: string; userAgent?: string } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const userAgent = req.headers.get("user-agent") || undefined;
  return { ip, userAgent };
}

async function loadMembership(userId: string, orgId: string) {
  return db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, orgId)
    ),
    with: {
      customRole: { with: { permissions: true } },
    },
  });
}

async function loadOrg(orgId: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { id: true, name: true, slug: true, plan: true, ownerId: true },
  });
}

function permissionsFromMember(member: {
  roleType: SystemRole;
  customRoleId: string | null;
  customRole?: { permissions: { permission: string }[] } | null;
}): PermissionSet {
  if (member.customRoleId && member.customRole?.permissions?.length) {
    return new Set(
      member.customRole.permissions.map((p) => p.permission as PermissionKey)
    );
  }
  return getEffectivePermissions(member.roleType);
}

/**
 * Resolve the active organization for a session user. Preference order:
 * 1. `kf_active_org` cookie (future multi-org switching)
 * 2. `orgId` stored on the session token
 * 3. the user's first active membership (legacy fallback)
 */
async function resolveSessionContext(
  userId: string,
  email: string | null,
  name: string | null,
  image: string | null,
  plan: string | undefined,
  preferredOrgId: string | null,
  meta: { ip?: string; userAgent?: string }
): Promise<{ ctx: ServerContext | null; noOrg: boolean }> {
  let orgId = preferredOrgId;
  let member = orgId ? await loadMembership(userId, orgId) : null;

  if (!member) {
    const fallback = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "active")
      ),
    });
    if (fallback) {
      orgId = fallback.organizationId;
      member = await loadMembership(userId, orgId);
    }
  }

  if (!member || !orgId) {
    return { ctx: null, noOrg: true };
  }

  // Guard against a custom role from a different organization escalating
  // privileges in this tenant. Fall back to the system role if mismatched.
  if (
    member.customRoleId &&
    member.customRole &&
    member.customRole.organizationId !== orgId
  ) {
    member = { ...member, customRoleId: null, customRole: null };
  }

  const org = await loadOrg(orgId);
  if (!org) return { ctx: null, noOrg: true };

  return {
    ctx: {
      userId,
      email,
      name,
      image,
      plan,
      organizationId: org.id,
      organization: org,
      roleType: member.roleType,
      memberId: member.id,
      permissions: permissionsFromMember(member),
      ip: meta.ip,
      userAgent: meta.userAgent,
      authMethod: "session",
    },
    noOrg: false,
  };
}

async function resolveApiContext(
  principal: ApiPrincipal,
  meta: { ip?: string; userAgent?: string }
): Promise<{ ctx: ServerContext | null }> {
  const org = await loadOrg(principal.organizationId);
  if (!org) return { ctx: null };

  return {
    ctx: {
      userId: org.ownerId,
      organizationId: org.id,
      organization: org,
      roleType: "api",
      memberId: null,
      // API permissions are exactly the granted scopes.
      permissions: new Set(principal.scopes as PermissionKey[]),
      ip: meta.ip,
      userAgent: meta.userAgent,
      authMethod: "apikey",
      apiKeyId: principal.apiKeyId,
    },
  };
}

/**
 * Unified entry point for API routes. Tries session auth first, then API-key
 * auth. Returns `{ ctx, error }`; when `error` is set the caller must return
 * it. Optionally enforces a required permission.
 */
export async function getApiContext(
  req: Request,
  requiredPermission?: PermissionKey
): Promise<ApiResult> {
  const meta = getRequestMeta(req);

  // 1) API-key authentication (public API under /api/v1).
  const credentials = extractApiCredentials(req);
  if (credentials) {
    const verified = await verifyApiKey(credentials);
    if (!verified) {
      return {
        error: NextResponse.json(
          { error: "Invalid or revoked API key" },
          { status: 401 }
        ),
      };
    }

    if (requiredPermission && !principalHasScope(verified.principal, requiredPermission)) {
      return {
        error: NextResponse.json(
          { error: `Insufficient scope: requires '${requiredPermission}'` },
          { status: 403 }
        ),
      };
    }

    const orgLimit = await rateLimit({
      key: `org:${verified.principal.organizationId}`,
      limit: API_RATE_LIMIT,
    });
    const keyLimit = await rateLimit({
      key: `key:${verified.principal.apiKeyId}`,
      limit: API_KEY_RATE_LIMIT,
    });
    if (!orgLimit.allowed || !keyLimit.allowed) {
      return {
        error: NextResponse.json(
          { error: "Rate limit exceeded" },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(orgLimit.limit),
              "X-RateLimit-Remaining": String(orgLimit.remaining),
            },
          }
        ),
      };
    }

    await markApiKeyUsed(verified.principal.apiKeyId);
    const { ctx } = await resolveApiContext(verified.principal, meta);
    if (!ctx) return { error: unauthorized() };
    return { ctx };
  }

  // 2) Session authentication (app routes).
  const session = await auth();
  if (!session?.user?.id) {
    return { error: unauthorized() };
  }

  const preferredOrgId =
    req.headers.get("x-kf-org") ||
    getCookieValue(req, "kf_active_org") ||
    (session.user as { orgId?: string | null }).orgId ||
    null;

  const { ctx, noOrg } = await resolveSessionContext(
    session.user.id,
    session.user.email ?? null,
    session.user.name ?? null,
    session.user.image ?? null,
    (session.user as { plan?: string }).plan,
    preferredOrgId,
    meta
  );

  if (!ctx) {
    return {
      error: noOrg
        ? NextResponse.json(
            { error: "No active organization. Complete setup first." },
            { status: 403 }
          )
        : unauthorized(),
    };
  }

  if (requiredPermission && !hasPermission(ctx.permissions, requiredPermission)) {
    return {
      error: NextResponse.json(
        { error: `Forbidden: requires '${requiredPermission}'` },
        { status: 403 }
      ),
    };
  }

  return { ctx };
}

/** Convenience: require a permission and return context or an error response. */
export async function requireApiContext(
  req: Request,
  requiredPermission?: PermissionKey
): Promise<ApiResult> {
  return getApiContext(req, requiredPermission);
}

/**
 * Server-component context for pages. Returns null when unauthenticated or
 * without an active organization (caller should redirect).
 */
export async function getPageContext(options?: {
  requiredPermission?: PermissionKey;
}): Promise<ServerContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const preferredOrgId =
    (session.user as { orgId?: string | null }).orgId || null;

  const { ctx, noOrg } = await resolveSessionContext(
    session.user.id,
    session.user.email ?? null,
    session.user.name ?? null,
    session.user.image ?? null,
    (session.user as { plan?: string }).plan,
    preferredOrgId,
    {}
  );

  if (!ctx || noOrg) return null;
  if (options?.requiredPermission && !hasPermission(ctx.permissions, options.requiredPermission)) {
    return null;
  }
  return ctx;
}

export function hasPagePermission(
  ctx: ServerContext | null,
  key: PermissionKey
): boolean {
  return !!ctx && hasPermission(ctx.permissions, key);
}

/**
 * Public API handler wrapper. Resolves the caller (session OR API key),
 * enforces the required scope, runs the handler, and records usage. Use this
 * for every `/api/v1/*` endpoint so auth, rate limiting, scoping, and logging
 * are consistent and centralized.
 */
export async function handleApi(
  req: Request,
  permission: PermissionKey,
  handler: (ctx: ServerContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const start = Date.now();
  const result = await getApiContext(req, permission);
  if ("error" in result) {
    if (result.error && result.error.headers) {
      // ensure CORS-friendly headers already set by getApiContext
    }
    return result.error;
  }
  const { ctx } = result;
  const response = await handler(ctx);
  if (ctx.apiKeyId) {
    await recordApiUsage({
      apiKeyId: ctx.apiKeyId,
      organizationId: ctx.organizationId,
      endpoint: safePathname(req),
      method: req.method,
      statusCode: response.status,
      responseTimeMs: Date.now() - start,
    });
  }
  return response;
}

function safePathname(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return req.url;
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function getCookieValue(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}
