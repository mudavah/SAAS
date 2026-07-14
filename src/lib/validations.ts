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

// ── Procurement (Epic 3) ───────────────────────────────────────────────────────

const priorityValues = ["low", "medium", "high", "urgent"] as const;

export const procurementPurchaseRequestSchema = z.object({
  title: z.string().min(2, "Title is required"),
  department: z.string().optional(),
  requesterId: z.string().optional(),
  priority: z.enum(priorityValues).default("medium"),
  notes: z.string().optional(),
  requestedDate: z.coerce.date(),
  neededBy: z.coerce.date().optional(),
  currency: z.string().default("KES"),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        unit: z.string().default("pcs"),
        estUnitCost: z.coerce.number().min(0).default(0),
      })
    )
    .min(1, "Add at least one item"),
});

export const procurementRfqSchema = z.object({
  title: z.string().min(2, "Title is required"),
  validUntil: z.coerce.date().optional(),
  notes: z.string().optional(),
  supplierIds: z.array(z.string()).min(1, "Select at least one supplier"),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        unit: z.string().default("pcs"),
      })
    )
    .min(1, "Add at least one item"),
});

export const procurementSupplierQuotationSchema = z.object({
  rfqId: z.string().optional(),
  supplierId: z.string().min(1, "Supplier is required"),
  quotationNumber: z.string().min(1, "Quotation number is required"),
  receivedDate: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
  currency: z.string().default("KES"),
  taxRate: z.coerce.number().min(0).max(100).default(16),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        rfqItemId: z.string().optional(),
        productId: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        unit: z.string().default("pcs"),
        unitPrice: z.coerce.number().min(0),
      })
    )
    .min(1, "Add at least one item"),
});

export const procurementPurchaseOrderSchema = z.object({
  requestId: z.string().optional(),
  rfqId: z.string().optional(),
  supplierId: z.string().optional(),
  budgetId: z.string().optional(),
  orderDate: z.coerce.date(),
  expectedDate: z.coerce.date().optional(),
  currency: z.string().default("KES"),
  taxRate: z.coerce.number().min(0).max(100).default(16),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        unit: z.string().default("pcs"),
        unitCost: z.coerce.number().min(0),
        taxRate: z.coerce.number().min(0).max(100).default(16),
        warehouseId: z.string().optional(),
      })
    )
    .min(1, "Add at least one item"),
});

export const procurementGrnSchema = z.object({
  receivedDate: z.coerce.date(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        poItemId: z.string().min(1, "PO item is required"),
        productId: z.string().optional(),
        warehouseId: z.string().min(1, "Warehouse is required"),
        quantityReceived: z.coerce.number().positive("Quantity must be positive"),
        quantityDamaged: z.coerce.number().min(0).default(0),
        unitCost: z.coerce.number().min(0).optional(),
      })
    )
    .min(1, "Add at least one item"),
});

export const procurementSupplierReturnSchema = z.object({
  grnId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  supplierId: z.string().optional(),
  returnDate: z.coerce.date(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        grnItemId: z.string().optional(),
        productId: z.string().optional(),
        warehouseId: z.string().optional(),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        unitCost: z.coerce.number().min(0).default(0),
      })
    )
    .min(1, "Add at least one item"),
});

export const procurementPurchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseOrderId: z.string().optional(),
  grnId: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  currency: z.string().default("KES"),
  taxRate: z.coerce.number().min(0).max(100).default(16),
  notes: z.string().optional(),
  postToBookkeeping: z.boolean().default(true),
  items: z
    .array(
      z.object({
        poItemId: z.string().optional(),
        productId: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        unitCost: z.coerce.number().min(0),
        taxRate: z.coerce.number().min(0).max(100).default(16),
      })
    )
    .min(1, "Add at least one item"),
});

export const procurementSupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseInvoiceId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().default("KES"),
  method: z.enum(["mpesa", "stripe", "cash", "bank_transfer", "other"]),
  paymentDate: z.coerce.date(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  postToBookkeeping: z.boolean().default(true),
});

export const procurementBudgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  period: z.enum(["monthly", "quarterly", "annual"]).default("monthly"),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  currency: z.string().default("KES"),
  amount: z.coerce.number().positive("Amount must be positive"),
  notes: z.string().optional(),
});

export const procurementApprovalDecisionSchema = z.object({
  comments: z.string().optional(),
});

export const procurementAiRecommendationSchema = z.object({
  status: z.enum(["open", "dismissed", "applied"]).optional(),
});

export type ProcurementPurchaseRequestInput = z.infer<typeof procurementPurchaseRequestSchema>;
export type ProcurementRfqInput = z.infer<typeof procurementRfqSchema>;
export type ProcurementSupplierQuotationInput = z.infer<typeof procurementSupplierQuotationSchema>;
export type ProcurementPurchaseOrderInput = z.infer<typeof procurementPurchaseOrderSchema>;
export type ProcurementGrnInput = z.infer<typeof procurementGrnSchema>;
export type ProcurementSupplierReturnInput = z.infer<typeof procurementSupplierReturnSchema>;
export type ProcurementPurchaseInvoiceInput = z.infer<typeof procurementPurchaseInvoiceSchema>;
export type ProcurementSupplierPaymentInput = z.infer<typeof procurementSupplierPaymentSchema>;
export type ProcurementBudgetInput = z.infer<typeof procurementBudgetSchema>;
export type ProcurementApprovalDecisionInput = z.infer<typeof procurementApprovalDecisionSchema>;

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

// ── Point of Sale (POS) (Epic 4) ─────────────────────────────────────────────

export const posOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Price must be 0 or more"),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(16),
});

export const posOrderSchema = z.object({
  clientId: z.string().optional(),
  warehouseId: z.string().optional(),
  currency: z.string().default("KES"),
  taxRate: z.coerce.number().min(0).max(100).default(16),
  items: z.array(posOrderItemSchema).min(1, "Add at least one item"),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export const posPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["cash", "mpesa", "card", "bank_transfer", "other"]),
  reference: z.string().optional(),
  phoneNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const posReturnSchema = z.object({
  reason: z.enum(["damaged", "wrong_item", "customer_request", "expired", "other"]),
  description: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0),
  })).min(1, "Add at least one return item"),
});

export const posSessionSchema = z.object({
  openingFloat: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export const posSessionCloseSchema = z.object({
  closingFloat: z.coerce.number().min(0),
  cashDeposited: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export type PosOrderItemInput = z.infer<typeof posOrderItemSchema>;
export type PosOrderInput = z.infer<typeof posOrderSchema>;
export type PosPaymentInput = z.infer<typeof posPaymentSchema>;
export type PosReturnInput = z.infer<typeof posReturnSchema>;
export type PosSessionInput = z.infer<typeof posSessionSchema>;
export type PosSessionCloseInput = z.infer<typeof posSessionCloseSchema>;

// ── Human Resource Management (Epic 5) ────────────────────────────────────────

const employmentTypeValues = ["permanent", "contract", "part_time", "intern", "casual"] as const;
const contractTypeValues = ["permanent", "fixed_term", "probation", "internship"] as const;
const leaveTypeValues = ["annual", "sick", "maternity", "paternity", "compassionate", "unpaid", "study"] as const;
const leaveStatusValues = ["pending", "approved", "rejected", "cancelled"] as const;
const attendanceStatusValues = ["present", "absent", "late", "half_day", "on_leave"] as const;
const shiftStatusValues = ["scheduled", "active", "completed", "cancelled"] as const;
const applicantStatusValues = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
const onboardingTaskStatusValues = ["pending", "in_progress", "completed", "skipped"] as const;
const offboardingTypeValues = ["resignation", "termination", "retirement", "contract_end"] as const;
const performanceReviewStatusValues = ["draft", "in_progress", "completed", "cancelled"] as const;
const trainingStatusValues = ["scheduled", "in_progress", "completed", "cancelled"] as const;
const documentTypeValues = ["id", "passport", "kra_pin", "nssf", "nhif", "contract", "certificate", "resume", "other"] as const;
const orgChartNodeTypeValues = ["department", "position", "employee"] as const;
const aiHrInsightTypeValues = ["turnover_risk", "leave_pattern", "training_gap", "attendance_anomaly", "performance_trend", "headcount_forecast"] as const;

export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional(),
  parentDepartmentId: z.string().optional(),
  managerId: z.string().optional(),
  costCenter: z.string().optional(),
});

export const positionSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  title: z.string().min(1, "Position title is required"),
  description: z.string().optional(),
  employmentType: z.enum(employmentTypeValues),
  contractType: z.enum(contractTypeValues).optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  currency: z.string().default("KES"),
  reportsToPositionId: z.string().optional(),
});

export const employeeSchema = z.object({
  employeeNumber: z.string().min(1, "Employee number is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("Kenya"),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
  employmentType: z.enum(employmentTypeValues),
  status: z.enum(["active", "on_leave", "suspended", "terminated", "resigned"]).default("active"),
  hireDate: z.coerce.date(),
  terminationDate: z.coerce.date().optional(),
  probationEndDate: z.coerce.date().optional(),
  contractEndDate: z.coerce.date().optional(),
  salary: z.coerce.number().min(0).optional(),
  currency: z.string().default("KES"),
});

export const contractSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  contractNumber: z.string().min(1, "Contract number is required"),
  contractType: z.enum(contractTypeValues),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  salary: z.coerce.number().min(0),
  currency: z.string().default("KES"),
  benefits: z.record(z.any()).optional(),
  terms: z.string().optional(),
});

export const attendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.coerce.date(),
  status: z.enum(attendanceStatusValues),
  clockIn: z.coerce.date().optional(),
  clockOut: z.coerce.date().optional(),
  breakMinutes: z.coerce.number().int().min(0).default(0),
  overtimeMinutes: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const leaveRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveType: z.enum(leaveTypeValues),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  days: z.coerce.number().positive("Days must be positive"),
  reason: z.string().optional(),
});

export const leaveApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

export const shiftSchema = z.object({
  name: z.string().min(1, "Shift name is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  breakMinutes: z.coerce.number().int().min(0).default(0),
  color: z.string().default("#16a34a"),
});

export const shiftAssignmentSchema = z.object({
  shiftId: z.string().min(1, "Shift is required"),
  employeeId: z.string().min(1, "Employee is required"),
  date: z.coerce.date(),
  status: z.enum(shiftStatusValues).default("scheduled"),
});

export const applicantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  positionId: z.string().optional(),
  departmentId: z.string().optional(),
  resumeUrl: z.string().optional(),
  coverLetter: z.string().optional(),
  expectedSalary: z.coerce.number().min(0).optional(),
  availabilityDate: z.coerce.date().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const applicantStatusUpdateSchema = z.object({
  status: z.enum(applicantStatusValues),
});

export const performanceReviewSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  reviewerId: z.string().optional(),
  reviewPeriodStart: z.coerce.date(),
  reviewPeriodEnd: z.coerce.date(),
  overallRating: z.coerce.number().min(0).max(5).optional(),
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
  goals: z.array(z.any()).optional(),
  comments: z.string().optional(),
});

export const trainingSchema = z.object({
  title: z.string().min(1, "Training title is required"),
  description: z.string().optional(),
  trainer: z.string().optional(),
  location: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  capacity: z.coerce.number().int().min(1).optional(),
  cost: z.coerce.number().min(0).default(0),
  currency: z.string().default("KES"),
});

export const trainingEnrollmentSchema = z.object({
  trainingId: z.string().min(1, "Training is required"),
  employeeId: z.string().min(1, "Employee is required"),
});

export const onboardingChecklistSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  task: z.string().min(1, "Task is required"),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(onboardingTaskStatusValues).default("pending"),
});

export const offboardingSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  offboardingType: z.enum(offboardingTypeValues),
  lastWorkingDate: z.coerce.date(),
  reason: z.string().optional(),
  noticePeriodDays: z.coerce.number().int().min(0).optional(),
  returnEquipment: z.record(z.any()).optional(),
  exitInterviewNotes: z.string().optional(),
});

export const documentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  documentType: z.enum(documentTypeValues),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  fileSize: z.coerce.number().int().min(0).optional(),
  mimeType: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const aiInsightSchema = z.object({
  type: z.enum(aiHrInsightTypeValues),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  data: z.record(z.any()).optional(),
});

export const aiReminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  reminderType: z.string().min(1, "Reminder type is required"),
  dueDate: z.coerce.date(),
  relatedResourceType: z.string().optional(),
  relatedResourceId: z.string().optional(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type PositionInput = z.infer<typeof positionSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type ContractInput = z.infer<typeof contractSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type LeaveApprovalInput = z.infer<typeof leaveApprovalSchema>;
export type ShiftInput = z.infer<typeof shiftSchema>;
export type ShiftAssignmentInput = z.infer<typeof shiftAssignmentSchema>;
export type ApplicantInput = z.infer<typeof applicantSchema>;
export type ApplicantStatusUpdateInput = z.infer<typeof applicantStatusUpdateSchema>;
export type PerformanceReviewInput = z.infer<typeof performanceReviewSchema>;
export type TrainingInput = z.infer<typeof trainingSchema>;
export type TrainingEnrollmentInput = z.infer<typeof trainingEnrollmentSchema>;
export type OnboardingChecklistInput = z.infer<typeof onboardingChecklistSchema>;
export type OffboardingInput = z.infer<typeof offboardingSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type AiInsightInput = z.infer<typeof aiInsightSchema>;
export type AiReminderInput = z.infer<typeof aiReminderSchema>;

// ── Payroll (Epic 6) ────────────────────────────────────────────────────────────

const payrollPeriodStatusValues = ["open", "processing", "closed", "locked"] as const;
const payrollRunStatusValues = ["draft", "calculated", "pending_approval", "approved", "rejected", "paid", "cancelled"] as const;
const payslipStatusValues = ["draft", "generated", "sent", "viewed"] as const;
const payrollItemTypeValues = ["earnings", "allowance", "deduction", "tax_paye", "tax_nssf", "tax_nhif", "tax_pension", "tax_housing_levy", "overtime", "bonus"] as const;
const salaryStructureTypeValues = ["monthly", "bi_weekly", "weekly", "daily", "contract"] as const;

export const payrollPeriodSchema = z.object({
  name: z.string().min(1, "Period name is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isLocked: z.boolean().default(false),
});

export const salaryStructureSchema = z.object({
  name: z.string().min(1, "Structure name is required"),
  description: z.string().optional(),
  type: z.enum(salaryStructureTypeValues).default("monthly"),
  isActive: z.boolean().default(true),
});

export const salaryStructureComponentSchema = z.object({
  salaryStructureId: z.string().min(1, "Salary structure is required"),
  name: z.string().min(1, "Component name is required"),
  type: z.enum(payrollItemTypeValues),
  amount: z.coerce.number().min(0, "Amount must be 0 or more"),
  isPercentage: z.boolean().default(false),
  isRecurring: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  isStatutory: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const employeeSalaryAssignmentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  salaryStructureId: z.string().min(1, "Salary structure is required"),
  effectiveDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  basicSalary: z.coerce.number().min(0, "Basic salary must be 0 or more"),
  currency: z.string().default("KES"),
});

export const payrollRunSchema = z.object({
  payrollPeriodId: z.string().min(1, "Payroll period is required"),
  notes: z.string().optional(),
});

export const payrollApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().optional(),
});

export const payrollPaymentExportSchema = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
});

export const payrollAiInsightSchema = z.object({
  type: z.string().min(1, "Insight type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  data: z.record(z.any()).optional(),
});

export type PayrollPeriodInput = z.infer<typeof payrollPeriodSchema>;
export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>;
export type SalaryStructureComponentInput = z.infer<typeof salaryStructureComponentSchema>;
export type EmployeeSalaryAssignmentInput = z.infer<typeof employeeSalaryAssignmentSchema>;
export type PayrollRunInput = z.infer<typeof payrollRunSchema>;
export type PayrollApprovalInput = z.infer<typeof payrollApprovalSchema>;
export type PayrollPaymentExportInput = z.infer<typeof payrollPaymentExportSchema>;
export type PayrollAiInsightInput = z.infer<typeof payrollAiInsightSchema>;
