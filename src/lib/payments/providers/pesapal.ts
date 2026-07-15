import type { PaymentProvider, PaymentOperationType, CreatePaymentInput, CreatePaymentResult, VerifyPaymentInput, VerifyPaymentResult, RefundInput, RefundResult, CheckStatusInput, CheckStatusResult, CancelPendingInput, CancelPendingResult, ProviderConfig, PaymentProviderType } from "../types";
import { fetchWithTimeout } from "@/lib/http";

export class PesapalProvider implements PaymentProvider {
  readonly type: PaymentProviderType = "pesapal";
  readonly name = "Pesapal";
  readonly supportedOperations: PaymentOperationType[] = [
    "create_payment",
    "generate_checkout",
    "verify_payment",
    "handle_callback",
    "check_status",
    "refund_payment",
    "subscription_renewal",
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
    if (!this.config.apiKey) throw new Error("Pesapal API key is missing");
    if (!this.config.apiSecret) throw new Error("Pesapal API secret is missing");
    if (!this.config.merchantId) throw new Error("Pesapal merchant ID is missing");
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.apiSecret && this.config.merchantId);
  }

  private getBaseUrl(): string {
    return this.config.environment === "production"
      ? "https://www.pesapal.com/api/PostPesapalDirectOrderV4"
      : "https://demo.pesapal.com/api/PostPesapalDirectOrderV4";
  }

  private async getAuthToken(): Promise<string> {
    const baseUrl = this.config.environment === "production"
      ? "https://www.pesapal.com/api/"
      : "https://demo.pesapal.com/api/";

    const res = await fetchWithTimeout(`${baseUrl}Auth/RequestToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consumer_key: this.config.apiKey,
        consumer_secret: this.config.apiSecret,
      }),
      timeoutMs: 10_000,
    });

    const data = await res.json();
    if (!data.token) {
      throw new Error("Failed to get Pesapal auth token");
    }
    return data.token;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    try {
      const token = await this.getAuthToken();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const body = {
        amount: input.amount,
        currency: input.currency || "KES",
        description: input.description || "KaziFlow Payment",
        callback_url: input.callbackUrl || `${appUrl}/api/payments/webhooks/pesapal`,
        notification_id: crypto.randomUUID(),
        billing_address: {
          email_address: input.customerEmail || "customer@example.com",
          phone_number: input.phoneNumber || "",
          first_name: input.customerName || "Customer",
          last_name: "",
        },
        metadata: input.metadata || {},
      };

      const res = await fetchWithTimeout(this.getBaseUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        timeoutMs: 15_000,
      });

      const data = await res.json();

      if (data.status === 200 || data.status === "200") {
        return {
          success: true,
          providerPaymentId: data.order_tracking_id || data.payment_reference,
          reference: data.order_tracking_id,
          checkoutUrl: data.redirect_url,
          rawResponse: data,
        };
      }

      return {
        success: false,
        error: data.error?.message || "Pesapal payment creation failed",
        errorCode: "PESAPAL_ERROR",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Pesapal payment failed",
        errorCode: "NETWORK_ERROR",
      };
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    try {
      const token = await this.getAuthToken();
      const baseUrl = this.getBaseUrl().replace("PostPesapalDirectOrderV4", "");

      const res = await fetchWithTimeout(
        `${baseUrl}Transactions/GetTransactionStatus?orderTrackingId=${input.providerPaymentId}&merchantReference=${input.reference || ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeoutMs: 15_000,
        }
      );

      const data = await res.json();

      const statusMap: Record<string, "pending" | "completed" | "failed" | "refunded"> = {
        PENDING: "pending",
        COMPLETED: "completed",
        FAILED: "failed",
        INVALID: "failed",
        REFUNDED: "refunded",
      };

      return {
        success: true,
        status: statusMap[data.payment_status_description] || "pending",
        amount: data.amount,
        currency: data.currency || "KES",
        receiptNumber: data.confirmation_code,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Pesapal verification failed",
      };
    }
  }

  async checkStatus(input: CheckStatusInput): Promise<CheckStatusResult> {
    return this.verifyPayment(input);
  }

  async cancelPending(input: CancelPendingInput): Promise<CancelPendingResult> {
    try {
      const token = await this.getAuthToken();
      const baseUrl = this.getBaseUrl().replace("PostPesapalDirectOrderV4", "");

      const res = await fetchWithTimeout(
        `${baseUrl}Transactions/CancelTransaction?orderTrackingId=${input.providerPaymentId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          timeoutMs: 15_000,
        }
      );

      const data = await res.json();
      return {
        success: data.status === 200 || data.status === "200",
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cancel failed",
      };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    try {
      const token = await this.getAuthToken();
      const baseUrl = this.getBaseUrl().replace("PostPesapalDirectOrderV4", "");

      const res = await fetchWithTimeout(`${baseUrl}Transactions/Refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_tracking_id: input.providerPaymentId,
          amount: input.amount,
          username: this.config.username,
          remarks: input.reason || "Refund",
        }),
        timeoutMs: 15_000,
      });

      const data = await res.json();
      return {
        success: data.status === 200 || data.status === "200",
        refundId: data.refund_receipt,
        status: data.status === 200 || data.status === "200" ? "refunded" : "failed",
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Refund failed",
      };
    }
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
    const paymentStatus = (data.payment_status_description as string) || "PENDING";

    const statusMap: Record<string, "pending" | "completed" | "failed" | "refunded"> = {
      PENDING: "pending",
      COMPLETED: "completed",
      FAILED: "failed",
      INVALID: "failed",
      REFUNDED: "refunded",
    };

    return {
      type: paymentStatus === "COMPLETED" ? "payment.completed" : paymentStatus === "FAILED" ? "payment.failed" : "payment.pending",
      paymentId: data.order_tracking_id as string,
      status: statusMap[paymentStatus] || "pending",
      amount: data.amount as number,
      currency: (data.currency as string) || "KES",
      receiptNumber: data.confirmation_code as string,
      metadata: data,
      error: paymentStatus === "FAILED" ? (data.payment_status_description as string) : undefined,
    };
  }
}
