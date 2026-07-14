import { describe, it, expect } from "vitest";
import { getBranchPerformance, getConsolidatedReport } from "@/lib/enterprise/reports";
import type { ServerContext } from "@/lib/session";

const mockCtx: ServerContext = {
  userId: "user-1",
  organizationId: "org-1",
  roleType: "owner",
  memberId: "member-1",
  permissions: new Set(["enterprise.reports.view", "enterprise.view"]),
  authMethod: "session",
};

describe("Enterprise Reports", () => {
  it("should export report functions", () => {
    expect(typeof getBranchPerformance).toBe("function");
    expect(typeof getConsolidatedReport).toBe("function");
  });

  it("should have valid mock context", () => {
    expect(mockCtx.organizationId).toBe("org-1");
    expect(mockCtx.permissions.has("enterprise.reports.view")).toBe(true);
  });
});
