import { db } from "@/db";
import {
  hrDepartments,
  hrPositions,
  hrEmployees,
  hrEmploymentContracts,
  hrAttendanceRecords,
  hrLeaveRequests,
  hrLeaveBalances,
  hrShifts,
  hrShiftAssignments,
  hrApplicants,
  hrOnboardingChecklists,
  hrOffboardingRecords,
  hrPerformanceReviews,
  hrTrainings,
  hrTrainingEnrollments,
  hrEmployeeDocuments,
  hrOrganizationChart,
  hrAiInsights,
  hrAiReminders,
  type HrEmployee,
  type HrDepartment,
  type HrPosition,
  type HrLeaveRequest,
  type HrAttendanceRecord,
  type HrShift,
  type HrShiftAssignment,
  type HrApplicant,
  type HrPerformanceReview,
  type HrTraining,
  type HrTrainingEnrollment,
  type HrAiInsight,
  type HrAiReminder,
} from "@/db/schema";
import { and, desc, eq, gte, lte, sql, sum, count, inArray, asc } from "drizzle-orm";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import type { ServerContext } from "@/lib/session";
import {
  employeeSchema,
  departmentSchema,
  positionSchema,
  leaveRequestSchema,
  attendanceSchema,
  shiftSchema,
  shiftAssignmentSchema,
  applicantSchema,
  performanceReviewSchema,
  trainingSchema,
  trainingEnrollmentSchema,
  onboardingChecklistSchema,
  offboardingSchema,
  contractSchema,
  documentSchema,
  aiInsightSchema,
  aiReminderSchema,
  applicantStatusUpdateSchema,
} from "@/lib/validations";

async function nextNumber(table: any, organizationId: string, prefix: string): Promise<string> {
  const rows = await db.select({ c: sql<number>`count(*)` }).from(table).where(eq(table.organizationId, organizationId));
  const n = Number(rows[0]?.c || 0) + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

export async function createDepartment(ctx: ServerContext, body: unknown) {
  const parsed = departmentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [department] = await db.insert(hrDepartments).values({ organizationId: ctx.organizationId, userId: ctx.userId!, name: data.name, description: data.description ?? null, parentDepartmentId: data.parentDepartmentId ?? null, managerId: data.managerId ?? null, costCenter: data.costCenter ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.department.create", category: "hr", resourceType: "hr_department", resourceId: department.id, description: `Created department ${department.name}`, newValues: { name: department.name } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.department.created", title: `Department ${department.name} created`, resourceType: "hr_department", resourceId: department.id });
  return { department, status: 201 };
}

export async function updateDepartment(ctx: ServerContext, id: string, body: unknown) {
  const parsed = departmentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const existing = await db.query.hrDepartments.findFirst({ where: and(eq(hrDepartments.id, id), eq(hrDepartments.organizationId, ctx.organizationId)) });
  if (!existing) return { error: "Department not found", status: 404 };
  const [department] = await db.update(hrDepartments).set({ name: data.name, description: data.description ?? null, parentDepartmentId: data.parentDepartmentId ?? null, managerId: data.managerId ?? null, costCenter: data.costCenter ?? null, updatedAt: new Date() }).where(eq(hrDepartments.id, id)).returning();
  await logAuditSafe(ctx, { action: "hr.department.update", category: "hr", resourceType: "hr_department", resourceId: id, description: `Updated department ${department.name}`, oldValues: { name: existing.name }, newValues: { name: department.name } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.department.updated", title: `Department ${department.name} updated`, resourceType: "hr_department", resourceId: id });
  return { department, status: 200 };
}

export async function deleteDepartment(ctx: ServerContext, id: string) {
  const existing = await db.query.hrDepartments.findFirst({ where: and(eq(hrDepartments.id, id), eq(hrDepartments.organizationId, ctx.organizationId)) });
  if (!existing) return { error: "Department not found", status: 404 };
  await db.delete(hrDepartments).where(eq(hrDepartments.id, id));
  await logAuditSafe(ctx, { action: "hr.department.delete", category: "hr", resourceType: "hr_department", resourceId: id, description: `Deleted department ${existing.name}`, oldValues: { name: existing.name } });
  return { success: true, status: 200 };
}

export async function getDepartments(organizationId: string) {
  return db.query.hrDepartments.findMany({ where: eq(hrDepartments.organizationId, organizationId), with: { parent: { columns: { id: true, name: true } }, manager: { columns: { id: true, firstName: true, lastName: true } }, positions: { columns: { id: true, title: true } }, _count: { select: { employees: true, positions: true } } }, orderBy: [desc(hrDepartments.createdAt)] });
}

export async function createPosition(ctx: ServerContext, body: unknown) {
  const parsed = positionSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [position] = await db.insert(hrPositions).values({ organizationId: ctx.organizationId, userId: ctx.userId!, departmentId: data.departmentId, title: data.title, description: data.description ?? null, employmentType: data.employmentType, contractType: data.contractType ?? null, salaryMin: data.salaryMin?.toString() ?? null, salaryMax: data.salaryMax?.toString() ?? null, currency: data.currency ?? "KES", reportsToPositionId: data.reportsToPositionId ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.position.create", category: "hr", resourceType: "hr_position", resourceId: position.id, description: `Created position ${position.title}`, newValues: { title: position.title } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.position.created", title: `Position ${position.title} created`, resourceType: "hr_position", resourceId: position.id });
  return { position, status: 201 };
}

export async function getPositions(organizationId: string) {
  return db.query.hrPositions.findMany({ where: eq(hrPositions.organizationId, organizationId), with: { department: { columns: { id: true, name: true } }, _count: { select: { employees: true, applicants: true } } }, orderBy: [desc(hrPositions.createdAt)] });
}

export async function createEmployee(ctx: ServerContext, body: unknown) {
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const employeeNumber = await nextNumber(hrEmployees, ctx.organizationId, "EMP");
  const [employee] = await db.insert(hrEmployees).values({ organizationId: ctx.organizationId, userId: ctx.userId!, employeeNumber, firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone ?? null, address: data.address ?? null, city: data.city ?? null, country: data.country ?? "Kenya", dateOfBirth: data.dateOfBirth ?? null, gender: data.gender ?? null, maritalStatus: data.maritalStatus ?? null, emergencyContactName: data.emergencyContactName ?? null, emergencyContactPhone: data.emergencyContactPhone ?? null, departmentId: data.departmentId ?? null, positionId: data.positionId ?? null, managerId: data.managerId ?? null, employmentType: data.employmentType, status: data.status, hireDate: data.hireDate, terminationDate: data.terminationDate ?? null, probationEndDate: data.probationEndDate ?? null, contractEndDate: data.contractEndDate ?? null, salary: data.salary?.toString() ?? null, currency: data.currency ?? "KES" }).returning();
  await logAuditSafe(ctx, { action: "hr.employee.create", category: "hr", resourceType: "hr_employee", resourceId: employee.id, description: `Created employee ${employee.firstName} ${employee.lastName}`, newValues: { employeeNumber: employee.employeeNumber, name: `${employee.firstName} ${employee.lastName}` } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.employee.created", title: `Employee ${employee.employeeNumber} created`, resourceType: "hr_employee", resourceId: employee.id });
  return { employee, status: 201 };
}

export async function updateEmployee(ctx: ServerContext, id: string, body: unknown) {
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const existing = await db.query.hrEmployees.findFirst({ where: and(eq(hrEmployees.id, id), eq(hrEmployees.organizationId, ctx.organizationId)) });
  if (!existing) return { error: "Employee not found", status: 404 };
  const [employee] = await db.update(hrEmployees).set({ firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone ?? null, address: data.address ?? null, city: data.city ?? null, country: data.country ?? "Kenya", dateOfBirth: data.dateOfBirth ?? null, gender: data.gender ?? null, maritalStatus: data.maritalStatus ?? null, emergencyContactName: data.emergencyContactName ?? null, emergencyContactPhone: data.emergencyContactPhone ?? null, departmentId: data.departmentId ?? null, positionId: data.positionId ?? null, managerId: data.managerId ?? null, employmentType: data.employmentType, status: data.status, hireDate: data.hireDate, terminationDate: data.terminationDate ?? null, probationEndDate: data.probationEndDate ?? null, contractEndDate: data.contractEndDate ?? null, salary: data.salary?.toString() ?? null, currency: data.currency ?? "KES", updatedAt: new Date() }).where(eq(hrEmployees.id, id)).returning();
  await logAuditSafe(ctx, { action: "hr.employee.update", category: "hr", resourceType: "hr_employee", resourceId: id, description: `Updated employee ${employee.firstName} ${employee.lastName}`, oldValues: { name: `${existing.firstName} ${existing.lastName}`, status: existing.status }, newValues: { name: `${employee.firstName} ${employee.lastName}`, status: employee.status } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.employee.updated", title: `Employee ${employee.employeeNumber} updated`, resourceType: "hr_employee", resourceId: id });
  return { employee, status: 200 };
}

export async function getEmployees(organizationId: string) {
  return db.query.hrEmployees.findMany({ where: eq(hrEmployees.organizationId, organizationId), with: { department: { columns: { id: true, name: true } }, position: { columns: { id: true, title: true } }, manager: { columns: { id: true, firstName: true, lastName: true } } }, orderBy: [desc(hrEmployees.createdAt)] });
}

export async function getEmployee(organizationId: string, id: string) {
  return db.query.hrEmployees.findFirst({ where: and(eq(hrEmployees.id, id), eq(hrEmployees.organizationId, organizationId)), with: { department: true, position: true, manager: { columns: { id: true, firstName: true, lastName: true } }, contracts: true, attendanceRecords: { orderBy: [desc(hrAttendanceRecords.date)], limit: 10 }, leaveRequests: { orderBy: [desc(hrLeaveRequests.createdAt)], limit: 10 }, leaveBalances: true, shiftAssignments: { orderBy: [desc(hrShiftAssignments.date)], limit: 10 }, performanceReviews: { orderBy: [desc(hrPerformanceReviews.createdAt)], limit: 10 }, trainingEnrollments: { with: { training: true }, orderBy: [desc(hrTrainingEnrollments.createdAt)], limit: 10 }, documents: true, onboardingChecklists: true, offboardingRecords: { orderBy: [desc(hrOffboardingRecords.createdAt)], limit: 1 }, directReports: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } } });
}

export async function terminateEmployee(ctx: ServerContext, id: string, reason?: string) {
  const existing = await db.query.hrEmployees.findFirst({ where: and(eq(hrEmployees.id, id), eq(hrEmployees.organizationId, ctx.organizationId)) });
  if (!existing) return { error: "Employee not found", status: 404 };
  const [employee] = await db.update(hrEmployees).set({ status: "terminated", terminationDate: new Date(), updatedAt: new Date() }).where(eq(hrEmployees.id, id)).returning();
  await logAuditSafe(ctx, { action: "hr.employee.terminate", category: "hr", resourceType: "hr_employee", resourceId: id, description: `Terminated employee ${employee.firstName} ${employee.lastName}`, oldValues: { status: existing.status }, newValues: { status: "terminated" } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.employee.terminated", title: `Employee ${employee.employeeNumber} terminated`, resourceType: "hr_employee", resourceId: id });
  return { employee, status: 200 };
}

export async function createContract(ctx: ServerContext, body: unknown) {
  const parsed = contractSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const contractNumber = await nextNumber(hrEmploymentContracts, ctx.organizationId, "CON");
  const [contract] = await db.insert(hrEmploymentContracts).values({ organizationId: ctx.organizationId, userId: ctx.userId!, employeeId: data.employeeId, contractNumber, contractType: data.contractType, startDate: data.startDate, endDate: data.endDate ?? null, salary: data.salary.toString(), currency: data.currency ?? "KES", benefits: data.benefits ?? {}, terms: data.terms ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.contract.create", category: "hr", resourceType: "hr_employment_contract", resourceId: contract.id, description: `Created contract ${contract.contractNumber}`, newValues: { contractNumber: contract.contractNumber } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.contract.created", title: `Contract ${contract.contractNumber} created`, resourceType: "hr_employment_contract", resourceId: contract.id });
  return { contract, status: 201 };
}

export async function getContracts(organizationId: string, employeeId?: string) {
  const where = employeeId ? and(eq(hrEmploymentContracts.organizationId, organizationId), eq(hrEmploymentContracts.employeeId, employeeId)) : eq(hrEmploymentContracts.organizationId, organizationId);
  return db.query.hrEmploymentContracts.findMany({ where: where as any, with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } }, orderBy: [desc(hrEmploymentContracts.createdAt)] });
}

export async function recordAttendance(ctx: ServerContext, body: unknown) {
  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const date = new Date(data.date); date.setHours(0, 0, 0, 0);
  const [record] = await db.insert(hrAttendanceRecords).values({ organizationId: ctx.organizationId, userId: ctx.userId!, employeeId: data.employeeId, date, status: data.status, clockIn: data.clockIn ?? null, clockOut: data.clockOut ?? null, breakMinutes: data.breakMinutes, overtimeMinutes: data.overtimeMinutes, notes: data.notes ?? null }).onConflictDoUpdate({ target: [hrAttendanceRecords.employeeId, hrAttendanceRecords.date], set: { status: data.status, clockIn: data.clockIn ?? null, clockOut: data.clockOut ?? null, breakMinutes: data.breakMinutes, overtimeMinutes: data.overtimeMinutes, notes: data.notes ?? null } }).returning();
  await logAuditSafe(ctx, { action: "hr.attendance.record", category: "hr", resourceType: "hr_attendance_record", resourceId: record.id, description: `Recorded attendance for employee ${data.employeeId}`, newValues: { status: data.status, date: date.toISOString() } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.attendance.recorded", title: `Attendance recorded`, resourceType: "hr_attendance_record", resourceId: record.id });
  return { record, status: 201 };
}

export async function getAttendanceRecords(organizationId: string, employeeId?: string, startDate?: Date, endDate?: Date) {
  let where = eq(hrAttendanceRecords.organizationId, organizationId);
  if (employeeId) where = and(where, eq(hrAttendanceRecords.employeeId, employeeId)) as any;
  if (startDate) where = and(where, gte(hrAttendanceRecords.date, startDate)) as any;
  if (endDate) where = and(where, lte(hrAttendanceRecords.date, endDate)) as any;
  return db.query.hrAttendanceRecords.findMany({ where: where as any, with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } }, orderBy: [desc(hrAttendanceRecords.date)] });
}

export async function requestLeave(ctx: ServerContext, body: unknown) {
  const parsed = leaveRequestSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [leaveRequest] = await db.insert(hrLeaveRequests).values({ organizationId: ctx.organizationId, userId: ctx.userId!, employeeId: data.employeeId, leaveType: data.leaveType, startDate: data.startDate, endDate: data.endDate, days: data.days.toString(), reason: data.reason ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.leave.request", category: "hr", resourceType: "hr_leave_request", resourceId: leaveRequest.id, description: `Leave request created for employee ${data.employeeId}`, newValues: { leaveType: data.leaveType, days: data.days } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.leave.requested", title: `Leave request submitted`, resourceType: "hr_leave_request", resourceId: leaveRequest.id });
  return { leaveRequest, status: 201 };
}

export async function approveLeave(ctx: ServerContext, id: string) {
  const existing = await db.query.hrLeaveRequests.findFirst({ where: and(eq(hrLeaveRequests.id, id), eq(hrLeaveRequests.organizationId, ctx.organizationId)) });
  if (!existing) return { error: "Leave request not found", status: 404 };
  const [leaveRequest] = await db.update(hrLeaveRequests).set({ status: "approved", approvedBy: ctx.userId, approvedAt: new Date(), updatedAt: new Date() }).where(eq(hrLeaveRequests.id, id)).returning();
  await logAuditSafe(ctx, { action: "hr.leave.approve", category: "hr", resourceType: "hr_leave_request", resourceId: id, description: `Approved leave request ${id}`, oldValues: { status: existing.status }, newValues: { status: "approved" } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.leave.approved", title: `Leave request approved`, resourceType: "hr_leave_request", resourceId: id });
  return { leaveRequest, status: 200 };
}

export async function rejectLeave(ctx: ServerContext, id: string, reason: string) {
  const existing = await db.query.hrLeaveRequests.findFirst({ where: and(eq(hrLeaveRequests.id, id), eq(hrLeaveRequests.organizationId, ctx.organizationId)) });
  if (!existing) return { error: "Leave request not found", status: 404 };
  const [leaveRequest] = await db.update(hrLeaveRequests).set({ status: "rejected", approvedBy: ctx.userId, approvedAt: new Date(), rejectionReason: reason, updatedAt: new Date() }).where(eq(hrLeaveRequests.id, id)).returning();
  await logAuditSafe(ctx, { action: "hr.leave.reject", category: "hr", resourceType: "hr_leave_request", resourceId: id, description: `Rejected leave request ${id}`, oldValues: { status: existing.status }, newValues: { status: "rejected", reason } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.leave.rejected", title: `Leave request rejected`, resourceType: "hr_leave_request", resourceId: id });
  return { leaveRequest, status: 200 };
}

export async function getLeaveRequests(organizationId: string, employeeId?: string, status?: string) {
  let where = eq(hrLeaveRequests.organizationId, organizationId);
  if (employeeId) where = and(where, eq(hrLeaveRequests.employeeId, employeeId)) as any;
  if (status) where = and(where, eq(hrLeaveRequests.status, status as any)) as any;
  return db.query.hrLeaveRequests.findMany({ where: where as any, with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } }, orderBy: [desc(hrLeaveRequests.createdAt)] });
}

export async function createShift(ctx: ServerContext, body: unknown) {
  const parsed = shiftSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [shift] = await db.insert(hrShifts).values({ organizationId: ctx.organizationId, userId: ctx.userId!, name: data.name, startTime: data.startTime, endTime: data.endTime, breakMinutes: data.breakMinutes, color: data.color }).returning();
  await logAuditSafe(ctx, { action: "hr.shift.create", category: "hr", resourceType: "hr_shift", resourceId: shift.id, description: `Created shift ${shift.name}`, newValues: { name: shift.name } });
  return { shift, status: 201 };
}

export async function getShifts(organizationId: string) {
  return db.query.hrShifts.findMany({ where: eq(hrShifts.organizationId, organizationId), orderBy: [desc(hrShifts.createdAt)] });
}

export async function assignShift(ctx: ServerContext, body: unknown) {
  const parsed = shiftAssignmentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const date = new Date(data.date); date.setHours(0, 0, 0, 0);
  const [assignment] = await db.insert(hrShiftAssignments).values({ organizationId: ctx.organizationId, userId: ctx.userId!, shiftId: data.shiftId, employeeId: data.employeeId, date, status: data.status }).onConflictDoUpdate({ target: [hrShiftAssignments.employeeId, hrShiftAssignments.date], set: { shiftId: data.shiftId, status: data.status } }).returning();
  await logAuditSafe(ctx, { action: "hr.shift.assign", category: "hr", resourceType: "hr_shift_assignment", resourceId: assignment.id, description: `Assigned shift to employee ${data.employeeId}`, newValues: { shiftId: data.shiftId, date: date.toISOString() } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.shift.assigned", title: `Shift assigned`, resourceType: "hr_shift_assignment", resourceId: assignment.id });
  return { assignment, status: 201 };
}

export async function getShiftAssignments(organizationId: string, employeeId?: string, startDate?: Date, endDate?: Date) {
  let where = eq(hrShiftAssignments.organizationId, organizationId);
  if (employeeId) where = and(where, eq(hrShiftAssignments.employeeId, employeeId)) as any;
  if (startDate) where = and(where, gte(hrShiftAssignments.date, startDate)) as any;
  if (endDate) where = and(where, lte(hrShiftAssignments.date, endDate)) as any;
  return db.query.hrShiftAssignments.findMany({ where: where as any, with: { shift: true, employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } }, orderBy: [desc(hrShiftAssignments.date)] });
}

export async function createApplicant(ctx: ServerContext, body: unknown) {
  const parsed = applicantSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [applicant] = await db.insert(hrApplicants).values({ organizationId: ctx.organizationId, userId: ctx.userId!, firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone ?? null, positionId: data.positionId ?? null, departmentId: data.departmentId ?? null, resumeUrl: data.resumeUrl ?? null, coverLetter: data.coverLetter ?? null, expectedSalary: data.expectedSalary?.toString() ?? null, availabilityDate: data.availabilityDate ?? null, source: data.source ?? null, notes: data.notes ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.applicant.create", category: "hr", resourceType: "hr_applicant", resourceId: applicant.id, description: `Created applicant ${applicant.firstName} ${applicant.lastName}`, newValues: { name: `${applicant.firstName} ${applicant.lastName}` } });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.applicant.created", title: `Applicant ${applicant.firstName} ${applicant.lastName} added`, resourceType: "hr_applicant", resourceId: applicant.id });
  return { applicant, status: 201 };
}

export async function updateApplicantStatus(ctx: ServerContext, id: string, body: unknown) {
  const parsed = applicantStatusUpdateSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const existing = await db.query.hrApplicants.findFirst({ where: and(eq(hrApplicants.id, id), eq(hrApplicants.organizationId, ctx.organizationId)) });
  if (!existing) return { error: "Applicant not found", status: 404 };
  const [applicant] = await db.update(hrApplicants).set({ status: data.status, updatedAt: new Date() }).where(eq(hrApplicants.id, id)).returning();
  const eventType = data.status === "hired" ? "hr.applicant.hired" : data.status === "rejected" ? "hr.applicant.rejected" : null;
  if (eventType) await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: eventType as any, title: `Applicant ${applicant.firstName} ${applicant.lastName} ${data.status}`, resourceType: "hr_applicant", resourceId: applicant.id });
  await logAuditSafe(ctx, { action: `hr.applicant.${data.status}`, category: "hr", resourceType: "hr_applicant", resourceId: id, description: `Updated applicant status to ${data.status}`, oldValues: { status: existing.status }, newValues: { status: data.status } });
  return { applicant, status: 200 };
}

export async function getApplicants(organizationId: string) {
  return db.query.hrApplicants.findMany({ where: eq(hrApplicants.organizationId, organizationId), with: { position: { columns: { id: true, title: true } }, department: { columns: { id: true, name: true } } }, orderBy: [desc(hrApplicants.createdAt)] });
}

export async function createOnboardingChecklist(ctx: ServerContext, body: unknown) {
  const parsed = onboardingChecklistSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [checklist] = await db.insert(hrOnboardingChecklists).values({ organizationId: ctx.organizationId, userId: ctx.userId!, employeeId: data.employeeId, task: data.task, description: data.description ?? null, dueDate: data.dueDate ?? null, status: data.status }).returning();
  await logAuditSafe(ctx, { action: "hr.onboarding.create", category: "hr", resourceType: "hr_onboarding_checklist", resourceId: checklist.id, description: `Created onboarding task: ${data.task}` });
  return { checklist, status: 201 };
}

export async function getOnboardingChecklists(organizationId: string, employeeId?: string) {
  const where = employeeId ? and(eq(hrOnboardingChecklists.organizationId, organizationId), eq(hrOnboardingChecklists.employeeId, employeeId)) : eq(hrOnboardingChecklists.organizationId, organizationId);
  return db.query.hrOnboardingChecklists.findMany({ where: where as any, orderBy: [desc(hrOnboardingChecklists.createdAt)] });
}

export async function createOffboardingRecord(ctx: ServerContext, body: unknown) {
  const parsed = offboardingSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [record] = await db.insert(hrOffboardingRecords).values({ organizationId: ctx.organizationId, userId: ctx.userId!, employeeId: data.employeeId, offboardingType: data.offboardingType, lastWorkingDate: data.lastWorkingDate, reason: data.reason ?? null, noticePeriodDays: data.noticePeriodDays ?? null, returnEquipment: data.returnEquipment ?? {}, exitInterviewNotes: data.exitInterviewNotes ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.offboarding.create", category: "hr", resourceType: "hr_offboarding_record", resourceId: record.id, description: `Created offboarding record for employee ${data.employeeId}`, newValues: { offboardingType: data.offboardingType } });
  return { record, status: 201 };
}

export async function getOffboardingRecords(organizationId: string) {
  return db.query.hrOffboardingRecords.findMany({ where: eq(hrOffboardingRecords.organizationId, organizationId), with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } }, orderBy: [desc(hrOffboardingRecords.createdAt)] });
}

export async function createPerformanceReview(ctx: ServerContext, body: unknown) {
  const parsed = performanceReviewSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [review] = await db.insert(hrPerformanceReviews).values({ organizationId: ctx.organizationId, userId: ctx.userId!, employeeId: data.employeeId, reviewerId: data.reviewerId ?? null, reviewPeriodStart: data.reviewPeriodStart, reviewPeriodEnd: data.reviewPeriodEnd, overallRating: data.overallRating?.toString() ?? null, strengths: data.strengths ?? null, areasForImprovement: data.areasForImprovement ?? null, goals: data.goals ?? [], comments: data.comments ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.performance.create", category: "hr", resourceType: "hr_performance_review", resourceId: review.id, description: `Created performance review for employee ${data.employeeId}` });
  await emitTimelineEvent({ userId: ctx.userId, organizationId: ctx.organizationId, eventType: "hr.performance.review.completed", title: `Performance review created`, resourceType: "hr_performance_review", resourceId: review.id });
  return { review, status: 201 };
}

export async function getPerformanceReviews(organizationId: string, employeeId?: string) {
  const where = employeeId ? and(eq(hrPerformanceReviews.organizationId, organizationId), eq(hrPerformanceReviews.employeeId, employeeId)) : eq(hrPerformanceReviews.organizationId, organizationId);
  return db.query.hrPerformanceReviews.findMany({ where: where as any, with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } }, reviewer: { columns: { id: true, name: true } } }, orderBy: [desc(hrPerformanceReviews.createdAt)] });
}

export async function createTraining(ctx: ServerContext, body: unknown) {
  const parsed = trainingSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [training] = await db.insert(hrTrainings).values({ organizationId: ctx.organizationId, userId: ctx.userId!, title: data.title, description: data.description ?? null, trainer: data.trainer ?? null, location: data.location ?? null, startDate: data.startDate, endDate: data.endDate, capacity: data.capacity ?? null, cost: data.cost.toString(), currency: data.currency ?? "KES" }).returning();
  await logAuditSafe(ctx, { action: "hr.training.create", category: "hr", resourceType: "hr_training", resourceId: training.id, description: `Created training ${training.title}`, newValues: { title: training.title } });
  return { training, status: 201 };
}

export async function getTrainings(organizationId: string) {
  return db.query.hrTrainings.findMany({ where: eq(hrTrainings.organizationId, organizationId), orderBy: [desc(hrTrainings.createdAt)] });
}

export async function enrollEmployeeInTraining(ctx: ServerContext, body: unknown) {
  const parsed = trainingEnrollmentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [enrollment] = await db.insert(hrTrainingEnrollments).values({ organizationId: ctx.organizationId, userId: ctx.userId!, trainingId: data.trainingId, employeeId: data.employeeId }).onConflictDoUpdate({ target: [hrTrainingEnrollments.trainingId, hrTrainingEnrollments.employeeId], set: { status: "scheduled" } }).returning();
  await logAuditSafe(ctx, { action: "hr.training.enroll", category: "hr", resourceType: "hr_training_enrollment", resourceId: enrollment.id, description: `Enrolled employee ${data.employeeId} in training ${data.trainingId}` });
  return { enrollment, status: 201 };
}

export async function getTrainingEnrollments(organizationId: string, trainingId?: string) {
  const where = trainingId ? and(eq(hrTrainingEnrollments.organizationId, organizationId), eq(hrTrainingEnrollments.trainingId, trainingId)) : eq(hrTrainingEnrollments.organizationId, organizationId);
  return db.query.hrTrainingEnrollments.findMany({ where: where as any, with: { training: true, employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } } }, orderBy: [desc(hrTrainingEnrollments.createdAt)] });
}

export async function uploadEmployeeDocument(ctx: ServerContext, body: unknown) {
  const parsed = documentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [document] = await db.insert(hrEmployeeDocuments).values({ organizationId: ctx.organizationId, userId: ctx.userId!, employeeId: data.employeeId, documentType: data.documentType, fileName: data.fileName, fileUrl: data.fileUrl, fileSize: data.fileSize ?? null, mimeType: data.mimeType ?? null, expiresAt: data.expiresAt ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.document.upload", category: "hr", resourceType: "hr_employee_document", resourceId: document.id, description: `Uploaded document ${data.fileName} for employee ${data.employeeId}`, newValues: { fileName: data.fileName, documentType: data.documentType } });
  return { document, status: 201 };
}

export async function getEmployeeDocuments(organizationId: string, employeeId?: string) {
  const where = employeeId ? and(eq(hrEmployeeDocuments.organizationId, organizationId), eq(hrEmployeeDocuments.employeeId, employeeId)) : eq(hrEmployeeDocuments.organizationId, organizationId);
  return db.query.hrEmployeeDocuments.findMany({ where: where as any, orderBy: [desc(hrEmployeeDocuments.createdAt)] });
}

export async function getOrganizationChart(organizationId: string) {
  return db.query.hrOrganizationChart.findMany({ where: eq(hrOrganizationChart.organizationId, organizationId), orderBy: [hrOrganizationChart.sortOrder] });
}

export async function createAiInsight(ctx: ServerContext, body: unknown) {
  const parsed = aiInsightSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [insight] = await db.insert(hrAiInsights).values({ organizationId: ctx.organizationId, userId: ctx.userId!, type: data.type, title: data.title, description: data.description, priority: data.priority, data: data.data ?? {} }).returning();
  await logAuditSafe(ctx, { action: "hr.ai.insight.create", category: "hr", resourceType: "hr_ai_insight", resourceId: insight.id, description: `Created HR AI insight: ${data.title}` });
  return { insight, status: 201 };
}

export async function getAiInsights(organizationId: string) {
  return db.query.hrAiInsights.findMany({ where: eq(hrAiInsights.organizationId, organizationId), orderBy: [desc(hrAiInsights.createdAt)] });
}

export async function createAiReminder(ctx: ServerContext, body: unknown) {
  const parsed = aiReminderSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;
  const [reminder] = await db.insert(hrAiReminders).values({ organizationId: ctx.organizationId, userId: ctx.userId!, title: data.title, message: data.message, reminderType: data.reminderType, dueDate: data.dueDate, relatedResourceType: data.relatedResourceType ?? null, relatedResourceId: data.relatedResourceId ?? null }).returning();
  await logAuditSafe(ctx, { action: "hr.ai.reminder.create", category: "hr", resourceType: "hr_ai_reminder", resourceId: reminder.id, description: `Created HR AI reminder: ${data.title}` });
  return { reminder, status: 201 };
}

export async function getAiReminders(organizationId: string) {
  return db.query.hrAiReminders.findMany({ where: eq(hrAiReminders.organizationId, organizationId), orderBy: [asc(hrAiReminders.dueDate)] });
}
