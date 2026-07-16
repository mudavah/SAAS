import { describe, it, expect } from "vitest";
import { getBranchPerformance, getConsolidatedReport } from "@/lib/enterprise/reports";
import { mockServerContext } from "@/tests/helpers/mock-context";

const mockCtx = mockServerContext({
  permissions: new Set(["enterprise.reports.view", "enterprise.view"]),
});

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
