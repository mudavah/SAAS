-- ─────────────────────────────────────────────────────────────────────────────
-- Epic 5 — Human Resource Management (HR)
-- Adds enums, tables, indexes, and foreign keys for the HR module.
-- ─────────────────────────────────────────────────────────────────────────────

-- HR Enums
CREATE TYPE "public"."employee_status" AS ENUM ('active','on_leave','suspended','terminated','resigned');
CREATE TYPE "public"."employment_type" AS ENUM ('permanent','contract','part_time','intern','casual');
CREATE TYPE "public"."contract_type" AS ENUM ('permanent','fixed_term','probation','internship');
CREATE TYPE "public"."leave_type" AS ENUM ('annual','sick','maternity','paternity','compassionate','unpaid','study');
CREATE TYPE "public"."leave_status" AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE "public"."attendance_status" AS ENUM ('present','absent','late','half_day','on_leave');
CREATE TYPE "public"."shift_status" AS ENUM ('scheduled','active','completed','cancelled');
CREATE TYPE "public"."applicant_status" AS ENUM ('applied','screening','interview','offer','hired','rejected');
CREATE TYPE "public"."onboarding_task_status" AS ENUM ('pending','in_progress','completed','skipped');
CREATE TYPE "public"."offboarding_type" AS ENUM ('resignation','termination','retirement','contract_end');
CREATE TYPE "public"."performance_review_status" AS ENUM ('draft','in_progress','completed','cancelled');
CREATE TYPE "public"."training_status" AS ENUM ('scheduled','in_progress','completed','cancelled');
CREATE TYPE "public"."document_type" AS ENUM ('id','passport','kra_pin','nssf','nhif','contract','certificate','resume','other');
CREATE TYPE "public"."org_chart_node_type" AS ENUM ('department','position','employee');
CREATE TYPE "public"."ai_hr_insight_type" AS ENUM ('turnover_risk','leave_pattern','training_gap','attendance_anomaly','performance_trend','headcount_forecast');

--> statement-breakpoint

-- Departments
CREATE TABLE "hr_departments" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "parent_department_id" text REFERENCES hr_departments(id) ON DELETE SET NULL,
  "manager_id" text REFERENCES hr_employees(id) ON DELETE SET NULL,
  "cost_center" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_departments_org_idx" ON "hr_departments" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_departments_user_idx" ON "hr_departments" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_departments_parent_idx" ON "hr_departments" ("parent_department_id");

--> statement-breakpoint

-- Positions
CREATE TABLE "hr_positions" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "department_id" text NOT NULL REFERENCES hr_departments(id) ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "employment_type" "public"."employment_type" NOT NULL,
  "contract_type" "public"."contract_type",
  "salary_min" numeric(12,2),
  "salary_max" numeric(12,2),
  "currency" text DEFAULT 'KES' NOT NULL,
  "reports_to_position_id" text REFERENCES hr_positions(id) ON DELETE SET NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_positions_org_idx" ON "hr_positions" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_positions_user_idx" ON "hr_positions" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_positions_dept_idx" ON "hr_positions" ("department_id");

--> statement-breakpoint

-- Employees
CREATE TABLE "hr_employees" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_number" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "address" text,
  "city" text,
  "country" text DEFAULT 'Kenya',
  "date_of_birth" timestamp,
  "gender" text,
  "marital_status" text,
  "emergency_contact_name" text,
  "emergency_contact_phone" text,
  "department_id" text REFERENCES hr_departments(id) ON DELETE SET NULL,
  "position_id" text REFERENCES hr_positions(id) ON DELETE SET NULL,
  "manager_id" text REFERENCES hr_employees(id) ON DELETE SET NULL,
  "employment_type" "public"."employment_type" NOT NULL,
  "status" "public"."employee_status" DEFAULT 'active' NOT NULL,
  "hire_date" timestamp NOT NULL,
  "termination_date" timestamp,
  "probation_end_date" timestamp,
  "contract_end_date" timestamp,
  "salary" numeric(12,2),
  "currency" text DEFAULT 'KES' NOT NULL,
  "avatar" text,
  "tags" jsonb DEFAULT '[]' NOT NULL,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employees_org_idx" ON "hr_employees" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_employees_user_idx" ON "hr_employees" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_employee_number" ON "hr_employees" ("organization_id", "employee_number");
--> statement-breakpoint
CREATE INDEX "hr_employees_dept_idx" ON "hr_employees" ("department_id");
--> statement-breakpoint
CREATE INDEX "hr_employees_position_idx" ON "hr_employees" ("position_id");
--> statement-breakpoint
CREATE INDEX "hr_employees_status_idx" ON "hr_employees" ("status");

--> statement-breakpoint

-- Employment Contracts
CREATE TABLE "hr_employment_contracts" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "contract_number" text NOT NULL,
  "contract_type" "public"."contract_type" NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp,
  "salary" numeric(12,2) NOT NULL,
  "currency" text DEFAULT 'KES' NOT NULL,
  "benefits" jsonb DEFAULT '{}' NOT NULL,
  "terms" text,
  "status" text DEFAULT 'active' NOT NULL,
  "signed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_contracts_org_idx" ON "hr_employment_contracts" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_contracts_user_idx" ON "hr_employment_contracts" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_contracts_employee_idx" ON "hr_employment_contracts" ("employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_contract_number" ON "hr_employment_contracts" ("organization_id", "contract_number");

--> statement-breakpoint

-- Attendance Records
CREATE TABLE "hr_attendance_records" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "status" "public"."attendance_status" NOT NULL,
  "clock_in" timestamp,
  "clock_out" timestamp,
  "break_minutes" integer DEFAULT 0,
  "overtime_minutes" integer DEFAULT 0,
  "notes" text,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_attendance_org_idx" ON "hr_attendance_records" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_attendance_user_idx" ON "hr_attendance_records" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_attendance_employee_idx" ON "hr_attendance_records" ("employee_id");
--> statement-breakpoint
CREATE INDEX "hr_attendance_date_idx" ON "hr_attendance_records" ("date");
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_hr_attendance_employee_date" ON "hr_attendance_records" ("employee_id", "date");

--> statement-breakpoint

-- Leave Requests
CREATE TABLE "hr_leave_requests" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "leave_type" "public"."leave_type" NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "days" numeric(5,2) NOT NULL,
  "reason" text,
  "status" "public"."leave_status" DEFAULT 'pending' NOT NULL,
  "approved_by" text REFERENCES users(id) ON DELETE SET NULL,
  "approved_at" timestamp,
  "rejection_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_leave_org_idx" ON "hr_leave_requests" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_leave_user_idx" ON "hr_leave_requests" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_leave_employee_idx" ON "hr_leave_requests" ("employee_id");
--> statement-breakpoint
CREATE INDEX "hr_leave_status_idx" ON "hr_leave_requests" ("status");

--> statement-breakpoint

-- Leave Balances
CREATE TABLE "hr_leave_balances" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "leave_type" "public"."leave_type" NOT NULL,
  "year" integer NOT NULL,
  "total_days" numeric(5,2) NOT NULL,
  "used_days" numeric(5,2) DEFAULT '0' NOT NULL,
  "carried_days" numeric(5,2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_leave_balances_org_idx" ON "hr_leave_balances" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_leave_balances_user_idx" ON "hr_leave_balances" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_leave_balances_employee_idx" ON "hr_leave_balances" ("employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_hr_leave_balance" ON "hr_leave_balances" ("employee_id", "leave_type", "year");

--> statement-breakpoint

-- Shifts
CREATE TABLE "hr_shifts" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "name" text NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "break_minutes" integer DEFAULT 0,
  "color" text DEFAULT '#16a34a',
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_shifts_org_idx" ON "hr_shifts" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_shifts_user_idx" ON "hr_shifts" ("user_id");

--> statement-breakpoint

-- Shift Assignments
CREATE TABLE "hr_shift_assignments" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "shift_id" text NOT NULL REFERENCES hr_shifts(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "status" "public"."shift_status" DEFAULT 'scheduled' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_org_idx" ON "hr_shift_assignments" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_user_idx" ON "hr_shift_assignments" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_shift_idx" ON "hr_shift_assignments" ("shift_id");
--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_employee_idx" ON "hr_shift_assignments" ("employee_id");
--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_date_idx" ON "hr_shift_assignments" ("date");
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_hr_shift_assignment" ON "hr_shift_assignments" ("employee_id", "date");

--> statement-breakpoint

-- Applicants
CREATE TABLE "hr_applicants" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "position_id" text REFERENCES hr_positions(id) ON DELETE SET NULL,
  "department_id" text REFERENCES hr_departments(id) ON DELETE SET NULL,
  "status" "public"."applicant_status" DEFAULT 'applied' NOT NULL,
  "resume_url" text,
  "cover_letter" text,
  "expected_salary" numeric(12,2),
  "availability_date" timestamp,
  "source" text,
  "tags" jsonb DEFAULT '[]' NOT NULL,
  "notes" text,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_applicants_org_idx" ON "hr_applicants" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_applicants_user_idx" ON "hr_applicants" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_applicants_position_idx" ON "hr_applicants" ("position_id");
--> statement-breakpoint
CREATE INDEX "hr_applicants_status_idx" ON "hr_applicants" ("status");

--> statement-breakpoint

-- Applicant Documents
CREATE TABLE "hr_applicant_documents" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "applicant_id" text NOT NULL REFERENCES hr_applicants(id) ON DELETE CASCADE,
  "document_type" "public"."document_type" NOT NULL,
  "file_name" text NOT NULL,
  "file_url" text NOT NULL,
  "file_size" integer,
  "mime_type" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_applicant_docs_org_idx" ON "hr_applicant_documents" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_applicant_docs_applicant_idx" ON "hr_applicant_documents" ("applicant_id");

--> statement-breakpoint

-- Onboarding Checklists
CREATE TABLE "hr_onboarding_checklists" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "task" text NOT NULL,
  "description" text,
  "due_date" timestamp,
  "status" "public"."onboarding_task_status" DEFAULT 'pending' NOT NULL,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_onboarding_org_idx" ON "hr_onboarding_checklists" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_onboarding_user_idx" ON "hr_onboarding_checklists" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_onboarding_employee_idx" ON "hr_onboarding_checklists" ("employee_id");

--> statement-breakpoint

-- Offboarding Records
CREATE TABLE "hr_offboarding_records" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "offboarding_type" "public"."offboarding_type" NOT NULL,
  "last_working_date" timestamp NOT NULL,
  "reason" text,
  "notice_period_days" integer,
  "return_equipment" jsonb DEFAULT '{}' NOT NULL,
  "exit_interview_notes" text,
  "clearance_completed" boolean DEFAULT false NOT NULL,
  "cleared_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_offboarding_org_idx" ON "hr_offboarding_records" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_offboarding_user_idx" ON "hr_offboarding_records" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_offboarding_employee_idx" ON "hr_offboarding_records" ("employee_id");

--> statement-breakpoint

-- Performance Reviews
CREATE TABLE "hr_performance_reviews" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "reviewer_id" text REFERENCES users(id) ON DELETE SET NULL,
  "review_period_start" timestamp NOT NULL,
  "review_period_end" timestamp NOT NULL,
  "overall_rating" numeric(3,1),
  "status" "public"."performance_review_status" DEFAULT 'draft' NOT NULL,
  "strengths" text,
  "areas_for_improvement" text,
  "goals" jsonb DEFAULT '[]' NOT NULL,
  "comments" text,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_reviews_org_idx" ON "hr_performance_reviews" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_reviews_user_idx" ON "hr_performance_reviews" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_reviews_employee_idx" ON "hr_performance_reviews" ("employee_id");
--> statement-breakpoint
CREATE INDEX "hr_reviews_reviewer_idx" ON "hr_performance_reviews" ("reviewer_id");
--> statement-breakpoint
CREATE INDEX "hr_reviews_status_idx" ON "hr_performance_reviews" ("status");

--> statement-breakpoint

-- Trainings
CREATE TABLE "hr_trainings" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "trainer" text,
  "location" text,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "capacity" integer,
  "cost" numeric(12,2) DEFAULT '0' NOT NULL,
  "currency" text DEFAULT 'KES' NOT NULL,
  "status" "public"."training_status" DEFAULT 'scheduled' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_trainings_org_idx" ON "hr_trainings" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_trainings_user_idx" ON "hr_trainings" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_trainings_status_idx" ON "hr_trainings" ("status");

--> statement-breakpoint

-- Training Enrollments
CREATE TABLE "hr_training_enrollments" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "training_id" text NOT NULL REFERENCES hr_trainings(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "status" "public"."training_status" DEFAULT 'scheduled' NOT NULL,
  "score" numeric(5,2),
  "feedback" text,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_training_enrollments_org_idx" ON "hr_training_enrollments" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_training_enrollments_user_idx" ON "hr_training_enrollments" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_training_enrollments_training_idx" ON "hr_training_enrollments" ("training_id");
--> statement-breakpoint
CREATE INDEX "hr_training_enrollments_employee_idx" ON "hr_training_enrollments" ("employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_hr_training_enrollment" ON "hr_training_enrollments" ("training_id", "employee_id");

--> statement-breakpoint

-- Employee Documents
CREATE TABLE "hr_employee_documents" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "employee_id" text NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  "document_type" "public"."document_type" NOT NULL,
  "file_name" text NOT NULL,
  "file_url" text NOT NULL,
  "file_size" integer,
  "mime_type" text,
  "expires_at" timestamp,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employee_docs_org_idx" ON "hr_employee_documents" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_employee_docs_user_idx" ON "hr_employee_documents" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_employee_docs_employee_idx" ON "hr_employee_documents" ("employee_id");

--> statement-breakpoint

-- Organization Chart
CREATE TABLE "hr_organization_chart" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "node_type" "public"."org_chart_node_type" NOT NULL,
  "node_id" text NOT NULL,
  "parent_node_id" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_org_chart_org_idx" ON "hr_organization_chart" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_org_chart_user_idx" ON "hr_organization_chart" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_org_chart_node_idx" ON "hr_organization_chart" ("node_type", "node_id");
--> statement-breakpoint
CREATE INDEX "hr_org_chart_parent_idx" ON "hr_organization_chart" ("parent_node_id");

--> statement-breakpoint

-- HR AI Insights
CREATE TABLE "hr_ai_insights" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "type" "public"."ai_hr_insight_type" NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "data" jsonb DEFAULT '{}' NOT NULL,
  "read" boolean DEFAULT false NOT NULL,
  "dismissed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_ai_insights_org_idx" ON "hr_ai_insights" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_ai_insights_user_idx" ON "hr_ai_insights" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_ai_insights_type_idx" ON "hr_ai_insights" ("type");

--> statement-breakpoint

-- HR AI Reminders
CREATE TABLE "hr_ai_reminders" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "reminder_type" text NOT NULL,
  "due_date" timestamp NOT NULL,
  "related_resource_type" text,
  "related_resource_id" text,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "sent" boolean DEFAULT false NOT NULL,
  "sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_ai_reminders_org_idx" ON "hr_ai_reminders" ("organization_id");
--> statement-breakpoint
CREATE INDEX "hr_ai_reminders_user_idx" ON "hr_ai_reminders" ("user_id");
--> statement-breakpoint
CREATE INDEX "hr_ai_reminders_due_idx" ON "hr_ai_reminders" ("due_date");
