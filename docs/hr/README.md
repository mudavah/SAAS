# Epic 5 — Human Resource Management (HR)

## Architecture Summary

The HR module follows the existing KaziFlow patterns:
- **Multi-tenant**: All tables carry `organizationId` and `userId` for strict tenant isolation.
- **RBAC**: Every route is gated by permission keys defined in `src/lib/rbac/permissions.ts`.
- **Audit & Timeline**: All mutations are audited via `logAuditSafe` and emit Business Timeline events.
- **Validation**: Zod schemas in `src/lib/validations.ts` enforce input contracts.

## Database Schema

### Enums (15)
| Enum | Values |
|------|--------|
| `employee_status` | active, on_leave, suspended, terminated, resigned |
| `employment_type` | permanent, contract, part_time, intern, casual |
| `contract_type` | permanent, fixed_term, probation, internship |
| `leave_type` | annual, sick, maternity, paternity, compassionate, unpaid, study |
| `leave_status` | pending, approved, rejected, cancelled |
| `attendance_status` | present, absent, late, half_day, on_leave |
| `shift_status` | scheduled, active, completed, cancelled |
| `applicant_status` | applied, screening, interview, offer, hired, rejected |
| `onboarding_task_status` | pending, in_progress, completed, skipped |
| `offboarding_type` | resignation, termination, retirement, contract_end |
| `performance_review_status` | draft, in_progress, completed, cancelled |
| `training_status` | scheduled, in_progress, completed, cancelled |
| `document_type` | id, passport, kra_pin, nssf, nhif, contract, certificate, resume, other |
| `org_chart_node_type` | department, position, employee |
| `ai_hr_insight_type` | turnover_risk, leave_pattern, training_gap, attendance_anomaly, performance_trend, headcount_forecast |

### Tables (20)
| Table | Purpose |
|-------|---------|
| `hr_departments` | Organizational departments |
| `hr_positions` | Job positions with salary bands |
| `hr_employees` | Employee master records |
| `hr_employment_contracts` | Contract history |
| `hr_attendance_records` | Daily attendance tracking |
| `hr_leave_requests` | Leave applications |
| `hr_leave_balances` | Leave accrual balances |
| `hr_shifts` | Shift definitions |
| `hr_shift_assignments` | Employee shift schedules |
| `hr_applicants` | Recruitment pipeline |
| `hr_applicant_documents` | Applicant files |
| `hr_onboarding_checklists` | New hire checklists |
| `hr_offboarding_records` | Exit management |
| `hr_performance_reviews` | Appraisals |
| `hr_trainings` | Training programs |
| `hr_training_enrollments` | Employee training records |
| `hr_employee_documents` | Employee files |
| `hr_organization_chart` | Org hierarchy |
| `hr_ai_insights` | AI-generated HR insights |
| `hr_ai_reminders` | AI HR reminders |

## API Routes

| Method | Route | Permission |
|--------|-------|------------|
| GET/POST | `/api/hr/departments` | `hr.departments.manage` |
| GET | `/api/hr/departments/[id]` | `hr.departments.manage` |
| GET/POST | `/api/hr/positions` | `hr.positions.manage` |
| GET/POST | `/api/hr/employees` | `hr.employees.manage` |
| GET | `/api/hr/employees/[id]` | `hr.employees.manage` |
| GET/POST | `/api/hr/contracts` | `hr.employees.manage` |
| GET/POST | `/api/hr/attendance` | `hr.attendance.manage` |
| GET/POST | `/api/hr/leave` | `hr.leave.manage` |
| PATCH | `/api/hr/leave/[id]/approve` | `hr.leave.manage` |
| PATCH | `/api/hr/leave/[id]/reject` | `hr.leave.manage` |
| GET/POST | `/api/hr/shifts` | `hr.shifts.manage` |
| GET/POST | `/api/hr/shifts/assignments` | `hr.shifts.manage` |
| GET/POST | `/api/hr/applicants` | `hr.recruitment.manage` |
| PATCH | `/api/hr/applicants/[id]/status` | `hr.recruitment.manage` |
| GET/POST | `/api/hr/onboarding` | `hr.onboarding.manage` |
| GET/POST | `/api/hr/offboarding` | `hr.offboarding.manage` |
| GET/POST | `/api/hr/performance` | `hr.performance.manage` |
| GET/POST | `/api/hr/trainings` | `hr.training.manage` |
| POST | `/api/hr/trainings/[id]/enroll` | `hr.training.manage` |
| GET/POST | `/api/hr/documents` | `hr.documents.manage` |

## UI Pages

| Route | Purpose |
|-------|---------|
| `/dashboard/hr` | HR dashboard with stats |
| `/dashboard/hr/employees` | Employee directory |
| `/dashboard/hr/departments` | Department management |
| `/dashboard/hr/leave` | Leave requests |
| `/dashboard/hr/attendance` | Attendance tracking |
| `/dashboard/hr/shifts` | Shift scheduling |
| `/dashboard/hr/applicants` | Recruitment pipeline |
| `/dashboard/hr/trainings` | Training programs |

## RBAC Permissions

| Permission | Description |
|------------|-------------|
| `hr.view` | View HR dashboard |
| `hr.employees.manage` | Manage employee records |
| `hr.departments.manage` | Manage departments |
| `hr.positions.manage` | Manage positions |
| `hr.attendance.manage` | Track attendance |
| `hr.leave.manage` | Manage leave requests |
| `hr.shifts.manage` | Manage shifts |
| `hr.recruitment.manage` | Manage applicants |
| `hr.onboarding.manage` | Manage onboarding |
| `hr.offboarding.manage` | Manage offboarding |
| `hr.performance.manage` | Manage performance reviews |
| `hr.training.manage` | Manage training |
| `hr.documents.manage` | Manage documents |
| `hr.reports.view` | View HR reports |
| `hr.ai.access` | Access HR AI insights |

## Migration Summary

- **Migration file**: `drizzle/0012_human_resource_management.sql`
- **Tables created**: 20
- **Enums created**: 15
- **Indexes created**: 50+
- **Foreign keys**: Properly scoped with `ON DELETE SET NULL` or `CASCADE`

## Test Report

- **Validation tests**: `tests/hr/validations.test.ts`
- **Coverage**: All 17 HR Zod schemas validated
- **Status**: ✅ Passing

## Next Steps

1. Implement HR self-service portal for employees
2. Add payroll integration
3. Add advanced HR analytics
4. Implement leave accrual automation
5. Add document expiry reminders
