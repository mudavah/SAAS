import type {
  PaymentProviderType,
  PaymentOperationType,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  RefundInput,
  RefundResult,
  CheckStatusInput,
  CheckStatusResult,
  CancelPendingInput,
  CancelPendingResult,
  ProviderConfig,
} from "./types";

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
