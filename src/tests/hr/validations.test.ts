import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  departmentSchema,
  positionSchema,
  employeeSchema,
  contractSchema,
  attendanceSchema,
  leaveRequestSchema,
  shiftSchema,
  shiftAssignmentSchema,
  applicantSchema,
  performanceReviewSchema,
  trainingSchema,
  trainingEnrollmentSchema,
  onboardingChecklistSchema,
  offboardingSchema,
  documentSchema,
  aiInsightSchema,
  aiReminderSchema,
} from "@/lib/validations";

describe("HR Validation Schemas", () => {
  describe("departmentSchema", () => {
    it("should accept valid department data", () => {
      const result = departmentSchema.safeParse({
        name: "Engineering",
        description: "Software engineering department",
        costCenter: "CC-001",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = departmentSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("positionSchema", () => {
    it("should accept valid position data", () => {
      const result = positionSchema.safeParse({
        departmentId: "dept-1",
        title: "Software Engineer",
        employmentType: "permanent",
        salaryMin: 50000,
        salaryMax: 100000,
        currency: "KES",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid employment type", () => {
      const result = positionSchema.safeParse({
        departmentId: "dept-1",
        title: "Engineer",
        employmentType: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("employeeSchema", () => {
    it("should accept valid employee data", () => {
      const result = employeeSchema.safeParse({
        employeeNumber: "EMP-0001",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        employmentType: "permanent",
        status: "active",
        hireDate: new Date(),
        country: "Kenya",
        currency: "KES",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = employeeSchema.safeParse({
        employeeNumber: "EMP-0001",
        firstName: "John",
        lastName: "Doe",
        email: "invalid",
        employmentType: "permanent",
        status: "active",
        hireDate: new Date(),
        country: "Kenya",
        currency: "KES",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("leaveRequestSchema", () => {
    it("should accept valid leave request", () => {
      const result = leaveRequestSchema.safeParse({
        employeeId: "emp-1",
        leaveType: "annual",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        days: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative days", () => {
      const result = leaveRequestSchema.safeParse({
        employeeId: "emp-1",
        leaveType: "annual",
        startDate: new Date(),
        endDate: new Date(),
        days: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("attendanceSchema", () => {
    it("should accept valid attendance record", () => {
      const result = attendanceSchema.safeParse({
        employeeId: "emp-1",
        date: new Date(),
        status: "present",
        breakMinutes: 30,
        overtimeMinutes: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("applicantSchema", () => {
    it("should accept valid applicant data", () => {
      const result = applicantSchema.safeParse({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "+254712345678",
        expectedSalary: 50000,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = applicantSchema.safeParse({
        firstName: "Jane",
        lastName: "Smith",
        email: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("trainingSchema", () => {
    it("should accept valid training data", () => {
      const result = trainingSchema.safeParse({
        title: "Leadership Workshop",
        description: "Management skills",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        cost: 10000,
        currency: "KES",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("offboardingSchema", () => {
    it("should accept valid offboarding data", () => {
      const result = offboardingSchema.safeParse({
        employeeId: "emp-1",
        offboardingType: "resignation",
        lastWorkingDate: new Date(),
        noticePeriodDays: 30,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid offboarding type", () => {
      const result = offboardingSchema.safeParse({
        employeeId: "emp-1",
        offboardingType: "invalid",
        lastWorkingDate: new Date(),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("documentSchema (file upload hardening)", () => {
    const baseValid = {
      employeeId: "emp-1",
      documentType: "contract",
      fileName: "contract.pdf",
      fileUrl: "https://storage.kaziflow.com/contract.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
    };

    it("should accept a valid document upload", () => {
      expect(documentSchema.safeParse(baseValid).success).toBe(true);
    });

    it("should accept blob: and data: urls", () => {
      expect(
        documentSchema.safeParse({ ...baseValid, fileUrl: "blob:abc" }).success
      ).toBe(true);
      expect(
        documentSchema.safeParse({ ...baseValid, fileUrl: "data:image/png;base64,AAA" })
          .success
      ).toBe(true);
    });

    it("should reject non-https / dangerous url schemes", () => {
      expect(
        documentSchema.safeParse({ ...baseValid, fileUrl: "javascript:alert(1)" })
          .success
      ).toBe(false);
      expect(
        documentSchema.safeParse({ ...baseValid, fileUrl: "http://insecure.test/x" })
          .success
      ).toBe(false);
    });

    it("should reject oversized files", () => {
      expect(
        documentSchema.safeParse({ ...baseValid, fileSize: 99 * 1024 * 1024 })
          .success
      ).toBe(false);
    });

    it("should reject disallowed mime types", () => {
      expect(
        documentSchema.safeParse({ ...baseValid, mimeType: "application/x-msdownload" })
          .success
      ).toBe(false);
    });

    it("should reject overly long file names", () => {
      expect(
        documentSchema.safeParse({ ...baseValid, fileName: "a".repeat(300) })
          .success
      ).toBe(false);
    });
  });
});
