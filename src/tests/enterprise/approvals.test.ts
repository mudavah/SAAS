import { describe, it, expect } from "vitest";
import { createApprovalWorkflow, listApprovalRequests } from "@/lib/enterprise/approvals";
import { mockServerContext } from "@/tests/helpers/mock-context";

const mockCtx = mockServerContext({
  permissions: new Set(["enterprise.approvals.manage", "enterprise.view"]),
});

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
