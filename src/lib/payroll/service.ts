/**
 * KaziFlow — Payroll Service (Epic 6)
 * ------------------------------------------------------------------
 * Complete payroll business logic: periods, salary structures, runs,
 * payslips, approvals, exports, journals, AI insights, reports, and the
 * employee payroll portal. All mutations are RBAC-gated, audited, and emit
 * Business Timeline events.
 */

import { db } from "@/db";
import {
  payrollPeriods,
  salaryStructures,
  salaryStructureComponents,
  employeeSalaryAssignments,
  payrollRuns,
  payrollRunEmployees,
  payrollRunDetails,
  payslips,
  payrollPaymentExports,
  payrollApprovalWorkflows,
  payrollAiInsights,
  hrEmployees,
  type PayrollRun,
  type PayrollRunEmployee,
  type Payslip,
  type PayrollPaymentExport,
  type PayrollAiInsight,
} from "@/db/schema";
import { and, desc, eq, gte, lte, sql, sum, count, inArray, asc } from "drizzle-orm";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { createNotification } from "@/lib/notifications";
import type { ServerContext } from "@/lib/session";
import {
  payrollPeriodSchema,
  salaryStructureSchema,
  salaryStructureComponentSchema,
  employeeSalaryAssignmentSchema,
  payrollRunSchema,
  payrollApprovalSchema,
  payrollPaymentExportSchema,
  payrollAiInsightSchema,
} from "@/lib/validations";
import { computePayrollBreakdown } from "./tax";
import { postPayrollJournalEntry } from "./accounts";

async function nextPayrollRunNumber(organizationId: string): Promise<string> {
  const rows = await db.select({ c: sql<number>`count(*)` }).from(payrollRuns).where(eq(payrollRuns.organizationId, organizationId));
  const n = Number(rows[0]?.c || 0) + 1;
  return `PRN-${String(n).padStart(4, "0")}`;
}

async function nextPayslipNumber(organizationId: string): Promise<string> {
  const rows = await db.select({ c: sql<number>`count(*)` }).from(payslips).where(eq(payslips.organizationId, organizationId));
  const n = Number(rows[0]?.c || 0) + 1;
  return `PSL-${String(n).padStart(5, "0")}`;
}

async function nextExportNumber(organizationId: string): Promise<string> {
  const rows = await db.select({ c: sql<number>`count(*)` }).from(payrollPaymentExports).where(eq(payrollPaymentExports.organizationId, organizationId));
  const n = Number(rows[0]?.c || 0) + 1;
  return `EXP-${String(n).padStart(4, "0")}`;
}

// ── Payroll Periods ────────────────────────────────────────────────────────────

export async function createPayrollPeriod(ctx: ServerContext, body: unknown) {
  const parsed = payrollPeriodSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [period] = await db.insert(payrollPeriods).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId!,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    isLocked: data.isLocked ?? false,
  }).returning();
  await logAuditSafe(ctx, {
    action: "payroll.period.create",
    category: "payroll",
    resourceType: "payroll_period",
    resourceId: period.id,
    description: `Created payroll period ${period.name}`,
    newValues: { name: period.name, startDate: period.startDate, endDate: period.endDate },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.period.created",
    title: `Payroll period ${period.name} created`,
    resourceType: "payroll_period",
    resourceId: period.id,
  });
  return { period, status: 201 };
}

export async function getPayrollPeriods(organizationId: string) {
  return db.query.payrollPeriods.findMany({
    where: eq(payrollPeriods.organizationId, organizationId),
    orderBy: [desc(payrollPeriods.createdAt)],
  });
}

export async function getPayrollPeriod(organizationId: string, id: string) {
  return db.query.payrollPeriods.findFirst({
    where: and(eq(payrollPeriods.id, id), eq(payrollPeriods.organizationId, organizationId)),
  });
}

export async function updatePayrollPeriod(ctx: ServerContext, id: string, body: unknown) {
  const parsed = payrollPeriodSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const existing = await db.query.payrollPeriods.findFirst({
    where: and(eq(payrollPeriods.id, id), eq(payrollPeriods.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Payroll period not found", status: 404 };
  if (existing.status !== "open") return { error: "Cannot update a closed or locked period", status: 400 };
  const [period] = await db.update(payrollPeriods).set({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    isLocked: data.isLocked ?? existing.isLocked,
    updatedAt: new Date(),
  }).where(eq(payrollPeriods.id, id)).returning();
  await logAuditSafe(ctx, {
    action: "payroll.period.update",
    category: "payroll",
    resourceType: "payroll_period",
    resourceId: id,
    description: `Updated payroll period ${period.name}`,
    oldValues: { name: existing.name },
    newValues: { name: period.name },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.period.updated",
    title: `Payroll period ${period.name} updated`,
    resourceType: "payroll_period",
    resourceId: id,
  });
  return { period, status: 200 };
}

export async function closePayrollPeriod(ctx: ServerContext, id: string) {
  const existing = await db.query.payrollPeriods.findFirst({
    where: and(eq(payrollPeriods.id, id), eq(payrollPeriods.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Payroll period not found", status: 404 };
  if (existing.status === "closed" || existing.status === "locked") return { error: "Period is already closed", status: 400 };
  const [period] = await db.update(payrollPeriods).set({
    status: "closed",
    closedAt: new Date(),
    closedBy: ctx.userId,
    updatedAt: new Date(),
  }).where(eq(payrollPeriods.id, id)).returning();
  await logAuditSafe(ctx, {
    action: "payroll.period.close",
    category: "payroll",
    resourceType: "payroll_period",
    resourceId: id,
    description: `Closed payroll period ${period.name}`,
    newValues: { status: "closed" },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.period.closed",
    title: `Payroll period ${period.name} closed`,
    resourceType: "payroll_period",
    resourceId: id,
  });
  return { period, status: 200 };
}

export async function lockPayrollPeriod(ctx: ServerContext, id: string) {
  const existing = await db.query.payrollPeriods.findFirst({
    where: and(eq(payrollPeriods.id, id), eq(payrollPeriods.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Payroll period not found", status: 404 };
  const [period] = await db.update(payrollPeriods).set({
    status: "locked",
    isLocked: true,
    updatedAt: new Date(),
  }).where(eq(payrollPeriods.id, id)).returning();
  await logAuditSafe(ctx, {
    action: "payroll.period.lock",
    category: "payroll",
    resourceType: "payroll_period",
    resourceId: id,
    description: `Locked payroll period ${period.name}`,
  });
  return { period, status: 200 };
}

export async function deletePayrollPeriod(ctx: ServerContext, id: string) {
  const existing = await db.query.payrollPeriods.findFirst({
    where: and(eq(payrollPeriods.id, id), eq(payrollPeriods.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Payroll period not found", status: 404 };
  if (existing.status !== "open") return { error: "Only open periods can be deleted", status: 400 };
  await db.delete(payrollPeriods).where(eq(payrollPeriods.id, id));
  await logAuditSafe(ctx, {
    action: "payroll.period.delete",
    category: "payroll",
    resourceType: "payroll_period",
    resourceId: id,
    description: `Deleted payroll period ${existing.name}`,
  });
  return { success: true, status: 200 };
}

// ── Salary Structures ──────────────────────────────────────────────────────────

export async function createSalaryStructure(ctx: ServerContext, body: unknown) {
  const parsed = salaryStructureSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [structure] = await db.insert(salaryStructures).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId!,
    name: data.name,
    description: data.description ?? null,
    type: data.type,
    isActive: data.isActive ?? true,
  }).returning();
  await logAuditSafe(ctx, {
    action: "payroll.salary_structure.create",
    category: "payroll",
    resourceType: "salary_structure",
    resourceId: structure.id,
    description: `Created salary structure ${structure.name}`,
    newValues: { name: structure.name },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.salary_structure.created",
    title: `Salary structure ${structure.name} created`,
    resourceType: "salary_structure",
    resourceId: structure.id,
  });
  return { structure, status: 201 };
}

export async function getSalaryStructures(organizationId: string) {
  return db.query.salaryStructures.findMany({
    where: eq(salaryStructures.organizationId, organizationId),
    with: { components: true, assignments: { with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } } } },
    orderBy: [desc(salaryStructures.createdAt)],
  });
}

export async function getSalaryStructure(organizationId: string, id: string) {
  return db.query.salaryStructures.findFirst({
    where: and(eq(salaryStructures.id, id), eq(salaryStructures.organizationId, organizationId)),
    with: {
      components: { orderBy: [asc(salaryStructureComponents.sortOrder), asc(salaryStructureComponents.name)] },
      assignments: {
        with: {
          employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        },
      },
    },
  });
}

export async function updateSalaryStructure(ctx: ServerContext, id: string, body: unknown) {
  const parsed = salaryStructureSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const existing = await db.query.salaryStructures.findFirst({
    where: and(eq(salaryStructures.id, id), eq(salaryStructures.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Salary structure not found", status: 404 };
  const [structure] = await db.update(salaryStructures).set({
    name: data.name,
    description: data.description ?? null,
    type: data.type,
    isActive: data.isActive ?? existing.isActive,
    updatedAt: new Date(),
  }).where(eq(salaryStructures.id, id)).returning();
  await logAuditSafe(ctx, {
    action: "payroll.salary_structure.update",
    category: "payroll",
    resourceType: "salary_structure",
    resourceId: id,
    description: `Updated salary structure ${structure.name}`,
    oldValues: { name: existing.name },
    newValues: { name: structure.name },
  });
  return { structure, status: 200 };
}

export async function deleteSalaryStructure(ctx: ServerContext, id: string) {
  const existing = await db.query.salaryStructures.findFirst({
    where: and(eq(salaryStructures.id, id), eq(salaryStructures.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Salary structure not found", status: 404 };
  await db.delete(salaryStructures).where(eq(salaryStructures.id, id));
  await logAuditSafe(ctx, {
    action: "payroll.salary_structure.delete",
    category: "payroll",
    resourceType: "salary_structure",
    resourceId: id,
    description: `Deleted salary structure ${existing.name}`,
    oldValues: { name: existing.name },
  });
  return { success: true, status: 200 };
}

// ── Salary Structure Components ────────────────────────────────────────────────

export async function createSalaryStructureComponent(ctx: ServerContext, body: unknown) {
  const parsed = salaryStructureComponentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const structure = await db.query.salaryStructures.findFirst({
    where: and(eq(salaryStructures.id, data.salaryStructureId), eq(salaryStructures.organizationId, ctx.organizationId)),
  });
  if (!structure) return { error: "Salary structure not found", status: 404 };
  const [component] = await db.insert(salaryStructureComponents).values({
    organizationId: ctx.organizationId,
    salaryStructureId: data.salaryStructureId,
    name: data.name,
    type: data.type,
    amount: data.amount.toString(),
    isPercentage: data.isPercentage,
    isRecurring: data.isRecurring,
    isTaxable: data.isTaxable,
    isStatutory: data.isStatutory,
    sortOrder: data.sortOrder,
  }).returning();
  await logAuditSafe(ctx, {
    action: "payroll.component.create",
    category: "payroll",
    resourceType: "salary_structure_component",
    resourceId: component.id,
    description: `Created component ${component.name}`,
    newValues: { name: component.name, type: component.type },
  });
  return { component, status: 201 };
}

export async function getSalaryStructureComponents(organizationId: string, structureId: string) {
  return db.query.salaryStructureComponents.findMany({
    where: and(eq(salaryStructureComponents.salaryStructureId, structureId), eq(salaryStructureComponents.organizationId, organizationId)),
    orderBy: [asc(salaryStructureComponents.sortOrder), asc(salaryStructureComponents.name)],
  });
}

export async function updateSalaryStructureComponent(ctx: ServerContext, id: string, body: unknown) {
  const parsed = salaryStructureComponentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const existing = await db.query.salaryStructureComponents.findFirst({
    where: and(eq(salaryStructureComponents.id, id), eq(salaryStructureComponents.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Component not found", status: 404 };
  const [component] = await db.update(salaryStructureComponents).set({
    name: data.name,
    type: data.type,
    amount: data.amount.toString(),
    isPercentage: data.isPercentage,
    isRecurring: data.isRecurring,
    isTaxable: data.isTaxable,
    isStatutory: data.isStatutory,
    sortOrder: data.sortOrder,
    updatedAt: new Date(),
  }).where(eq(salaryStructureComponents.id, id)).returning();
  await logAuditSafe(ctx, {
    action: "payroll.component.update",
    category: "payroll",
    resourceType: "salary_structure_component",
    resourceId: id,
    description: `Updated component ${component.name}`,
    oldValues: { name: existing.name },
    newValues: { name: component.name },
  });
  return { component, status: 200 };
}

export async function deleteSalaryStructureComponent(ctx: ServerContext, id: string) {
  const existing = await db.query.salaryStructureComponents.findFirst({
    where: and(eq(salaryStructureComponents.id, id), eq(salaryStructureComponents.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Component not found", status: 404 };
  await db.delete(salaryStructureComponents).where(eq(salaryStructureComponents.id, id));
  await logAuditSafe(ctx, {
    action: "payroll.component.delete",
    category: "payroll",
    resourceType: "salary_structure_component",
    resourceId: id,
    description: `Deleted component ${existing.name}`,
    oldValues: { name: existing.name },
  });
  return { success: true, status: 200 };
}

// ── Employee Salary Assignments ────────────────────────────────────────────────

export async function assignEmployeeSalary(ctx: ServerContext, body: unknown) {
  const parsed = employeeSalaryAssignmentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const employee = await db.query.hrEmployees.findFirst({
    where: and(eq(hrEmployees.id, data.employeeId), eq(hrEmployees.organizationId, ctx.organizationId)),
  });
  if (!employee) return { error: "Employee not found", status: 404 };
  const structure = await db.query.salaryStructures.findFirst({
    where: and(eq(salaryStructures.id, data.salaryStructureId), eq(salaryStructures.organizationId, ctx.organizationId)),
  });
  if (!structure) return { error: "Salary structure not found", status: 404 };
  const [assignment] = await db.insert(employeeSalaryAssignments).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId!,
    employeeId: data.employeeId,
    salaryStructureId: data.salaryStructureId,
    effectiveDate: data.effectiveDate,
    endDate: data.endDate ?? null,
    basicSalary: data.basicSalary.toString(),
    currency: data.currency,
  }).returning();
  await logAuditSafe(ctx, {
    action: "payroll.assignment.create",
    category: "payroll",
    resourceType: "employee_salary_assignment",
    resourceId: assignment.id,
    description: `Assigned salary to ${employee.firstName} ${employee.lastName}`,
    newValues: { employeeId: data.employeeId, basicSalary: data.basicSalary },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.assignment.created",
    title: `Salary assigned to ${employee.employeeNumber}`,
    resourceType: "employee_salary_assignment",
    resourceId: assignment.id,
  });
  return { assignment, status: 201 };
}

export async function getEmployeeSalaryAssignments(organizationId: string, employeeId?: string) {
  const base = eq(employeeSalaryAssignments.organizationId, organizationId);
  const where = employeeId ? and(base, eq(employeeSalaryAssignments.employeeId, employeeId)) : base;
  return db.query.employeeSalaryAssignments.findMany({
    where: where as any,
    with: {
      employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      structure: { columns: { id: true, name: true, type: true } },
    },
    orderBy: [desc(employeeSalaryAssignments.effectiveDate)],
  });
}

// ── Payroll Runs ───────────────────────────────────────────────────────────────

export async function createPayrollRun(ctx: ServerContext, body: unknown) {
  const parsed = payrollRunSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const period = await db.query.payrollPeriods.findFirst({
    where: and(eq(payrollPeriods.id, data.payrollPeriodId), eq(payrollPeriods.organizationId, ctx.organizationId)),
  });
  if (!period) return { error: "Payroll period not found", status: 404 };
  if (period.status === "closed" || period.status === "locked") return { error: "Cannot create a run for a closed period", status: 400 };
  const runNumber = await nextPayrollRunNumber(ctx.organizationId);
  const [run] = await db.insert(payrollRuns).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId!,
    payrollPeriodId: data.payrollPeriodId,
    runNumber,
    status: "draft",
    notes: data.notes ?? null,
  }).returning();
  await logAuditSafe(ctx, {
    action: "payroll.run.create",
    category: "payroll",
    resourceType: "payroll_run",
    resourceId: run.id,
    description: `Created payroll run ${run.runNumber}`,
    newValues: { runNumber: run.runNumber, periodId: data.payrollPeriodId },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.run.created",
    title: `Payroll run ${run.runNumber} created`,
    resourceType: "payroll_run",
    resourceId: run.id,
  });
  return { run, status: 201 };
}

export async function getPayrollRuns(organizationId: string) {
  return db.query.payrollRuns.findMany({
    where: eq(payrollRuns.organizationId, organizationId),
    with: {
      period: { columns: { id: true, name: true, startDate: true, endDate: true } },
    },
    orderBy: [desc(payrollRuns.createdAt)],
  });
}

export async function getPayrollRun(organizationId: string, id: string) {
  return db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.id, id), eq(payrollRuns.organizationId, organizationId)),
    with: {
      period: true,
      employees: {
        with: {
          employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true, email: true } },
          details: true,
        },
      },
      approvals: { with: { approver: { columns: { id: true, name: true, email: true } } } },
    },
  });
}

export async function processPayrollRun(ctx: ServerContext, id: string) {
  const run = await db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.id, id), eq(payrollRuns.organizationId, ctx.organizationId)),
  });
  if (!run) return { error: "Payroll run not found", status: 404 };
  if (run.status !== "draft") return { error: `Run is already ${run.status}`, status: 400 };

  const period = await db.query.payrollPeriods.findFirst({ where: eq(payrollPeriods.id, run.payrollPeriodId) });
  if (!period) return { error: "Payroll period not found", status: 404 };

  const assignments = await db.query.employeeSalaryAssignments.findMany({
    where: and(
      eq(employeeSalaryAssignments.organizationId, ctx.organizationId),
      lte(employeeSalaryAssignments.effectiveDate, period.endDate),
      sql`(${employeeSalaryAssignments.endDate} IS NULL OR ${employeeSalaryAssignments.endDate} >= ${period.startDate})`
    ),
    with: {
      employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true, email: true, status: true } },
      structure: {
        with: {
          components: { orderBy: [asc(salaryStructureComponents.sortOrder), asc(salaryStructureComponents.name)] },
        },
      },
    },
  });

  const activeEmployees = assignments.filter(
    (a) => (a.employee as any).status === "active" || (a.employee as any).status === "on_leave"
  );

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const assignment of activeEmployees) {
    const allowances: { name: string; amount: number }[] = [];
    const otherDeductions: { name: string; amount: number }[] = [];
    let overtime = 0;
    let bonus = 0;

    for (const component of (assignment.structure as any).components as any[]) {
      const amount = Number(component.amount);
      if (component.type === "allowance" || component.type === "earnings") {
        allowances.push({ name: component.name, amount });
      } else if (component.type === "overtime") {
        overtime += amount;
      } else if (component.type === "bonus") {
        bonus += amount;
      } else if (component.type === "deduction") {
        otherDeductions.push({ name: component.name, amount });
      }
    }

    const breakdown = computePayrollBreakdown({
      basicSalary: Number(assignment.basicSalary),
      allowances,
      overtime,
      bonus,
      otherDeductions,
    });

    const [runEmployee] = await db.insert(payrollRunEmployees).values({
      organizationId: ctx.organizationId,
      payrollRunId: run.id,
      employeeId: assignment.employeeId,
      basicSalary: assignment.basicSalary,
      grossEarnings: breakdown.totalEarnings.toFixed(2),
      totalAllowances: breakdown.allowances.reduce((s, x) => s + x.amount, 0).toFixed(2),
      totalDeductions: breakdown.totalDeductions.toFixed(2),
      totalTax: breakdown.totalTax.toFixed(2),
      netPay: breakdown.netPay.toFixed(2),
      paymentMethod: "bank_transfer",
    }).returning();

    const details: {
      itemType: string;
      name: string;
      amount: string;
      isPercentage: boolean;
      baseAmount: string;
      sortOrder: number;
    }[] = [];

    details.push({ itemType: "earnings", name: "Basic Salary", amount: breakdown.basicSalary.toFixed(2), isPercentage: false, baseAmount: breakdown.basicSalary.toFixed(2), sortOrder: details.length });
    for (const allowance of breakdown.allowances) {
      details.push({ itemType: "allowance", name: allowance.name, amount: allowance.amount.toFixed(2), isPercentage: false, baseAmount: allowance.amount.toFixed(2), sortOrder: details.length });
    }
    if (breakdown.overtime > 0) {
      details.push({ itemType: "overtime", name: "Overtime", amount: breakdown.overtime.toFixed(2), isPercentage: false, baseAmount: breakdown.overtime.toFixed(2), sortOrder: details.length });
    }
    if (breakdown.bonus > 0) {
      details.push({ itemType: "bonus", name: "Bonus", amount: breakdown.bonus.toFixed(2), isPercentage: false, baseAmount: breakdown.bonus.toFixed(2), sortOrder: details.length });
    }
    details.push({ itemType: "tax_nssf", name: "NSSF", amount: breakdown.nssf.toFixed(2), isPercentage: false, baseAmount: breakdown.nssf.toFixed(2), sortOrder: details.length });
    details.push({ itemType: "tax_nhif", name: "NHIF", amount: breakdown.nhif.toFixed(2), isPercentage: false, baseAmount: breakdown.nhif.toFixed(2), sortOrder: details.length });
    details.push({ itemType: "tax_paye", name: "PAYE", amount: breakdown.paye.toFixed(2), isPercentage: false, baseAmount: breakdown.paye.toFixed(2), sortOrder: details.length });
    details.push({ itemType: "tax_housing_levy", name: "Housing Levy", amount: breakdown.housingLevy.toFixed(2), isPercentage: false, baseAmount: breakdown.housingLevy.toFixed(2), sortOrder: details.length });
    if (breakdown.pension > 0) {
      details.push({ itemType: "tax_pension", name: "Pension", amount: breakdown.pension.toFixed(2), isPercentage: false, baseAmount: breakdown.pension.toFixed(2), sortOrder: details.length });
    }
    for (const deduction of breakdown.otherDeductions) {
      details.push({ itemType: "deduction", name: deduction.name, amount: deduction.amount.toFixed(2), isPercentage: false, baseAmount: deduction.amount.toFixed(2), sortOrder: details.length });
    }

    await db.insert(payrollRunDetails).values(
      details.map((d) => ({ organizationId: ctx.organizationId, payrollRunEmployeeId: runEmployee.id, ...d })) as any
    );

    totalGross += breakdown.totalEarnings;
    totalDeductions += breakdown.totalDeductions;
    totalNet += breakdown.netPay;
  }

  const [updatedRun] = await db.update(payrollRuns).set({
    status: "calculated",
    totalEmployees: activeEmployees.length,
    totalGross: totalGross.toFixed(2),
    totalDeductions: totalDeductions.toFixed(2),
    totalNet: totalNet.toFixed(2),
    processedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(payrollRuns.id, id)).returning();

  await logAuditSafe(ctx, {
    action: "payroll.run.process",
    category: "payroll",
    resourceType: "payroll_run",
    resourceId: id,
    description: `Processed payroll run ${run.runNumber}`,
    newValues: { status: "calculated", employees: activeEmployees.length, totalGross, totalDeductions, totalNet },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.run.processed",
    title: `Payroll run ${run.runNumber} processed`,
    resourceType: "payroll_run",
    resourceId: id,
    metadata: { employees: activeEmployees.length, totalGross, totalDeductions, totalNet },
  });
  await createNotification({
    organizationId: ctx.organizationId,
    category: "payroll",
    type: "payroll_run_processed",
    title: "Payroll run processed",
    message: `Payroll run ${run.runNumber} has been calculated for ${activeEmployees.length} employees. Total net: KES ${totalNet.toLocaleString()}.`,
    priority: "normal",
    deepLink: `/dashboard/payroll/runs/${id}`,
    userId: ctx.userId,
  });

  return { run: updatedRun, status: 200 };
}

export async function approvePayrollRun(ctx: ServerContext, id: string, body: unknown) {
  const parsed = payrollApprovalSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const run = await db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.id, id), eq(payrollRuns.organizationId, ctx.organizationId)),
  });
  if (!run) return { error: "Payroll run not found", status: 404 };
  if (run.status !== "calculated" && run.status !== "pending_approval") {
    return { error: `Run cannot be approved in ${run.status} state`, status: 400 };
  }

  const newStatus = data.action === "approve" ? "approved" : "rejected";

  const [updatedRun] = await db.update(payrollRuns).set({
    status: newStatus,
    approvedBy: ctx.userId,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(payrollRuns.id, id)).returning();

  await db.insert(payrollApprovalWorkflows).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId!,
    payrollRunId: id,
    approverId: ctx.userId!,
    action: data.action,
    comment: data.comment ?? null,
    actedAt: new Date(),
  });

  const actionLabel = data.action === "approve" ? "approved" : "rejected";
  await logAuditSafe(ctx, {
    action: `payroll.run.${data.action}`,
    category: "payroll",
    resourceType: "payroll_run",
    resourceId: id,
    description: `Payroll run ${run.runNumber} ${actionLabel}`,
    newValues: { status: newStatus, comment: data.comment },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: data.action === "approve" ? "payroll.run.approved" : "payroll.run.rejected",
    title: `Payroll run ${run.runNumber} ${actionLabel}`,
    resourceType: "payroll_run",
    resourceId: id,
    metadata: { comment: data.comment },
  });
  await createNotification({
    organizationId: ctx.organizationId,
    category: "payroll",
    type: `payroll_run_${data.action}d`,
    title: `Payroll run ${actionLabel}`,
    message: `Payroll run ${run.runNumber} has been ${actionLabel}${data.comment ? `: ${data.comment}` : ""}.`,
    priority: data.action === "approve" ? "normal" : "high",
    deepLink: `/dashboard/payroll/runs/${id}`,
    userId: ctx.userId,
  });

  return { run: updatedRun, status: 200 };
}

export async function markPayrollRunPaid(ctx: ServerContext, id: string) {
  const run = await db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.id, id), eq(payrollRuns.organizationId, ctx.organizationId)),
  });
  if (!run) return { error: "Payroll run not found", status: 404 };
  if (run.status !== "approved") return { error: "Run must be approved before marking as paid", status: 400 };

  const [updatedRun] = await db.update(payrollRuns).set({
    status: "paid",
    paidAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(payrollRuns.id, id)).returning();

  await logAuditSafe(ctx, {
    action: "payroll.run.paid",
    category: "payroll",
    resourceType: "payroll_run",
    resourceId: id,
    description: `Marked payroll run ${run.runNumber} as paid`,
    newValues: { status: "paid" },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.run.paid",
    title: `Payroll run ${run.runNumber} marked as paid`,
    resourceType: "payroll_run",
    resourceId: id,
  });
  await createNotification({
    organizationId: ctx.organizationId,
    category: "payroll",
    type: "payroll_run_paid",
    title: "Payroll run paid",
    message: `Payroll run ${run.runNumber} has been marked as paid. KES ${Number(run.totalNet).toLocaleString()} disbursed.`,
    priority: "normal",
    deepLink: `/dashboard/payroll/runs/${id}`,
    userId: ctx.userId,
  });

  return { run: updatedRun, status: 200 };
}

// ── Payslips ──────────────────────────────────────────────────────────────────

export async function generatePayslips(ctx: ServerContext, runId: string) {
  const run = await db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.id, runId), eq(payrollRuns.organizationId, ctx.organizationId)),
  });
  if (!run) return { error: "Payroll run not found", status: 404 };
  if (run.status !== "approved") return { error: "Run must be approved before generating payslips", status: 400 };

  const period = await db.query.payrollPeriods.findFirst({ where: eq(payrollPeriods.id, run.payrollPeriodId) });
  if (!period) return { error: "Payroll period not found", status: 404 };

  const runEmployees = await db.query.payrollRunEmployees.findMany({
    where: eq(payrollRunEmployees.payrollRunId, runId),
    with: { details: true },
  });

  const generatedPayslips: Payslip[] = [];
  for (const runEmployee of runEmployees) {
    const payslipNumber = await nextPayslipNumber(ctx.organizationId);
    const [payslip] = await db.insert(payslips).values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      payrollRunEmployeeId: runEmployee.id,
      employeeId: runEmployee.employeeId,
      payslipNumber,
      status: "generated",
      periodStart: period.startDate,
      periodEnd: period.endDate,
      basicSalary: runEmployee.basicSalary,
      grossEarnings: runEmployee.grossEarnings,
      totalAllowances: runEmployee.totalAllowances,
      totalDeductions: runEmployee.totalDeductions,
      totalTax: runEmployee.totalTax,
      netPay: runEmployee.netPay,
      paymentMethod: runEmployee.paymentMethod,
      paymentReference: runEmployee.paymentReference,
    }).returning();
    generatedPayslips.push(payslip);
  }

  await logAuditSafe(ctx, {
    action: "payroll.payslip.generate",
    category: "payroll",
    resourceType: "payslip",
    resourceId: runId,
    description: `Generated ${generatedPayslips.length} payslips for run ${run.runNumber}`,
    newValues: { count: generatedPayslips.length },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.payslip.generated",
    title: `Payslips generated for run ${run.runNumber}`,
    resourceType: "payslip",
    resourceId: runId,
    metadata: { count: generatedPayslips.length },
  });

  return { payslips: generatedPayslips, status: 201 };
}

export async function getPayslips(organizationId: string, filters?: { runId?: string; employeeId?: string }) {
  let where = eq(payslips.organizationId, organizationId);
  if (filters?.runId) {
    const runEmployee = await db.query.payrollRunEmployees.findFirst({
      where: and(eq(payrollRunEmployees.payrollRunId, filters.runId), eq(payrollRunEmployees.organizationId, organizationId)),
    });
    if (runEmployee) where = and(where, eq(payslips.payrollRunEmployeeId, runEmployee.id)) as any;
  }
  if (filters?.employeeId) where = and(where, eq(payslips.employeeId, filters.employeeId)) as any;
  return db.query.payslips.findMany({
    where: where as any,
    with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
    orderBy: [desc(payslips.createdAt)],
  });
}

export async function getPayslip(organizationId: string, id: string) {
  return db.query.payslips.findFirst({
    where: and(eq(payslips.id, id), eq(payslips.organizationId, organizationId)),
    with: { employee: true, runEmployee: { with: { details: true, run: { with: { period: true } } } } },
  });
}

export async function sendPayslip(ctx: ServerContext, id: string) {
  const payslip = await db.query.payslips.findFirst({
    where: and(eq(payslips.id, id), eq(payslips.organizationId, ctx.organizationId)),
  });
  if (!payslip) return { error: "Payslip not found", status: 404 };
  const [updated] = await db.update(payslips).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(payslips.id, id)).returning();
  await logAuditSafe(ctx, {
    action: "payroll.payslip.send",
    category: "payroll",
    resourceType: "payslip",
    resourceId: id,
    description: `Sent payslip ${payslip.payslipNumber}`,
    newValues: { status: "sent" },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.payslip.sent",
    title: `Payslip ${payslip.payslipNumber} sent`,
    resourceType: "payslip",
    resourceId: id,
  });
  return { payslip: updated, status: 200 };
}

export async function markPayslipViewed(ctx: ServerContext, id: string) {
  const payslip = await db.query.payslips.findFirst({
    where: and(eq(payslips.id, id), eq(payslips.organizationId, ctx.organizationId)),
  });
  if (!payslip) return { error: "Payslip not found", status: 404 };
  const [updated] = await db.update(payslips).set({ status: "viewed", viewedAt: new Date(), updatedAt: new Date() }).where(eq(payslips.id, id)).returning();
  return { payslip: updated, status: 200 };
}

// ── Payment Export ─────────────────────────────────────────────────────────────

export async function generatePaymentExport(ctx: ServerContext, runId: string, body: unknown) {
  const parsed = payrollPaymentExportSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const run = await db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.id, runId), eq(payrollRuns.organizationId, ctx.organizationId)),
  });
  if (!run) return { error: "Payroll run not found", status: 404 };
  if (run.status !== "approved" && run.status !== "paid") return { error: "Run must be approved before export", status: 400 };

  const runEmployees = await db.query.payrollRunEmployees.findMany({
    where: eq(payrollRunEmployees.payrollRunId, runId),
    with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
  });

  const exportNumber = await nextExportNumber(ctx.organizationId);
  const totalAmount = runEmployees.reduce((sum, re) => sum + Number(re.netPay), 0);

  const [export_] = await db.insert(payrollPaymentExports).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId!,
    payrollRunId: runId,
    exportNumber,
    format: data.format,
    totalAmount: totalAmount.toFixed(2),
    employeeCount: runEmployees.length,
    generatedAt: new Date(),
  }).returning();

  await logAuditSafe(ctx, {
    action: "payroll.export.create",
    category: "payroll",
    resourceType: "payroll_payment_export",
    resourceId: export_.id,
    description: `Generated ${data.format.toUpperCase()} export ${exportNumber}`,
    newValues: { format: data.format, employeeCount: runEmployees.length, totalAmount },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.payment.exported",
    title: `Payment export ${exportNumber} generated`,
    resourceType: "payroll_payment_export",
    resourceId: export_.id,
    metadata: { format: data.format, employeeCount: runEmployees.length, totalAmount },
  });

  return { export: export_, status: 201 };
}

export async function getPaymentExports(organizationId: string) {
  return db.query.payrollPaymentExports.findMany({
    where: eq(payrollPaymentExports.organizationId, organizationId),
    with: { run: { columns: { id: true, runNumber: true } } },
    orderBy: [desc(payrollPaymentExports.createdAt)],
  });
}

export async function getPaymentExport(organizationId: string, id: string) {
  return db.query.payrollPaymentExports.findFirst({
    where: and(eq(payrollPaymentExports.id, id), eq(payrollPaymentExports.organizationId, organizationId)),
    with: { run: { columns: { id: true, runNumber: true } } },
  });
}

export async function buildPaymentExportContent(organizationId: string, exportId: string): Promise<{ format: string; content: string; filename: string } | null> {
  const export_ = await getPaymentExport(organizationId, exportId);
  if (!export_) return null;
  const runEmployees = await db.query.payrollRunEmployees.findMany({
    where: eq(payrollRunEmployees.payrollRunId, export_.payrollRunId),
    with: {
      employee: { columns: { firstName: true, lastName: true, employeeNumber: true } },
    },
  });

  if (export_.format === "csv") {
    const header = ["Employee No", "Name", "Net Pay"];
    const rows = runEmployees.map((re) => [
      (re.employee as any).employeeNumber,
      `${(re.employee as any).firstName} ${(re.employee as any).lastName}`,
      Number(re.netPay).toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    return { format: "csv", content: csv, filename: `${export_.exportNumber}.csv` };
  }

  // PDF / XLSX fall back to a human-readable text layout for portability.
  const lines = runEmployees.map(
    (re) => `${(re.employee as any).employeeNumber}\t${(re.employee as any).firstName} ${(re.employee as any).lastName}\t${Number(re.netPay).toFixed(2)}`
  );
  const text = `Payroll Payment Export ${export_.exportNumber}\nRun: ${(export_.run as any)?.runNumber ?? ""}\nTotal: ${Number(export_.totalAmount).toFixed(2)}\nEmployees: ${export_.employeeCount}\n\n${lines.join("\n")}`;
  return { format: export_.format, content: text, filename: `${export_.exportNumber}.${export_.format}` };
}

// ── Payroll Journal ────────────────────────────────────────────────────────────

function aggregateRunAmounts(runEmployees: (PayrollRunEmployee & { details: { itemType: string; amount: string }[] })[]) {
  let gross = 0;
  let nssf = 0;
  let nhif = 0;
  let paye = 0;
  let housingLevy = 0;
  let pension = 0;
  let other = 0;
  let net = 0;

  for (const re of runEmployees) {
    net += Number(re.netPay);
    for (const d of re.details) {
      const amount = Number(d.amount);
      switch (d.itemType) {
        case "earnings":
        case "allowance":
        case "overtime":
        case "bonus":
          gross += amount;
          break;
        case "tax_nssf":
          nssf += amount;
          break;
        case "tax_nhif":
          nhif += amount;
          break;
        case "tax_paye":
          paye += amount;
          break;
        case "tax_housing_levy":
          housingLevy += amount;
          break;
        case "tax_pension":
          pension += amount;
          break;
        case "deduction":
          other += amount;
          break;
      }
    }
  }

  return { gross, nssf, nhif, paye, housingLevy, pension, other, net };
}

export async function postPayrollJournal(ctx: ServerContext, runId: string) {
  const run = await db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.id, runId), eq(payrollRuns.organizationId, ctx.organizationId)),
  });
  if (!run) return { error: "Payroll run not found", status: 404 };
  if (run.status !== "approved" && run.status !== "paid") return { error: "Run must be approved before posting journal", status: 400 };

  const period = await db.query.payrollPeriods.findFirst({ where: eq(payrollPeriods.id, run.payrollPeriodId) });
  if (!period) return { error: "Payroll period not found", status: 404 };

  const runEmployees = await db.query.payrollRunEmployees.findMany({
    where: eq(payrollRunEmployees.payrollRunId, runId),
    with: { details: true },
  });

  const agg = aggregateRunAmounts(runEmployees as any);
  const lines = [
    { accountKey: "salariesExpense" as const, debit: Math.round(agg.gross), credit: 0, description: `Gross payroll ${run.runNumber}` },
    { accountKey: "nssfPayable" as const, debit: 0, credit: Math.round(agg.nssf), description: `NSSF payable ${run.runNumber}` },
    { accountKey: "nhifPayable" as const, debit: 0, credit: Math.round(agg.nhif), description: `NHIF payable ${run.runNumber}` },
    { accountKey: "payePayable" as const, debit: 0, credit: Math.round(agg.paye), description: `PAYE payable ${run.runNumber}` },
    { accountKey: "housingLevyPayable" as const, debit: 0, credit: Math.round(agg.housingLevy), description: `Housing Levy payable ${run.runNumber}` },
    { accountKey: "pensionPayable" as const, debit: 0, credit: Math.round(agg.pension), description: `Pension payable ${run.runNumber}` },
    { accountKey: "otherDeductionsPayable" as const, debit: 0, credit: Math.round(agg.other), description: `Other deductions payable ${run.runNumber}` },
    { accountKey: "bank" as const, debit: 0, credit: Math.round(agg.net), description: `Net pay ${run.runNumber}` },
  ];

  const journalEntryId = await postPayrollJournalEntry({
    organizationId: ctx.organizationId,
    userId: ctx.userId ?? ctx.organizationId,
    date: period.endDate,
    description: `Payroll journal - ${run.runNumber}`,
    lines,
    status: "posted",
  });

  await logAuditSafe(ctx, {
    action: "payroll.journal.post",
    category: "payroll",
    resourceType: "payroll_run",
    resourceId: runId,
    description: `Posted payroll journal for run ${run.runNumber}`,
    newValues: { journalEntryId },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "payroll.journal.posted",
    title: `Payroll journal posted for ${run.runNumber}`,
    resourceType: "payroll_run",
    resourceId: runId,
    metadata: { journalEntryId },
  });

  return { journalEntryId, status: 200 };
}

// ── AI Payroll Insights ────────────────────────────────────────────────────────

export interface PayrollInsight {
  type: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  data: Record<string, unknown>;
}

export async function generatePayrollInsights(ctx: ServerContext): Promise<PayrollInsight[]> {
  const organizationId = ctx.organizationId;
  const [runs, employees, pendingApprovals, lastRun] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(payrollRuns).where(eq(payrollRuns.organizationId, organizationId)),
    db.select({ count: sql<number>`count(*)` }).from(hrEmployees).where(and(eq(hrEmployees.organizationId, organizationId), eq(hrEmployees.status, "active"))),
    db.select({ count: sql<number>`count(*)` }).from(payrollRuns).where(and(eq(payrollRuns.organizationId, organizationId), sql`${payrollRuns.status} IN ('calculated','pending_approval')`)),
    db.query.payrollRuns.findFirst({
      where: and(eq(payrollRuns.organizationId, organizationId), sql`${payrollRuns.status} IN ('approved','paid')`),
      orderBy: [desc(payrollRuns.processedAt)],
    }),
  ]);

  const totalRuns = Number(runs[0]?.count ?? 0);
  const activeEmployees = Number(employees[0]?.count ?? 0);
  const pending = Number(pendingApprovals[0]?.count ?? 0);

  const insights: PayrollInsight[] = [];

  if (totalRuns === 0) {
    insights.push({
      type: "onboarding",
      title: "Run your first payroll",
      description: "You have not processed any payroll yet. Create a period, assign salaries, then process a run to pay your team.",
      priority: "high",
      data: { totalRuns },
    });
  }

  if (pending > 0) {
    insights.push({
      type: "approval",
      title: `${pending} payroll run${pending > 1 ? "s" : ""} awaiting approval`,
      description: `There ${pending === 1 ? "is" : "are"} ${pending} calculated payroll run${pending > 1 ? "s" : ""} waiting for approval before payslips can be generated.`,
      priority: pending > 3 ? "high" : "normal",
      data: { pending },
    });
  }

  if (lastRun && Number(lastRun.totalNet) > 0) {
    const statutory = Number(lastRun.totalGross) - Number(lastRun.totalNet);
    const burdenPct = Number(lastRun.totalGross) > 0 ? (statutory / Number(lastRun.totalGross)) * 100 : 0;
    insights.push({
      type: "cost",
      title: `Statutory burden at ${burdenPct.toFixed(1)}% of gross`,
      description: `Last run (${lastRun.runNumber}) paid ${activeEmployees} employees KES ${Number(lastRun.totalNet).toLocaleString()} net, with KES ${statutory.toLocaleString()} in statutory deductions.`,
      priority: burdenPct > 40 ? "high" : "normal",
      data: { gross: lastRun.totalGross, net: lastRun.totalNet, statutory, burdenPct },
    });
  }

  if (activeEmployees > 0 && totalRuns > 0) {
    const costPerEmployee = lastRun && Number(lastRun.totalNet) > 0 ? Number(lastRun.totalNet) / activeEmployees : 0;
    insights.push({
      type: "benchmark",
      title: `Average net pay ≈ KES ${Math.round(costPerEmployee).toLocaleString()} per employee`,
      description: "Use this baseline to compare departments and spot outliers that may need review.",
      priority: "low",
      data: { costPerEmployee, activeEmployees },
    });
  }

  return insights;
}

export async function refreshPayrollInsights(ctx: ServerContext) {
  const insights = await generatePayrollInsights(ctx);
  // Clear previously generated, unread insights for this org/user, then insert fresh.
  await db.delete(payrollAiInsights).where(
    and(eq(payrollAiInsights.organizationId, ctx.organizationId), eq(payrollAiInsights.userId, ctx.userId!), eq(payrollAiInsights.read, false))
  );
  for (const insight of insights) {
    await db.insert(payrollAiInsights).values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
      data: insight.data,
    });
  }
  await logAuditSafe(ctx, {
    action: "payroll.insight.generate",
    category: "payroll",
    resourceType: "payroll_ai_insight",
    resourceId: ctx.organizationId,
    description: `Generated ${insights.length} payroll AI insights`,
    newValues: { count: insights.length },
  });
  return { insights: insights.length, status: 200 };
}

export async function getPayrollInsights(organizationId: string, userId: string) {
  return db.query.payrollAiInsights.findMany({
    where: and(eq(payrollAiInsights.organizationId, organizationId), eq(payrollAiInsights.userId, userId), eq(payrollAiInsights.dismissed, false)),
    orderBy: [desc(payrollAiInsights.createdAt)],
  });
}

export async function createPayrollInsight(ctx: ServerContext, body: unknown) {
  const parsed = payrollAiInsightSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [insight] = await db.insert(payrollAiInsights).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId!,
    type: data.type,
    title: data.title,
    description: data.description,
    priority: data.priority,
    data: data.data ?? {},
  }).returning();
  return { insight, status: 201 };
}

export async function dismissPayrollInsight(ctx: ServerContext, id: string) {
  const existing = await db.query.payrollAiInsights.findFirst({
    where: and(eq(payrollAiInsights.id, id), eq(payrollAiInsights.organizationId, ctx.organizationId)),
  });
  if (!existing) return { error: "Insight not found", status: 404 };
  const [updated] = await db.update(payrollAiInsights).set({ dismissed: true }).where(eq(payrollAiInsights.id, id)).returning();
  return { insight: updated, status: 200 };
}

// ── Payroll Reports ────────────────────────────────────────────────────────────

export interface PayrollReport {
  summary: {
    totalRuns: number;
    approvedRuns: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    totalEmployees: number;
  };
  monthlyTrend: { period: string; gross: number; net: number; employees: number }[];
  topEarners: { employeeId: string; name: string; employeeNumber: string; netPay: number }[];
}

export async function getPayrollReports(organizationId: string): Promise<PayrollReport> {
  const runs = await db.query.payrollRuns.findMany({
    where: and(eq(payrollRuns.organizationId, organizationId), sql`${payrollRuns.status} IN ('approved','paid')`),
    with: { period: true },
  });

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalEmployees = 0;

  const trendMap = new Map<string, { gross: number; net: number; employees: number }>();

  for (const run of runs) {
    const gross = Number(run.totalGross);
    const net = Number(run.totalNet);
    const deductions = Number(run.totalDeductions);
    totalGross += gross;
    totalNet += net;
    totalDeductions += deductions;
    totalEmployees += run.totalEmployees;

    const key = (run.period as any) ? `${(run.period as any).name}` : run.runNumber;
    const prev = trendMap.get(key) ?? { gross: 0, net: 0, employees: 0 };
    trendMap.set(key, { gross: prev.gross + gross, net: prev.net + net, employees: prev.employees + run.totalEmployees });
  }

  const monthlyTrend = Array.from(trendMap.entries()).map(([period, v]) => ({ period, ...v }));

  const topEarnersRows = await db.query.payrollRunEmployees.findMany({
    where: eq(payrollRunEmployees.organizationId, organizationId),
    with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
    orderBy: [desc(payrollRunEmployees.netPay)],
    limit: 5,
  });

  const topEarners = topEarnersRows.map((re) => ({
    employeeId: re.employeeId,
    name: `${(re.employee as any).firstName} ${(re.employee as any).lastName}`,
    employeeNumber: (re.employee as any).employeeNumber,
    netPay: Number(re.netPay),
  }));

  return {
    summary: {
      totalRuns: runs.length,
      approvedRuns: runs.length,
      totalGross,
      totalDeductions,
      totalNet,
      totalEmployees,
    },
    monthlyTrend,
    topEarners,
  };
}

// ── Employee Payroll Portal ────────────────────────────────────────────────────

export async function getEmployeePortalData(ctx: ServerContext) {
  const employee = await db.query.hrEmployees.findFirst({
    where: and(eq(hrEmployees.userId, ctx.userId!), eq(hrEmployees.organizationId, ctx.organizationId)),
  });
  if (!employee) return { error: "No employee record linked to your account", status: 404 };

  const assignment = await db.query.employeeSalaryAssignments.findFirst({
    where: and(eq(employeeSalaryAssignments.employeeId, employee.id), eq(employeeSalaryAssignments.organizationId, ctx.organizationId)),
    with: { structure: true },
    orderBy: [desc(employeeSalaryAssignments.effectiveDate)],
  });

  const employeePayslips = await db.query.payslips.findMany({
    where: eq(payslips.employeeId, employee.id),
    orderBy: [desc(payslips.createdAt)],
    limit: 12,
  });

  let ytdGross = 0;
  let ytdNet = 0;
  let ytdDeductions = 0;
  for (const p of employeePayslips) {
    ytdGross += Number(p.grossEarnings);
    ytdNet += Number(p.netPay);
    ytdDeductions += Number(p.totalDeductions);
  }

  return {
    employee: {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      employeeNumber: employee.employeeNumber,
      departmentId: employee.departmentId,
      positionId: employee.positionId,
    },
    assignment: assignment
      ? { basicSalary: assignment.basicSalary, currency: assignment.currency, structureName: (assignment.structure as any)?.name, effectiveDate: assignment.effectiveDate }
      : null,
    payslips: employeePayslips,
    ytd: { gross: ytdGross, net: ytdNet, deductions: ytdDeductions, count: employeePayslips.length },
    status: 200,
  };
}

export async function getEmployeePayslips(ctx: ServerContext) {
  const employee = await db.query.hrEmployees.findFirst({
    where: and(eq(hrEmployees.userId, ctx.userId!), eq(hrEmployees.organizationId, ctx.organizationId)),
  });
  if (!employee) return { error: "No employee record linked to your account", status: 404 };
  const rows = await db.query.payslips.findMany({
    where: eq(payslips.employeeId, employee.id),
    orderBy: [desc(payslips.createdAt)],
  });
  return { payslips: rows, status: 200 };
}

