import { describe, it, expect } from "vitest";
import { createTransfer, listTransfers } from "@/lib/enterprise/transfers";
import { mockServerContext } from "@/tests/helpers/mock-context";

const mockCtx = mockServerContext({
  permissions: new Set(["enterprise.transfers.manage", "enterprise.view"]),
});

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
