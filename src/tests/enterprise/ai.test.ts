import { describe, it, expect } from "vitest";
import { generateBranchInsights, getBranchInsights } from "@/lib/enterprise/ai";
import { mockServerContext } from "@/tests/helpers/mock-context";

const mockCtx = mockServerContext({
  permissions: new Set(["enterprise.ai.access", "enterprise.view"]),
});

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
