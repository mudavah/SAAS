import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupFieldsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
});

export const signupSchema = signupFieldsSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

/** API signup body (no confirmPassword) */
export const signupApiSchema = signupFieldsSchema.pick({
  name: true,
  email: true,
  password: true,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export const onboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.string().min(1, "Please select a business type"),
  phone: z.string().optional(),
  city: z.string().default("Nairobi"),
  currency: z.string().default("KES"),
});

export const clientSchema = z.object({
  name: z.string().min(2, "Client name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Price must be 0 or more"),
});

export const invoiceSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  currency: z.string().default("KES"),
  taxRate: z.coerce.number().min(0).max(100).default(16),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one item"),
});

export const invoiceUpdateSchema = invoiceSchema.partial().omit({ items: true });

export const expenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.coerce.date(),
  taxDeductible: z.boolean().default(false),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.coerce.date().optional(),
  projectId: z.string().optional(),
});

export const paymentSchema = z.object({
  invoiceId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["mpesa", "stripe", "cash", "bank_transfer", "other"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const mpesaStkSchema = z.object({
  phone: z
    .string()
    .regex(/^254\d{9}$/, "Phone must be in format 2547XXXXXXXX"),
  amount: z.coerce.number().positive().min(1),
  invoiceId: z.string().optional(),
});

export const aiRequestSchema = z.object({
  type: z.enum([
    "invoice_description",
    "email_followup",
    "social_post",
    "business_tip",
    "stock_shortage_prediction",
    "purchase_recommendation",
    "expense_anomaly",
    "revenue_forecast",
    "invoice_summary",
    "business_insights",
  ]),
  context: z.string().min(1, "Please provide some context"),
  tone: z.enum(["professional", "friendly", "formal"]).default("professional"),
});

export const inventoryCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  type: z.enum(["product", "service"]).default("product"),
});

export const inventoryBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().optional(),
});

export const inventorySupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const inventoryWarehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  location: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const inventoryProductSchema = z.object({
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0),
  unit: z.string().default("pcs"),
  minStockLevel: z.coerce.number().int().min(0).default(0),
  maxStockLevel: z.coerce.number().int().optional(),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const inventoryStockMovementSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  type: z.enum(["purchase", "sale", "adjustment", "transfer", "return", "damage"]),
  quantity: z.coerce.number(),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
  notes: z.string().optional(),
});

export const inventoryPurchaseOrderSchema = z.object({
  supplierId: z.string().optional(),
  status: z.enum(["draft", "ordered", "received", "cancelled"]).default("draft"),
  orderDate: z.coerce.date(),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.coerce.number().positive(),
    unitCost: z.coerce.number().min(0),
  })).min(1, "Add at least one item"),
});

export const inventoryStockAdjustmentSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.coerce.number(),
  reason: z.string().min(1, "Reason is required"),
});

export const chartOfAccountsSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const journalEntrySchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["draft", "posted", "reversed"]).default("draft"),
  lines: z.array(z.object({
    accountId: z.string(),
    debit: z.coerce.number().min(0).default(0),
    credit: z.coerce.number().min(0).default(0),
    description: z.string().optional(),
  })).min(2, "Add at least two lines").refine(
    (lines) => lines.length >= 2,
    "Journal entry must have at least two lines"
  ),
});

export const etimsConfigSchema = z.object({
  tin: z.string().min(1, "TIN is required"),
  pin: z.string().min(1, "PIN is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  apiKey: z.string().optional(),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
  isActive: z.boolean().default(false),
});

// ── Compliance Center ─────────────────────────────────────────────────────────

export const taxReportGenerateSchema = z.object({
  type: z.enum(["monthly", "quarterly", "annual"]),
  // Anchor date within the target period; period bounds are derived from it.
  anchorDate: z.coerce.date().optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

export const taxCalendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  type: z.string().min(1).default("custom"),
  recurring: z.boolean().default(false),
});

export const taxCalendarUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  type: z.string().min(1).optional(),
  recurring: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export const complianceAlertUpdateSchema = z.object({
  read: z.boolean().optional(),
  resolved: z.boolean().optional(),
});

export const complianceValidateSchema = z.object({
  pin: z.string().optional(),
  invoiceId: z.string().optional(),
});

export const complianceRetrySchema = z.object({
  recordIds: z.array(z.string()).optional(),
});

export type TaxReportGenerateInput = z.infer<typeof taxReportGenerateSchema>;
export type TaxCalendarEventInput = z.infer<typeof taxCalendarEventSchema>;
export type TaxCalendarUpdateInput = z.infer<typeof taxCalendarUpdateSchema>;
export type ComplianceAlertUpdateInput = z.infer<typeof complianceAlertUpdateSchema>;
export type ComplianceValidateInput = z.infer<typeof complianceValidateSchema>;
export type ComplianceRetryInput = z.infer<typeof complianceRetrySchema>;

export type InventoryCategoryInput = z.infer<typeof inventoryCategorySchema>;
export type InventoryBrandInput = z.infer<typeof inventoryBrandSchema>;
export type InventorySupplierInput = z.infer<typeof inventorySupplierSchema>;
export type InventoryWarehouseInput = z.infer<typeof inventoryWarehouseSchema>;
export type InventoryProductInput = z.infer<typeof inventoryProductSchema>;
export type InventoryStockMovementInput = z.infer<typeof inventoryStockMovementSchema>;
export type InventoryPurchaseOrderInput = z.infer<typeof inventoryPurchaseOrderSchema>;
export type InventoryStockAdjustmentInput = z.infer<typeof inventoryStockAdjustmentSchema>;
export type ChartOfAccountInput = z.infer<typeof chartOfAccountsSchema>;
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type EtimsConfigInput = z.infer<typeof etimsConfigSchema>;

// ── Enterprise CRM (Epic 2) ───────────────────────────────────────────────────

const leadSourceValues = [
  "website",
  "referral",
  "social_media",
  "cold_call",
  "email_campaign",
  "event",
  "partner",
  "advertisement",
  "other",
] as const;

const leadStatusValues = [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
  "lost",
] as const;

const dealStatusValues = ["open", "won", "lost"] as const;

const activityTypeValues = [
  "call",
  "meeting",
  "email",
  "task",
  "note",
  "follow_up",
] as const;

const activityStatusValues = ["planned", "completed", "cancelled"] as const;

const quotationStatusValues = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "converted",
] as const;

const quotationApprovalStatusValues = [
  "not_required",
  "pending",
  "approved",
  "rejected",
] as const;

export const crmCompanySchema = z.object({
  name: z.string().min(2, "Company name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industry: z.string().optional(),
  size: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("Kenya"),
  taxId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const crmContactSchema = z.object({
  companyId: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const crmLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(leadSourceValues).default("other"),
  status: z.enum(leadStatusValues).default("new"),
  estimatedValue: z.coerce.number().min(0).default(0),
  qualificationNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const crmPipelineStageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  order: z.coerce.number().int().default(0),
  probability: z.coerce.number().int().min(0).max(100).default(0),
  color: z.string().default("#16a34a"),
  isDefault: z.boolean().default(false),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

export const crmDealSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  stageId: z.string().optional(),
  amount: z.coerce.number().min(0).default(0),
  currency: z.string().default("KES"),
  probability: z.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  status: z.enum(dealStatusValues).default("open"),
  lostReason: z.string().optional(),
  ownerId: z.string().optional(),
  notes: z.string().optional(),
});

export const crmActivitySchema = z.object({
  type: z.enum(activityTypeValues),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  status: z.enum(activityStatusValues).default("planned"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.coerce.date().optional(),
  remindAt: z.coerce.date().optional(),
  assignedTo: z.string().optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
});

export const crmQuotationSchema = z.object({
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  currency: z.string().default("KES"),
  taxRate: z.coerce.number().min(0).max(100).default(16),
  notes: z.string().optional(),
  terms: z.string().optional(),
  approvalStatus: z
    .enum(quotationApprovalStatusValues)
    .default("not_required"),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        unitPrice: z.coerce.number().min(0, "Price must be 0 or more"),
      })
    )
    .min(1, "Add at least one item"),
});

export type CrmCompanyInput = z.infer<typeof crmCompanySchema>;
export type CrmContactInput = z.infer<typeof crmContactSchema>;
export type CrmLeadInput = z.infer<typeof crmLeadSchema>;
export type CrmPipelineStageInput = z.infer<typeof crmPipelineStageSchema>;
export type CrmDealInput = z.infer<typeof crmDealSchema>;
export type CrmActivityInput = z.infer<typeof crmActivitySchema>;
export type CrmQuotationInput = z.infer<typeof crmQuotationSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type MpesaStkInput = z.infer<typeof mpesaStkSchema>;
export type AiRequestInput = z.infer<typeof aiRequestSchema>;
