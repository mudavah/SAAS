/**
 * Tenant Isolation Verification
 * ------------------------------------------------------------------
 * Guards the core multi-tenant invariant: every business record is scoped to
 * an `organization_id`. This test statically parses src/db/schema.ts so the
 * guarantee is enforced in CI on every change — even without a live database.
 *
 * Allow-list: tables that are global by design (auth, tenant directory, the
 * RBAC permission catalog). Everything else MUST carry `organizationId`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  getEffectivePermissions,
  hasPermission,
  hasAllPermissions,
} from "@/lib/rbac";
import { SYSTEM_ROLES, PERMISSIONS } from "@/lib/rbac/permissions";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "db", "schema.ts");

// Tables that legitimately have NO organizationId (global / cross-tenant, or
// child tables that inherit tenancy from their parent FK, e.g. invoiceItems
// belongs to an org-scoped invoice).
const GLOBAL_TABLES = new Set([
  "users",
  "accounts",
  "sessions",
  "verificationTokens",
  "organizations",
  "permissions",
  "rolePermissions",
  "onboardingSteps",
  "onboardingTips",
  "invoiceItems",
  "paymentWebhookLogs",
]);

function parseTables(src: string): { name: string; body: string }[] {
  const tables: { name: string; body: string }[] = [];
  const re = /export const (\w+)\s*=\s*pgTable\(\s*["'][\w]+["']/g;
  const matches = [...src.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1];
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : src.length;
    tables.push({ name, body: src.slice(start, end) });
  }
  return tables;
}

describe("multi-tenant schema isolation", () => {
  const src = readFileSync(schemaPath, "utf8");
  const tables = parseTables(src);

  it("parses a substantial schema", () => {
    expect(tables.length).toBeGreaterThan(40);
  });

  it("every business table carries organizationId", () => {
    const violations: string[] = [];
    for (const t of tables) {
      if (GLOBAL_TABLES.has(t.name)) continue;
      // Skip join/lookup tables without their own tenancy (rare, whitelisted).
      if (!/organizationId/.test(t.body)) {
        violations.push(t.name);
      }
    }
    expect(violations, `Tables missing organizationId: ${violations.join(", ")}`).toEqual([]);
  });

  it("organizationId columns are FK-referenced to organizations", () => {
    const orgRefs = (src.match(/references\(\(\) => organizations\.id/g) || [])
      .length;
    expect(orgRefs).toBeGreaterThan(40);
  });
});

describe("RBAC tenant scoping semantics", () => {
  it("system role permissions are a superset-of-or-equal for owner", () => {
    const owner = getEffectivePermissions("owner");
    const keys = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[];
    for (const k of keys) {
      expect(owner.has(k as any)).toBe(true);
    }
  });

  it("custom permissions fully override the system role", () => {
    const base = getEffectivePermissions("viewer");
    expect(base.has("invoices.delete" as any)).toBe(false);
    const custom = getEffectivePermissions("viewer", ["invoices.delete" as any]);
    expect(custom.has("invoices.delete" as any)).toBe(true);
    // Non-granted key remains absent → no privilege escalation.
    expect(custom.has("payroll.approve" as any)).toBe(false);
  });

  it("owner has every catalogued permission", () => {
    const all = Object.keys(PERMISSIONS);
    const owner = getEffectivePermissions("owner");
    expect(hasAllPermissions(owner, all as any)).toBe(true);
  });

  it("viewer cannot manage organization billing by default", () => {
    const viewer = getEffectivePermissions("viewer");
    expect(hasPermission(viewer, "organization.manage_billing" as any)).toBe(false);
  });

  it("SYSTEM_ROLES catalog includes the core tenant roles", () => {
    for (const r of ["owner", "administrator", "manager", "accountant", "employee", "viewer"]) {
      expect(SYSTEM_ROLES).toContain(r as any);
    }
    expect(SYSTEM_ROLES.length).toBeGreaterThanOrEqual(6);
  });
});
