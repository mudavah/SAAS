import type { PaymentProvider, PaymentOperationType, CreatePaymentInput, CreatePaymentResult, VerifyPaymentInput, VerifyPaymentResult, RefundInput, RefundResult, CheckStatusInput, CheckStatusResult, CancelPendingInput, CancelPendingResult, ProviderConfig, PaymentProviderType } from "../types";
import { stripe, isStripeConfigured, getPriceIdForPlan, createCheckoutSession, createStripeCustomer } from "@/lib/stripe";
import type Stripe from "stripe";

export class StripeProvider implements PaymentProvider {
  readonly type: PaymentProviderType = "stripe";
  readonly name = "Stripe";
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
    if (!stripe) {
      throw new Error("STRIPE_SECRET_KEY is missing or invalid.");
    }
  }

  isConfigured(): boolean {
    return isStripeConfigured();
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    try {
      if (!stripe) {
        return {
          success: false,
          error: "Stripe is not configured",
          errorCode: "NOT_CONFIGURED",
        };
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      let customerId: string | undefined;

      if (input.customerEmail) {
        const existing = await stripe.customers.list({ email: input.customerEmail, limit: 1 });
        if (existing.data.length > 0) {
          customerId = existing.data[0].id;
        } else {
          const customer = await createStripeCustomer(input.customerEmail, input.customerName);
          customerId = customer.id;
        }
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: (input.currency || "usd").toLowerCase(),
              product_data: {
                name: input.description || "KaziFlow Payment",
              },
              unit_amount: Math.round(input.amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: input.returnUrl || `${appUrl}/dashboard/payments?success=true`,
        cancel_url: input.cancelUrl || `${appUrl}/dashboard/payments?cancelled=true`,
        metadata: {
          invoiceId: input.invoiceId || "",
          organizationId: input.metadata?.organizationId as string || "",
          userId: input.metadata?.userId as string || "",
        },
      });

      return {
        success: true,
        providerPaymentId: session.id,
        reference: session.id,
        checkoutUrl: session.url || undefined,
        rawResponse: { sessionId: session.id },
      };
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      return {
        success: false,
        error: stripeError?.message || "Stripe checkout creation failed",
        errorCode: stripeError?.code || "STRIPE_ERROR",
      };
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    try {
      if (!input.providerPaymentId) {
        return {
          success: false,
          status: "failed",
          error: "Session ID is required for Stripe verification",
        };
      }

      const session = await stripe!.checkout.sessions.retrieve(input.providerPaymentId);

      if (session.payment_status === "paid") {
        const paymentIntent = session.payment_intent as string;
        const pi = await stripe!.paymentIntents.retrieve(paymentIntent);

        return {
          success: true,
          status: "completed",
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || "USD",
          receiptNumber: pi.latest_charge as string,
          rawResponse: { session, paymentIntent: pi },
        };
      }

      return {
        success: true,
        status: session.payment_status === "unpaid" ? "pending" : "failed",
        rawResponse: { session },
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Stripe verification failed",
      };
    }
  }

  async checkStatus(input: CheckStatusInput): Promise<CheckStatusResult> {
    return this.verifyPayment({
      provider: "stripe",
      providerPaymentId: input.providerPaymentId,
    });
  }

  async cancelPending(input: CancelPendingInput): Promise<CancelPendingResult> {
    try {
      if (!input.providerPaymentId) {
        return { success: false, error: "Session ID required" };
      }

      const session = await stripe!.checkout.sessions.expire(input.providerPaymentId);
      return {
        success: true,
        rawResponse: { session },
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
      if (!input.providerPaymentId) {
        return {
          success: false,
          status: "failed",
          error: "Payment intent ID is required for refund",
        };
      }

      const refund = await stripe!.refunds.create({
        payment_intent: input.providerPaymentId,
        amount: input.amount ? Math.round(input.amount * 100) : undefined,
        reason: input.reason ? ("requested_by_customer" as Stripe.RefundCreateParams.Reason) : undefined,
      });

      return {
        success: true,
        refundId: refund.id,
        status: "refunded",
        rawResponse: { refund },
      };
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      return {
        success: false,
        status: "failed",
        error: stripeError?.message || "Refund failed",
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
    const event = payload as { type?: string; data?: { object?: Record<string, unknown> } };

    const obj = event.data?.object || {};

    switch (event.type) {
      case "checkout.session.completed":
      case "payment_intent.succeeded":
        return {
          type: "payment.completed",
          paymentId: obj.id as string,
          status: "completed",
          amount: ((obj.amount_total as number) || (obj.amount as number) || 0) / 100,
          currency: (obj.currency as string) || "USD",
          receiptNumber: obj.payment_intent as string,
          metadata: obj.metadata as Record<string, unknown> || {},
        };

      case "payment_intent.payment_failed":
        return {
          type: "payment.failed",
          paymentId: obj.id as string,
          status: "failed",
          amount: ((obj.amount as number) || 0) / 100,
          currency: (obj.currency as string) || "USD",
          metadata: obj.metadata as Record<string, unknown> || {},
          error: (obj.last_payment_error as { message?: string })?.message,
        };

      case "charge.refunded":
        return {
          type: "payment.refunded",
          paymentId: obj.payment_intent as string,
          status: "refunded",
          amount: ((obj.amount as number) || 0) / 100,
          currency: (obj.currency as string) || "USD",
          metadata: obj.metadata as Record<string, unknown> || {},
        };

      default:
        return {
          type: event.type || "unknown",
          status: "pending",
          metadata: obj.metadata as Record<string, unknown> || {},
        };
    }
  }
}
