import { describe, it, expect } from "vitest";
import {
  resolvePath,
  evaluateGroup,
  interpolate,
  interpolateObject,
} from "@/lib/automation/conditions";
import type { ConditionGroup } from "@/lib/automation/types";

describe("resolvePath", () => {
  const data = { invoice: { status: "paid", total: 1500, client: { name: "Acme" } }, tags: ["vip", "kra"] };

  it("resolves nested dot paths", () => {
    expect(resolvePath(data, "invoice.status")).toBe("paid");
    expect(resolvePath(data, "invoice.client.name")).toBe("Acme");
  });

  it("returns undefined for missing paths without throwing", () => {
    expect(resolvePath(data, "invoice.missing.deep")).toBeUndefined();
    expect(resolvePath(data, "")).toBeUndefined();
    expect(resolvePath(null, "a.b")).toBeUndefined();
  });
});

describe("evaluateGroup", () => {
  const data = { invoice: { status: "paid", total: 1500 }, tags: ["vip", "kra"] };

  it("passes when there are no rules", () => {
    expect(evaluateGroup(undefined, data)).toBe(true);
    expect(evaluateGroup({}, data)).toBe(true);
  });

  it("evaluates AND groups", () => {
    const g: ConditionGroup = {
      operator: "and",
      rules: [
        { field: "invoice.status", op: "eq", value: "paid" },
        { field: "invoice.total", op: "gt", value: 1000 },
      ],
    };
    expect(evaluateGroup(g, data)).toBe(true);
  });

  it("fails AND group when one rule fails", () => {
    const g: ConditionGroup = {
      operator: "and",
      rules: [
        { field: "invoice.status", op: "eq", value: "paid" },
        { field: "invoice.total", op: "gt", value: 5000 },
      ],
    };
    expect(evaluateGroup(g, data)).toBe(false);
  });

  it("evaluates OR groups", () => {
    const g: ConditionGroup = {
      operator: "or",
      rules: [
        { field: "invoice.status", op: "eq", value: "draft" },
        { field: "invoice.total", op: "gte", value: 1500 },
      ],
    };
    expect(evaluateGroup(g, data)).toBe(true);
  });

  it("supports contains / in operators on arrays", () => {
    expect(
      evaluateGroup({ operator: "and", rules: [{ field: "tags", op: "contains", value: "vip" }] }, data)
    ).toBe(true);
    expect(
      evaluateGroup({ operator: "and", rules: [{ field: "invoice.status", op: "in", value: ["paid", "sent"] }] }, data)
    ).toBe(true);
  });

  it("supports nested groups", () => {
    const g: ConditionGroup = {
      operator: "and",
      rules: [
        { field: "invoice.status", op: "eq", value: "paid" },
        {
          operator: "or",
          rules: [
            { field: "invoice.total", op: "gt", value: 9999 },
            { field: "tags", op: "contains", value: "kra" },
          ],
        },
      ],
    };
    expect(evaluateGroup(g, data)).toBe(true);
  });

  it("handles empty / not_empty", () => {
    expect(evaluateGroup({ operator: "and", rules: [{ field: "missing", op: "is_empty" }] }, data)).toBe(true);
    expect(evaluateGroup({ operator: "and", rules: [{ field: "invoice.status", op: "is_not_empty" }] }, data)).toBe(true);
  });
});

describe("interpolate", () => {
  const data = { invoice: { number: "INV-001", total: 1500 }, client: { name: "Acme" } };

  it("replaces {{path}} tokens", () => {
    expect(interpolate("Invoice {{invoice.number}} for {{client.name}}", data)).toBe("Invoice INV-001 for Acme");
  });

  it("replaces missing tokens with empty string", () => {
    expect(interpolate("Hi {{client.missing}}!", data)).toBe("Hi !");
  });

  it("interpolates object string values only", () => {
    const out = interpolateObject({ title: "{{invoice.number}}", amount: 1500, flag: true }, data);
    expect(out.title).toBe("INV-001");
    expect(out.amount).toBe(1500);
    expect(out.flag).toBe(true);
  });
});
