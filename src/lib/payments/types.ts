import type { Payment, PaymentMethod, PaymentStatus } from "@/db/schema";

export type PaymentProviderType = "mpesa" | "stripe" | "pesapal" | "bank_transfer";

export type PaymentOperationType =
  | "create_payment"
  | "generate_checkout"
  | "generate_payment_link"
  | "verify_payment"
  | "handle_callback"
  | "refund_payment"
  | "check_status"
  | "cancel_pending"
  | "retrieve_transaction"
  | "subscription_renewal";

export interface PaymentProvider {
  readonly type: PaymentProviderType;
  readonly name: string;
  readonly supportedOperations: PaymentOperationType[];

  validateConfig(): void;
  isConfigured(): boolean;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  checkStatus(input: CheckStatusInput): Promise<CheckStatusResult>;
  cancelPending(input: CancelPendingInput): Promise<CancelPendingResult>;
  refund(input: RefundInput): Promise<RefundResult>;

  parseWebhookPayload(payload: unknown): {
    type: string;
    paymentId?: string;
    status: "pending" | "completed" | "failed" | "refunded";
    amount?: number;
    currency?: string;
    receiptNumber?: string;
    metadata: Record<string, unknown>;
    error?: string;
  };

  getConfig(): ProviderConfig;
  updateConfig(config: Partial<ProviderConfig>): void;
}

export class PaymentEngineError extends Error {
  code: string;
  userMessage: string;

  constructor(code: string, userMessage: string, detail?: string) {
    super(detail || userMessage);
    this.name = "PaymentEngineError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

export interface CreatePaymentInput {
  provider: PaymentProviderType;
  amount: number;
  currency: string;
  method?: string;
  invoiceId?: string;
  clientId?: string;
  reference?: string;
  description?: string;
  phoneNumber?: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentResult {
  success: boolean;
  providerPaymentId?: string;
  reference?: string;
  checkoutUrl?: string;
  paymentLink?: string;
  expiresAt?: Date;
  rawResponse?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

export interface VerifyPaymentInput {
  provider: PaymentProviderType;
  providerPaymentId?: string;
  reference?: string;
  checkoutRequestId?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: PaymentStatus;
  amount?: number;
  currency?: string;
  receiptNumber?: string;
  transactionDate?: Date;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export interface RefundInput {
  provider: PaymentProviderType;
  providerPaymentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  status: PaymentStatus;
  rawResponse?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

export interface CheckStatusInput {
  provider: PaymentProviderType;
  providerPaymentId: string;
  reference?: string;
}

export interface CheckStatusResult {
  success: boolean;
  status: PaymentStatus;
  amount?: number;
  receiptNumber?: string;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export interface CancelPendingInput {
  provider: PaymentProviderType;
  providerPaymentId: string;
  reference?: string;
}

export interface CancelPendingResult {
  success: boolean;
  rawResponse?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

export interface ProviderConfig {
  enabled: boolean;
  isDefault?: boolean;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  shortcode?: string;
  passkey?: string;
  callbackUrl?: string;
  environment: "sandbox" | "production";
  merchantId?: string;
  username?: string;
  password?: string;
}

export type PaymentWebhookEventType =
  | "payment.completed"
  | "payment.failed"
  | "payment.pending"
  | "payment.refunded"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "subscription.renewed";

export interface PaymentWebhookEvent {
  id: string;
  provider: PaymentProviderType;
  type: PaymentWebhookEventType;
  providerEventId?: string;
  paymentId?: string;
  invoiceId?: string;
  organizationId?: string;
  amount?: number;
  currency?: string;
  receiptNumber?: string;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  receivedAt: Date;
  processedAt?: Date;
  processed: boolean;
  error?: string;
}

export interface PaymentAutomationContext {
  paymentId: string;
  organizationId: string;
  userId: string;
  invoiceId?: string;
  clientId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  receiptNumber?: string;
  metadata?: Record<string, unknown>;
}
