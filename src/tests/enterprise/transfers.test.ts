import { describe, it, expect } from "vitest";
import { createTransfer, listTransfers } from "@/lib/enterprise/transfers";
import type { ServerContext } from "@/lib/session";

const mockCtx: ServerContext = {
  userId: "user-1",
  organizationId: "org-1",
  roleType: "owner",
  memberId: "member-1",
  permissions: new Set(["enterprise.transfers.manage", "enterprise.view"]),
  authMethod: "session",
};

describe("Enterprise Transfers", () => {
  it("should export transfer functions", () => {
    expect(typeof createTransfer).toBe("function");
    expect(typeof listTransfers).toBe("function");
  });

  it("should have valid mock context", () => {
    expect(mockCtx.organizationId).toBe("org-1");
    expect(mockCtx.permissions.has("enterprise.transfers.manage")).toBe(true);
  });
});
