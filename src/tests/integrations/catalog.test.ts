import { describe, it, expect } from "vitest";
import { CATALOG, CATEGORIES, getCatalogEntry, isKnownProvider } from "@/lib/integrations/catalog";

describe("Integration Hub catalog", () => {
  it("defines 18 providers", () => {
    expect(CATALOG.length).toBe(18);
  });

  it("has unique provider ids", () => {
    const ids = CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every category", () => {
    const covered = new Set(CATALOG.map((c) => c.category));
    for (const cat of CATEGORIES) {
      expect(covered.has(cat.value)).toBe(true);
    }
  });

  it("every entry has required fields and a valid auth type", () => {
    const validAuth = ["oauth2", "api_key", "basic", "credentials", "none", "webhook"];
    for (const entry of CATALOG) {
      expect(entry.id).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(validAuth).toContain(entry.authType);
      expect(Array.isArray(entry.capabilities)).toBe(true);
      expect(entry.docsUrl.startsWith("http")).toBe(true);
    }
  });

  it("resolves entries and validates provider ids", () => {
    expect(isKnownProvider("stripe")).toBe(true);
    expect(isKnownProvider("does_not_exist")).toBe(false);
    expect(getCatalogEntry("stripe")?.name).toBe("Stripe");
  });
});
