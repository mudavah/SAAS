import { describe, it, expect } from "vitest";
import { createInterBranchSale, listInterBranchSales } from "@/lib/enterprise/sales";
import type { ServerContext } from "@/lib/session";

const mockCtx: ServerContext = {
  userId: "user-1",
  organizationId: "org-1",
  roleType: "owner",
  memberId: "member-1",
  permissions: new Set(["enterprise.sales.manage", "enterprise.view"]),
  authMethod: "session",
};

describe("Enterprise Inter-Branch Sales", () => {
  it("should export sales functions", () => {
    expect(typeof createInterBranchSale).toBe("function");
    expect(typeof listInterBranchSales).toBe("function");
  });

  it("should have valid mock context", () => {
    expect(mockCtx.organizationId).toBe("org-1");
    expect(mockCtx.permissions.has("enterprise.sales.manage")).toBe(true);
  });
});
