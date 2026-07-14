CREATE TYPE "public"."ai_hr_insight_type" AS ENUM('turnover_risk', 'leave_pattern', 'training_gap', 'attendance_anomaly', 'performance_trend', 'headcount_forecast');--> statement-breakpoint
CREATE TYPE "public"."applicant_status" AS ENUM('applied', 'screening', 'interview', 'offer', 'hired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'half_day', 'on_leave');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('permanent', 'fixed_term', 'probation', 'internship');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('id', 'passport', 'kra_pin', 'nssf', 'nhif', 'contract', 'certificate', 'resume', 'other');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'on_leave', 'suspended', 'terminated', 'resigned');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('permanent', 'contract', 'part_time', 'intern', 'casual');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid', 'study');--> statement-breakpoint
CREATE TYPE "public"."offboarding_type" AS ENUM('resignation', 'termination', 'retirement', 'contract_end');--> statement-breakpoint
CREATE TYPE "public"."onboarding_task_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."org_chart_node_type" AS ENUM('department', 'position', 'employee');--> statement-breakpoint
CREATE TYPE "public"."performance_review_status" AS ENUM('draft', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shift_status" AS ENUM('scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "hr_ai_insights" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"type" "ai_hr_insight_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_ai_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"reminder_type" text NOT NULL,
	"due_date" timestamp NOT NULL,
	"related_resource_type" text,
	"related_resource_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_applicant_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"applicant_id" text NOT NULL,
	"document_type" "document_type" NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_applicants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"position_id" text,
	"department_id" text,
	"status" "applicant_status" DEFAULT 'applied' NOT NULL,
	"resume_url" text,
	"cover_letter" text,
	"expected_salary" numeric(12, 2),
	"availability_date" timestamp,
	"source" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"status" "attendance_status" NOT NULL,
	"clock_in" timestamp,
	"clock_out" timestamp,
	"break_minutes" integer DEFAULT 0,
	"overtime_minutes" integer DEFAULT 0,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_departments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_department_id" text,
	"manager_id" text,
	"cost_center" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employee_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"document_type" "document_type" NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employees" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
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
	"department_id" text,
	"position_id" text,
	"manager_id" text,
	"employment_type" "employment_type" NOT NULL,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"hire_date" timestamp NOT NULL,
	"termination_date" timestamp,
	"probation_end_date" timestamp,
	"contract_end_date" timestamp,
	"salary" numeric(12, 2),
	"currency" text DEFAULT 'KES' NOT NULL,
	"avatar" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employment_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"contract_number" text NOT NULL,
	"contract_type" "contract_type" NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"salary" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"benefits" jsonb DEFAULT '{}'::jsonb,
	"terms" text,
	"status" text DEFAULT 'active' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_leave_balances" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"year" integer NOT NULL,
	"total_days" numeric(5, 2) NOT NULL,
	"used_days" numeric(5, 2) DEFAULT '0' NOT NULL,
	"carried_days" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"days" numeric(5, 2) NOT NULL,
	"reason" text,
	"status" "leave_status" DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_offboarding_records" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"offboarding_type" "offboarding_type" NOT NULL,
	"last_working_date" timestamp NOT NULL,
	"reason" text,
	"notice_period_days" integer,
	"return_equipment" jsonb DEFAULT '{}'::jsonb,
	"exit_interview_notes" text,
	"clearance_completed" boolean DEFAULT false NOT NULL,
	"cleared_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_onboarding_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"task" text NOT NULL,
	"description" text,
	"due_date" timestamp,
	"status" "onboarding_task_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_organization_chart" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"node_type" "org_chart_node_type" NOT NULL,
	"node_id" text NOT NULL,
	"parent_node_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_performance_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"reviewer_id" text,
	"review_period_start" timestamp NOT NULL,
	"review_period_end" timestamp NOT NULL,
	"overall_rating" numeric(3, 1),
	"status" "performance_review_status" DEFAULT 'draft' NOT NULL,
	"strengths" text,
	"areas_for_improvement" text,
	"goals" jsonb DEFAULT '[]'::jsonb,
	"comments" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_positions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"department_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"employment_type" "employment_type" NOT NULL,
	"contract_type" "contract_type",
	"salary_min" numeric(12, 2),
	"salary_max" numeric(12, 2),
	"currency" text DEFAULT 'KES' NOT NULL,
	"reports_to_position_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_shift_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"status" "shift_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
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
CREATE TABLE "hr_training_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"training_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"status" "training_status" DEFAULT 'scheduled' NOT NULL,
	"score" numeric(5, 2),
	"feedback" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_trainings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"trainer" text,
	"location" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"capacity" integer,
	"cost" numeric(12, 2) DEFAULT '0',
	"currency" text DEFAULT 'KES' NOT NULL,
	"status" "training_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hr_ai_insights" ADD CONSTRAINT "hr_ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_ai_insights" ADD CONSTRAINT "hr_ai_insights_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_ai_reminders" ADD CONSTRAINT "hr_ai_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_ai_reminders" ADD CONSTRAINT "hr_ai_reminders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_applicant_documents" ADD CONSTRAINT "hr_applicant_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_applicant_documents" ADD CONSTRAINT "hr_applicant_documents_applicant_id_hr_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."hr_applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_applicants" ADD CONSTRAINT "hr_applicants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_applicants" ADD CONSTRAINT "hr_applicants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_applicants" ADD CONSTRAINT "hr_applicants_position_id_hr_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_applicants" ADD CONSTRAINT "hr_applicants_department_id_hr_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_parent_department_id_hr_departments_id_fk" FOREIGN KEY ("parent_department_id") REFERENCES "public"."hr_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_manager_id_hr_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."hr_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "hr_employee_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "hr_employee_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "hr_employee_documents_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_department_id_hr_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_position_id_hr_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_manager_id_hr_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."hr_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contracts" ADD CONSTRAINT "hr_employment_contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contracts" ADD CONSTRAINT "hr_employment_contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contracts" ADD CONSTRAINT "hr_employment_contracts_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_records" ADD CONSTRAINT "hr_offboarding_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_records" ADD CONSTRAINT "hr_offboarding_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_records" ADD CONSTRAINT "hr_offboarding_records_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_checklists" ADD CONSTRAINT "hr_onboarding_checklists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_checklists" ADD CONSTRAINT "hr_onboarding_checklists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_checklists" ADD CONSTRAINT "hr_onboarding_checklists_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_organization_chart" ADD CONSTRAINT "hr_organization_chart_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_organization_chart" ADD CONSTRAINT "hr_organization_chart_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_positions" ADD CONSTRAINT "hr_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_positions" ADD CONSTRAINT "hr_positions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_positions" ADD CONSTRAINT "hr_positions_department_id_hr_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_positions" ADD CONSTRAINT "hr_positions_reports_to_position_id_hr_positions_id_fk" FOREIGN KEY ("reports_to_position_id") REFERENCES "public"."hr_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_assignments" ADD CONSTRAINT "hr_shift_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_assignments" ADD CONSTRAINT "hr_shift_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_assignments" ADD CONSTRAINT "hr_shift_assignments_shift_id_hr_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."hr_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_assignments" ADD CONSTRAINT "hr_shift_assignments_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shifts" ADD CONSTRAINT "hr_shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shifts" ADD CONSTRAINT "hr_shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_training_enrollments" ADD CONSTRAINT "hr_training_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_training_enrollments" ADD CONSTRAINT "hr_training_enrollments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_training_enrollments" ADD CONSTRAINT "hr_training_enrollments_training_id_hr_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."hr_trainings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_training_enrollments" ADD CONSTRAINT "hr_training_enrollments_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_trainings" ADD CONSTRAINT "hr_trainings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_trainings" ADD CONSTRAINT "hr_trainings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hr_ai_insights_org_idx" ON "hr_ai_insights" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_ai_insights_user_idx" ON "hr_ai_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_ai_insights_type_idx" ON "hr_ai_insights" USING btree ("type");--> statement-breakpoint
CREATE INDEX "hr_ai_reminders_org_idx" ON "hr_ai_reminders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_ai_reminders_user_idx" ON "hr_ai_reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_ai_reminders_due_idx" ON "hr_ai_reminders" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "hr_applicant_docs_org_idx" ON "hr_applicant_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_applicant_docs_applicant_idx" ON "hr_applicant_documents" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "hr_applicants_org_idx" ON "hr_applicants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_applicants_user_idx" ON "hr_applicants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_applicants_position_idx" ON "hr_applicants" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "hr_applicants_status_idx" ON "hr_applicants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_attendance_org_idx" ON "hr_attendance_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_attendance_user_idx" ON "hr_attendance_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_attendance_employee_idx" ON "hr_attendance_records" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hr_attendance_date_idx" ON "hr_attendance_records" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_hr_attendance_employee_date" ON "hr_attendance_records" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "hr_departments_org_idx" ON "hr_departments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_departments_user_idx" ON "hr_departments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_departments_parent_idx" ON "hr_departments" USING btree ("parent_department_id");--> statement-breakpoint
CREATE INDEX "hr_employee_docs_org_idx" ON "hr_employee_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_employee_docs_user_idx" ON "hr_employee_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_employee_docs_employee_idx" ON "hr_employee_documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hr_employees_org_idx" ON "hr_employees" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_employees_user_idx" ON "hr_employees" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_employee_number" ON "hr_employees" USING btree ("organization_id","employee_number");--> statement-breakpoint
CREATE INDEX "hr_employees_dept_idx" ON "hr_employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "hr_employees_position_idx" ON "hr_employees" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "hr_employees_status_idx" ON "hr_employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_contracts_org_idx" ON "hr_employment_contracts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_contracts_user_idx" ON "hr_employment_contracts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_contracts_employee_idx" ON "hr_employment_contracts" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_contract_number" ON "hr_employment_contracts" USING btree ("organization_id","contract_number");--> statement-breakpoint
CREATE INDEX "hr_leave_balances_org_idx" ON "hr_leave_balances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_leave_balances_user_idx" ON "hr_leave_balances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_leave_balances_employee_idx" ON "hr_leave_balances" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_hr_leave_balance" ON "hr_leave_balances" USING btree ("employee_id","leave_type","year");--> statement-breakpoint
CREATE INDEX "hr_leave_org_idx" ON "hr_leave_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_leave_user_idx" ON "hr_leave_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_leave_employee_idx" ON "hr_leave_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hr_leave_status_idx" ON "hr_leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_offboarding_org_idx" ON "hr_offboarding_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_user_idx" ON "hr_offboarding_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_employee_idx" ON "hr_offboarding_records" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_org_idx" ON "hr_onboarding_checklists" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_user_idx" ON "hr_onboarding_checklists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_employee_idx" ON "hr_onboarding_checklists" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hr_org_chart_org_idx" ON "hr_organization_chart" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_org_chart_user_idx" ON "hr_organization_chart" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_org_chart_node_idx" ON "hr_organization_chart" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "hr_org_chart_parent_idx" ON "hr_organization_chart" USING btree ("parent_node_id");--> statement-breakpoint
CREATE INDEX "hr_reviews_org_idx" ON "hr_performance_reviews" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_reviews_user_idx" ON "hr_performance_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_reviews_employee_idx" ON "hr_performance_reviews" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hr_reviews_reviewer_idx" ON "hr_performance_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "hr_reviews_status_idx" ON "hr_performance_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_positions_org_idx" ON "hr_positions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_positions_user_idx" ON "hr_positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_positions_dept_idx" ON "hr_positions" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_org_idx" ON "hr_shift_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_user_idx" ON "hr_shift_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_shift_idx" ON "hr_shift_assignments" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_employee_idx" ON "hr_shift_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hr_shift_assignments_date_idx" ON "hr_shift_assignments" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_hr_shift_assignment" ON "hr_shift_assignments" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "hr_shifts_org_idx" ON "hr_shifts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_shifts_user_idx" ON "hr_shifts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_training_enrollments_org_idx" ON "hr_training_enrollments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_training_enrollments_user_idx" ON "hr_training_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_training_enrollments_training_idx" ON "hr_training_enrollments" USING btree ("training_id");--> statement-breakpoint
CREATE INDEX "hr_training_enrollments_employee_idx" ON "hr_training_enrollments" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_hr_training_enrollment" ON "hr_training_enrollments" USING btree ("training_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_trainings_org_idx" ON "hr_trainings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hr_trainings_user_idx" ON "hr_trainings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_trainings_status_idx" ON "hr_trainings" USING btree ("status");