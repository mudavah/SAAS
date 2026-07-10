import type { PaymentProvider, PaymentOperationType, CreatePaymentInput, CreatePaymentResult, VerifyPaymentInput, VerifyPaymentResult, RefundInput, RefundResult, CheckStatusInput, CheckStatusResult, CancelPendingInput, CancelPendingResult, ProviderConfig, PaymentProviderType } from "../types";

export class BankTransferProvider implements PaymentProvider {
  readonly type: PaymentProviderType = "bank_transfer";
  readonly name = "Bank Transfer";
  readonly supportedOperations: PaymentOperationType[] = [
    "create_payment",
    "verify_payment",
    "check_status",
    "cancel_pending",
    "refund_payment",
  ];

  private config: ProviderConfig = {
    enabled: false,
    environment: "sandbox",
  };

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  validateConfig(): void {
    if (!this.config.merchantId) throw new Error("Bank account details are missing");
  }

  isConfigured(): boolean {
    return !!this.config.merchantId;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const reference = input.reference || `BT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return {
      success: true,
      providerPaymentId: reference,
      reference,
      rawResponse: {
        bankName: this.config.merchantId,
        accountName: this.config.username,
        reference,
        amount: input.amount,
        currency: input.currency,
        instructions: `Please transfer KES ${input.amount.toFixed(2)} to the account provided and use reference ${reference}`,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return {
      success: true,
      status: "pending",
      rawResponse: {
        note: "Bank transfers require manual approval. Use the admin panel to approve once funds are received.",
      },
    };
  }

  async checkStatus(input: CheckStatusInput): Promise<CheckStatusResult> {
    return {
      success: true,
      status: "pending",
      rawResponse: { note: "Bank transfer status is pending manual approval" },
    };
  }

  async cancelPending(input: CancelPendingInput): Promise<CancelPendingResult> {
    return {
      success: true,
      rawResponse: { note: "Bank transfer record marked as cancelled" },
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      success: false,
      status: "failed",
      error: "Bank transfer refunds must be processed manually via bank transfer back to the customer",
    };
  }

  parseWebhookPayload(payload: unknown): {
    type: string;
    paymentId?: string;
    status: "pending" | "completed" | "failed" | "refunded";
    amount?: number;
    currency?: string;
    receiptNumber?: string;
    metadata: Record<string, unknown>;
    error?: string;
  } {
    const data = payload as Record<string, unknown>;
    return {
      type: "payment.pending",
      paymentId: data.reference as string,
      status: "pending",
      amount: data.amount as number,
      currency: (data.currency as string) || "KES",
      metadata: data,
    };
  }
}
