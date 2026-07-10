import type { PaymentProvider, PaymentOperationType, CreatePaymentInput, CreatePaymentResult, VerifyPaymentInput, VerifyPaymentResult, RefundInput, RefundResult, CheckStatusInput, CheckStatusResult, CancelPendingInput, CancelPendingResult, ProviderConfig, PaymentProviderType } from "../types";
import { initiateStkPush, getMpesaAccessToken, validateMpesaConfig, MpesaError, parseMpesaCallback, isMpesaConfigured } from "@/lib/mpesa";

export class MpesaProvider implements PaymentProvider {
  readonly type: PaymentProviderType = "mpesa";
  readonly name = "M-Pesa";
  readonly supportedOperations: PaymentOperationType[] = [
    "create_payment",
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
    validateMpesaConfig();
  }

  isConfigured(): boolean {
    return isMpesaConfigured();
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    try {
      if (input.phoneNumber) {
        const result = await initiateStkPush({
          phone: input.phoneNumber,
          amount: input.amount,
          accountReference: input.invoiceId || "KAZIFLOW",
          transactionDesc: input.description || "KaziFlow Payment",
        });

        return {
          success: true,
          providerPaymentId: result.CheckoutRequestID,
          reference: result.CheckoutRequestID,
          rawResponse: result,
        };
      }

      return {
        success: false,
        error: "Phone number is required for M-Pesa STK Push",
        errorCode: "MISSING_PHONE",
      };
    } catch (error) {
      if (error instanceof MpesaError) {
        return {
          success: false,
          error: error.userMessage,
          errorCode: error.code,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "M-Pesa payment failed",
        errorCode: "UNKNOWN_ERROR",
      };
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    try {
      if (input.checkoutRequestId) {
        const token = await getMpesaAccessToken();
        const baseUrl = process.env.MPESA_ENV === "production"
          ? "https://api.safaricom.co.ke"
          : "https://sandbox.safaricom.co.ke";
        const res = await fetch(
          `${baseUrl}/mpesa/stkpushquery/v1/query`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              BusinessShortCode: process.env.MPESA_SHORTCODE,
              Password: Buffer.from(
                process.env.MPESA_SHORTCODE! + process.env.MPESA_PASSKEY! + new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)
              ).toString("base64"),
              Timestamp: new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14),
              CheckoutRequestID: input.checkoutRequestId,
            }),
          }
        );

        const data = await res.json();

        if (data.ResultCode === "0" || data.ResultCode === 0) {
          return {
            success: true,
            status: "completed",
            rawResponse: data,
          };
        }

        if (data.ResultCode === "1032") {
          return {
            success: true,
            status: "pending",
            rawResponse: data,
          };
        }

        return {
          success: false,
          status: "failed",
          error: data.ResultDesc || "Transaction not found",
          rawResponse: data,
        };
      }

      return {
        success: false,
        status: "pending",
        error: "CheckoutRequestID is required for M-Pesa verification",
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  async checkStatus(input: CheckStatusInput): Promise<CheckStatusResult> {
    return this.verifyPayment({
      provider: "mpesa",
      checkoutRequestId: input.reference || input.providerPaymentId,
    });
  }

  async cancelPending(input: CancelPendingInput): Promise<CancelPendingResult> {
    try {
      const token = await getMpesaAccessToken();
      const baseUrl = process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
      const res = await fetch(
        `${baseUrl}/mpesa/stkpushquery/v1/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: Buffer.from(
              process.env.MPESA_SHORTCODE! + process.env.MPESA_PASSKEY! + new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)
            ).toString("base64"),
            Timestamp: new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14),
            CheckoutRequestID: input.reference || input.providerPaymentId,
            IdentifierType: "4",
          }),
        }
      );

      const data = await res.json();
      return {
        success: data.ResponseCode === "0" || data.ResponseCode === 0,
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
      const token = await getMpesaAccessToken();
      const baseUrl = process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
      const res = await fetch(
        `${baseUrl}/mpesa/b2c/v1/paymentreversal`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Initiator: "testapi",
            SecurityCredential: Buffer.from("test").toString("base64"),
            CommandID: "TransactionReversal",
            TransactionID: input.providerPaymentId,
            Amount: input.amount || 0,
            ReceiverParty: process.env.MPESA_SHORTCODE,
            RecieverPartyCode: process.env.MPESA_SHORTCODE,
            ResultURL: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/webhooks/mpesa`,
            QueueTimeOutURL: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/webhooks/mpesa`,
            Remarks: input.reason || "Refund",
            Occasion: input.reason || "Refund",
          }),
        }
      );

      const data = await res.json();
      return {
        success: data.ResponseCode === "0" || data.ResponseCode === 0,
        refundId: data.TransactionID,
        status: data.ResponseCode === "0" || data.ResponseCode === 0 ? "refunded" : "failed",
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
    const parsed = parseMpesaCallback(payload as any);

    return {
      type: parsed.success ? "payment.completed" : "payment.failed",
      paymentId: parsed.checkoutRequestId,
      status: parsed.success ? "completed" : "failed",
      amount: parsed.amount,
      currency: "KES",
      receiptNumber: parsed.mpesaReceiptNumber,
      metadata: {
        merchantRequestId: parsed.merchantRequestId,
        checkoutRequestId: parsed.checkoutRequestId,
        phoneNumber: parsed.phoneNumber,
        transactionDate: parsed.transactionDate,
      },
      error: parsed.success ? undefined : parsed.resultDesc,
    };
  }
}
