import { describe, it, expect } from "vitest";
import { PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from "@/lib/rbac/permissions";

describe("Integration Hub RBAC", () => {
  const NEW_PERMS = [
    "integrations.view",
    "integrations.manage",
    "integrations.sync",
    "integrations.logs.view",
  ] as const;

  it("defines the new integration permission keys", () => {
    for (const key of NEW_PERMS) {
      expect(PERMISSIONS[key]).toBeDefined();
      expect(PERMISSIONS[key].category).toBe("integrations");
    }
  });

  it("grants owner all integration permissions", () => {
    for (const key of NEW_PERMS) {
      expect(SYSTEM_ROLE_PERMISSIONS.owner).toContain(key);
    }
  });

  it("grants manager full integration management", () => {
    expect(SYSTEM_ROLE_PERMISSIONS.manager).toContain("integrations.view");
    expect(SYSTEM_ROLE_PERMISSIONS.manager).toContain("integrations.manage");
    expect(SYSTEM_ROLE_PERMISSIONS.manager).toContain("integrations.sync");
    expect(SYSTEM_ROLE_PERMISSIONS.manager).toContain("integrations.logs.view");
  });

  it("grants accountant view/sync/logs but not manage", () => {
    expect(SYSTEM_ROLE_PERMISSIONS.accountant).toContain("integrations.view");
    expect(SYSTEM_ROLE_PERMISSIONS.accountant).toContain("integrations.sync");
    expect(SYSTEM_ROLE_PERMISSIONS.accountant).toContain("integrations.logs.view");
    expect(SYSTEM_ROLE_PERMISSIONS.accountant).not.toContain("integrations.manage");
  });

  it("grants viewer and employee only view", () => {
    expect(SYSTEM_ROLE_PERMISSIONS.viewer).toContain("integrations.view");
    expect(SYSTEM_ROLE_PERMISSIONS.viewer).not.toContain("integrations.manage");
    expect(SYSTEM_ROLE_PERMISSIONS.employee).toContain("integrations.view");
    expect(SYSTEM_ROLE_PERMISSIONS.employee).not.toContain("integrations.manage");
  });
});
