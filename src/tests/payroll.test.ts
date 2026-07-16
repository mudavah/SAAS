/**
 * Payroll module — unit tests (expanded)
 * ------------------------------------------------------------------
 * Builds on the existing payroll/tax tests with extra coverage of the payroll
 * validation schemas (period, run, salary structure, component, assignment,
 * approval, export) and the payslip/breakdown math reconciliation. Pure (no DB).
 */
import { describe, it, expect } from "vitest";
import {
  computePayrollBreakdown,
  computePAYE,
  computeNSSF,
  computeNHIF,
  computeHousingLevy,
} from "@/lib/payroll/tax";
import {
  payrollPeriodSchema,
  payrollRunSchema,
  salaryStructureSchema,
  salaryStructureComponentSchema,
  employeeSalaryAssignmentSchema,
  payrollApprovalSchema,
  payrollPaymentExportSchema,
} from "@/lib/validations";

describe("computePayrollBreakdown (net pay math)", () => {
  it("produces earnings, deductions and net that reconcile", () => {
    const b = computePayrollBreakdown({ basicSalary: 100000, allowances: [{ name: "T", amount: 10000 }] });
    const expectedGross = 110000;
    const expectedDeductions =
      b.nssf + b.nhif + b.paye + b.housingLevy + b.pension;
    expect(b.totalEarnings).toBe(expectedGross);
    expect(b.totalDeductions).toBe(expectedDeductions);
    expect(b.netPay).toBeCloseTo(expectedGross - expectedDeductions, 0);
  });

  it("includes statutory deductions equal to the standalone compute helpers", () => {
    const b = computePayrollBreakdown({ basicSalary: 100000 });
    expect(b.nssf).toBe(computeNSSF(100000).amount);
    expect(b.nhif).toBe(computeNHIF(100000).amount);
    expect(b.paye).toBe(computePAYE(100000).amount);
    expect(b.housingLevy).toBe(computeHousingLevy(100000).amount);
  });

  it("never returns a negative net pay even with huge other deductions", () => {
    const b = computePayrollBreakdown({
      basicSalary: 5000,
      otherDeductions: [{ name: "Garnish", amount: 50000 }],
    });
    expect(b.netPay).toBeGreaterThanOrEqual(0);
  });
});

describe("payroll validation schemas", () => {
  it("payrollRunSchema requires a payroll period id", () => {
    expect(payrollRunSchema.safeParse({ payrollPeriodId: "p1" }).success).toBe(true);
    expect(payrollRunSchema.safeParse({}).success).toBe(false);
  });
  it("payrollPeriodSchema requires name and date range", () => {
    expect(payrollPeriodSchema.safeParse({ name: "Jan 2026", startDate: "2026-01-01", endDate: "2026-01-31" }).success).toBe(true);
    expect(payrollPeriodSchema.safeParse({ startDate: "2026-01-01", endDate: "2026-01-31" }).success).toBe(false);
  });
  it("salaryStructureSchema requires a name", () => {
    expect(salaryStructureSchema.safeParse({ name: "Standard" }).success).toBe(true);
    expect(salaryStructureSchema.safeParse({}).success).toBe(false);
  });
  it("salaryStructureComponentSchema requires structure, name and type", () => {
    expect(salaryStructureComponentSchema.safeParse({ salaryStructureId: "s1", name: "Housing", type: "earnings", amount: 2000 }).success).toBe(true);
    expect(salaryStructureComponentSchema.safeParse({ name: "Housing", type: "earnings", amount: 2000 }).success).toBe(false);
  });
  it("employeeSalaryAssignmentSchema requires employee, structure and effective date", () => {
    expect(employeeSalaryAssignmentSchema.safeParse({ employeeId: "e1", salaryStructureId: "s1", effectiveDate: "2026-01-01", basicSalary: 50000 }).success).toBe(true);
    expect(employeeSalaryAssignmentSchema.safeParse({ employeeId: "e1" }).success).toBe(false);
  });
  it("payrollApprovalSchema requires approve/reject action", () => {
    expect(payrollApprovalSchema.safeParse({ action: "approve" }).success).toBe(true);
    expect(payrollApprovalSchema.safeParse({ action: "maybe" }).success).toBe(false);
  });
  it("payrollPaymentExportSchema defaults to csv", () => {
    expect(payrollPaymentExportSchema.parse({}).format).toBe("csv");
    expect(payrollPaymentExportSchema.safeParse({ format: "pdf" }).success).toBe(true);
  });
});
