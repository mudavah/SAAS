import { describe, it, expect } from "vitest";
import { createApprovalWorkflow, listApprovalRequests } from "@/lib/enterprise/approvals";
import type { ServerContext } from "@/lib/session";

const mockCtx: ServerContext = {
  userId: "user-1",
  organizationId: "org-1",
  roleType: "owner",
  memberId: "member-1",
  permissions: new Set(["enterprise.approvals.manage", "enterprise.view"]),
  authMethod: "session",
};

describe("Enterprise Approvals", () => {
  it("should export approval functions", () => {
    expect(typeof createApprovalWorkflow).toBe("function");
    expect(typeof listApprovalRequests).toBe("function");
  });

  it("should have valid mock context", () => {
    expect(mockCtx.organizationId).toBe("org-1");
    expect(mockCtx.permissions.has("enterprise.approvals.manage")).toBe(true);
  });
});
