import type { ServerContext } from "@/lib/session";

/**
 * Shared test fixture: builds a fully-populated `ServerContext` so tests don't
 * have to repeat every required field (notably `organization`). Use the
 * spread-and-override pattern to vary permissions/roles per test.
 */
export function mockServerContext(
  overrides: Partial<ServerContext> = {}
): ServerContext {
  return {
    userId: "user-1",
    email: "test@kaziflow.co.ke",
    name: "Test User",
    image: null,
    plan: "business",
    organizationId: "org-1",
    organization: {
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      plan: "business",
      ownerId: "user-1",
    },
    roleType: "owner",
    memberId: "member-1",
    permissions: new Set([
      "enterprise.view",
      "enterprise.ai.access",
      "enterprise.approvals.manage",
      "enterprise.branches.manage",
      "enterprise.reports.view",
      "enterprise.sales.manage",
      "enterprise.transfers.manage",
    ]),
    ip: "127.0.0.1",
    userAgent: "vitest",
    authMethod: "session",
    ...overrides,
  };
}
