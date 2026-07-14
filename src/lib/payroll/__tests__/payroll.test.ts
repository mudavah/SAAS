import { describe, it, expect } from "vitest";
import {
  computePAYE,
  computeNSSF,
  computeNHIF,
  computeHousingLevy,
  computePension,
  computePayrollBreakdown,
} from "@/lib/payroll/tax";

describe("Kenya payroll tax computation", () => {
  describe("computeNSSF", () => {
    it("applies tier 1 (6% up to 8,000) and tier 2 (6% up to 72,000)", () => {
      // tier1 = 8000 * 0.06 = 480; tier2 = (100000 - 8000 capped at 64000) * 0.06 = 3840
      expect(computeNSSF(100000).amount).toBe(4320);
    });

    it("caps tier 2 at 72,000 pensionable", () => {
      expect(computeNSSF(200000).amount).toBe(4320);
    });

    it("handles below tier 1", () => {
      expect(computeNSSF(5000).amount).toBe(300);
    });
  });

  describe("computeNHIF", () => {
    it("returns 150 for 0", () => {
      expect(computeNHIF(0).amount).toBe(150);
    });
    it("returns 750 for 24,000", () => {
      expect(computeNHIF(24000).amount).toBe(750);
    });
    it("returns 1200 for 50,000", () => {
      expect(computeNHIF(50000).amount).toBe(1200);
    });
    it("returns flat 1700 above 100,000", () => {
      expect(computeNHIF(150000).amount).toBe(1700);
    });
  });

  describe("computePAYE", () => {
    it("applies graduated bands with 2,400 personal relief", () => {
      // 100000 -> 2400 + 2083 + 20299.8 - 2400 = 22382.8 -> 22383
      expect(computePAYE(100000).amount).toBe(22383);
    });
    it("is 0 for very low income after relief", () => {
      expect(computePAYE(10000).amount).toBeLessThanOrEqual(0);
    });
  });

  describe("computeHousingLevy", () => {
    it("is 1.5% capped at 72,000", () => {
      expect(computeHousingLevy(100000).amount).toBe(1080);
      expect(computeHousingLevy(200000).amount).toBe(1080);
    });
  });

  describe("computePension", () => {
    it("is 5% capped at 72,000 by default", () => {
      expect(computePension(100000, 0.05).amount).toBe(3600);
      expect(computePension(200000, 0.05).amount).toBe(3600);
    });
  });

  describe("computePayrollBreakdown", () => {
    it("computes gross, statutory deductions, and net for basic salary only", () => {
      const b = computePayrollBreakdown({ basicSalary: 100000 });
      expect(b.totalEarnings).toBe(100000);
      expect(b.nssf).toBe(4320);
      expect(b.nhif).toBe(1700);
      expect(b.paye).toBe(22383);
      expect(b.housingLevy).toBe(1080);
      expect(b.pension).toBe(3600);
      expect(b.totalDeductions).toBe(33083);
      expect(b.totalTax).toBe(22383);
      expect(b.netPay).toBe(66917);
    });

    it("adds allowances to earnings and recomputes statutory", () => {
      const b = computePayrollBreakdown({
        basicSalary: 50000,
        allowances: [{ name: "Transport", amount: 5000 }],
      });
      expect(b.totalEarnings).toBe(55000);
      expect(b.allowances.reduce((s, a) => s + a.amount, 0)).toBe(5000);
      expect(b.netPay).toBe(38042);
    });

    it("includes overtime, bonus, and other deductions", () => {
      const b = computePayrollBreakdown({
        basicSalary: 100000,
        overtime: 5000,
        bonus: 2000,
        otherDeductions: [{ name: "Loan", amount: 5000 }],
      });
      expect(b.totalEarnings).toBe(107000);
      expect(b.overtime).toBe(5000);
      expect(b.bonus).toBe(2000);
      // gross 107000: nssf 4320, nhif 1700, paye graduated, housing 1080, pension 3600, other 5000
      expect(b.otherDeductions.length).toBe(1);
      expect(b.totalDeductions).toBe(b.nssf + b.nhif + b.paye + b.housingLevy + b.pension + 5000);
      expect(b.netPay).toBe(107000 - b.totalDeductions);
    });

    it("never returns negative net pay", () => {
      const b = computePayrollBreakdown({
        basicSalary: 5000,
        otherDeductions: [{ name: "Garnish", amount: 50000 }],
      });
      expect(b.netPay).toBeGreaterThanOrEqual(0);
    });
  });
});
