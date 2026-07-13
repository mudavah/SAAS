import type { DBSchema } from "idb";

export type OfflineStoreName =
  | "clients"
  | "products"
  | "invoices"
  | "payments"
  | "expenses"
  | "settings"
  | "pendingOperations";

export type OperationStatus = "pending" | "processing" | "completed" | "failed";
export type OperationPriority = "low" | "medium" | "high";
export type OperationType = "create" | "update" | "delete";

export interface OfflineClient {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OfflineProduct {
  id: string;
  userId: string;
  organizationId: string;
  categoryId?: string;
  brandId?: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  costPrice: string;
  sellingPrice: string;
  unit?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineInvoice {
  id: string;
  userId: string;
  organizationId: string;
  clientId?: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  notes?: string;
  terms?: string;
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflinePayment {
  id: string;
  userId: string;
  organizationId: string;
  invoiceId?: string;
  clientId?: string;
  amount: string;
  currency: string;
  method: string;
  status: string;
  reference?: string;
  mpesaReceipt?: string;
  mpesaPhone?: string;
  stripePaymentId?: string;
  providerPaymentId?: string;
  providerStatus?: string;
  providerMetadata?: Record<string, unknown>;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OfflineExpense {
  id: string;
  userId: string;
  organizationId: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
  receipt?: string;
  taxDeductible: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface OfflineSetting {
  key: string;
  value: unknown;
  organizationId?: string;
  updatedAt: string;
}

export type ConflictAction = "use_local" | "use_remote" | "merge" | "cancel";

export interface ConflictContext {
  entity: OfflineStoreName;
  entityId: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  base?: Record<string, unknown> | null;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

export interface ConflictRecord {
  id: string;
  organizationId: string;
  entity: OfflineStoreName;
  entityId: string;
  localPayload?: Record<string, unknown>;
  remotePayload?: Record<string, unknown>;
  localVersion?: Record<string, unknown>;
  remoteVersion?: Record<string, unknown>;
  localUpdatedAt?: number;
  remoteUpdatedAt?: number;
  baseVersion?: Record<string, unknown> | null;
  detectedAt: number;
  resolution?: ConflictAction;
  resolved?: boolean;
  resolvedAt?: number;
  checksum?: string;
}

export interface PendingOperation {
  id: string;
  operation: OperationType;
  entity: OfflineStoreName;
  entityId: string;
  organizationId: string;
  payload: Record<string, unknown>;
  status: OperationStatus;
  priority: OperationPriority;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
  checksum: string;
}

export type OfflineRecord =
  | OfflineClient
  | OfflineProduct
  | OfflineInvoice
  | OfflinePayment
  | OfflineExpense
  | OfflineSetting;

export interface OfflineSchema extends DBSchema {
  clients: {
    key: string;
    value: OfflineClient;
    indexes: {
      byId: string;
      byOrganization: string;
      byUpdatedAt: string;
    };
  };
  products: {
    key: string;
    value: OfflineProduct;
    indexes: {
      byId: string;
      byOrganization: string;
      byUpdatedAt: string;
    };
  };
  invoices: {
    key: string;
    value: OfflineInvoice;
    indexes: {
      byId: string;
      byOrganization: string;
      byUpdatedAt: string;
    };
  };
  payments: {
    key: string;
    value: OfflinePayment;
    indexes: {
      byId: string;
      byOrganization: string;
      byUpdatedAt: string;
    };
  };
  expenses: {
    key: string;
    value: OfflineExpense;
    indexes: {
      byId: string;
      byOrganization: string;
      byUpdatedAt: string;
    };
  };
  settings: {
    key: string;
    value: OfflineSetting;
    indexes: {
      byId: string;
      byOrganization: string;
      byUpdatedAt: string;
    };
  };
  pendingOperations: {
    key: string;
    value: PendingOperation;
    indexes: {
      byId: string;
      byOrganization: string;
      byStatus: string;
      byPriority: string;
      byCreatedAt: number;
    };
  };
}

export type OfflineDB = IDBDatabase;

export type OfflineStore =
  | "clients"
  | "products"
  | "invoices"
  | "payments"
  | "expenses"
  | "settings"
  | "pendingOperations";
