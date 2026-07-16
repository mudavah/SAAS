import { describe, it, expect, vi } from "vitest";
import { createBranch, listBranches } from "@/lib/enterprise/branches";
import { mockServerContext } from "@/tests/helpers/mock-context";

const mockCtx = mockServerContext({
  permissions: new Set(["enterprise.branches.manage", "enterprise.view"]),
});

describe("Enterprise Branches", () => {
  it("should have a valid mock context", () => {
    expect(mockCtx.organizationId).toBe("org-1");
    expect(mockCtx.permissions.has("enterprise.branches.manage")).toBe(true);
  });

  it("should export createBranch and listBranches", () => {
    expect(typeof createBranch).toBe("function");
    expect(typeof listBranches).toBe("function");
  });
});
