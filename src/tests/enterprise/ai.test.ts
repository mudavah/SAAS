import { describe, it, expect } from "vitest";
import { generateBranchInsights, getBranchInsights } from "@/lib/enterprise/ai";
import type { ServerContext } from "@/lib/session";

const mockCtx: ServerContext = {
  userId: "user-1",
  organizationId: "org-1",
  roleType: "owner",
  memberId: "member-1",
  permissions: new Set(["enterprise.ai.access", "enterprise.view"]),
  authMethod: "session",
};

describe("Enterprise AI", () => {
  it("should export AI functions", () => {
    expect(typeof generateBranchInsights).toBe("function");
    expect(typeof getBranchInsights).toBe("function");
  });

  it("should have valid mock context", () => {
    expect(mockCtx.organizationId).toBe("org-1");
    expect(mockCtx.permissions.has("enterprise.ai.access")).toBe(true);
  });
});
