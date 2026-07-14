/**
 * KaziFlow — condition evaluation & template interpolation
 * ------------------------------------------------------------------
 * Pure, dependency-free helpers used by the automation engine. Fully unit
 * tested in src/lib/automation/__tests__/conditions.test.ts.
 */
import type { ConditionGroup, ConditionRule } from "./types";

/** Resolve a dot-path ("invoice.status") against a context object. */
export function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function compare(op: ConditionRule["op"], actual: unknown, expected: unknown): boolean {
  const a = actual;
  const b = expected;

  switch (op) {
    case "eq":
      return String(a) === String(b);
    case "neq":
      return String(a) !== String(b);
    case "gt":
      return Number(a) > Number(b);
    case "gte":
      return Number(a) >= Number(b);
    case "lt":
      return Number(a) < Number(b);
    case "lte":
      return Number(a) <= Number(b);
    case "contains":
      if (Array.isArray(a)) return a.map(String).includes(String(b));
      return String(a ?? "").toLowerCase().includes(String(b ?? "").toLowerCase());
    case "not_contains":
      if (Array.isArray(a)) return !a.map(String).includes(String(b));
      return !String(a ?? "").toLowerCase().includes(String(b ?? "").toLowerCase());
    case "in":
      return Array.isArray(b) && b.map(String).includes(String(a));
    case "not_in":
      return Array.isArray(b) && !b.map(String).includes(String(a));
    case "is_empty":
      return a == null || a === "" || (Array.isArray(a) && a.length === 0);
    case "is_not_empty":
      return !(a == null || a === "" || (Array.isArray(a) && a.length === 0));
    default:
      return false;
  }
}

function isGroup(node: ConditionRule | ConditionGroup): node is ConditionGroup {
  return (node as ConditionGroup).rules !== undefined;
}

export function evaluateGroup(
  group: ConditionGroup | Record<string, never> | undefined,
  data: Record<string, unknown>
): boolean {
  if (!group || !("rules" in group) || !group.rules || group.rules.length === 0) {
    return true; // no conditions => always pass
  }

  const results = group.rules.map((rule) =>
    isGroup(rule) ? evaluateGroup(rule, data) : compare(rule.op, resolvePath(data, rule.field), rule.value)
  );

  return group.operator === "and" ? results.every(Boolean) : results.some(Boolean);
}

const TEMPLATE_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Replace {{path}} tokens in a string using the run context. */
export function interpolate(template: string, data: Record<string, unknown>): string {
  if (!template) return template;
  return template.replace(TEMPLATE_RE, (_match, path: string) => {
    const value = resolvePath(data, path);
    if (value == null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });
}

/** Interpolate every string value in a (shallow) config object. */
export function interpolateObject(
  config: Record<string, unknown>,
  data: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (typeof v === "string") out[k] = interpolate(v, data);
    else out[k] = v;
  }
  return out;
}
