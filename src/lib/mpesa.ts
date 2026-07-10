/**
 * M-Pesa Daraja API integration (Safaricom)
 * Sandbox: https://developer.safaricom.co.ke
 */

export class MpesaError extends Error {
  code: string;
  userMessage: string;

  constructor(code: string, userMessage: string, detail?: string) {
    super(detail || userMessage);
    this.name = "MpesaError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

const MPESA_BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

let cachedToken: { token: string; expires: number } | null = null;

import { isPlaceholder } from "@/lib/validation-helpers";

export function isMpesaConfigured(): boolean {
  return (
    !isPlaceholder(process.env.MPESA_CONSUMER_KEY) &&
    !isPlaceholder(process.env.MPESA_CONSUMER_SECRET) &&
    !isPlaceholder(process.env.MPESA_PASSKEY) &&
    !isPlaceholder(process.env.MPESA_SHORTCODE) &&
    !isPlaceholder(process.env.MPESA_CALLBACK_URL)
  );
}

export function validateMpesaConfig(): void {
  if (isPlaceholder(process.env.MPESA_CONSUMER_KEY)) {
    throw new MpesaError(
      "CONFIG_MISSING",
      "M-Pesa Consumer Key is missing. Add MPESA_CONSUMER_KEY from developer.safaricom.co.ke"
    );
  }
  if (isPlaceholder(process.env.MPESA_CONSUMER_SECRET)) {
    throw new MpesaError(
      "CONFIG_MISSING",
      "M-Pesa Consumer Secret is missing. Add MPESA_CONSUMER_SECRET from your Daraja app"
    );
  }
  if (isPlaceholder(process.env.MPESA_PASSKEY)) {
    throw new MpesaError(
      "CONFIG_MISSING",
      "M-Pesa Passkey is missing. Copy the Lipa Na M-Pesa Online passkey from your Daraja app into MPESA_PASSKEY"
    );
  }
  if (isPlaceholder(process.env.MPESA_SHORTCODE)) {
    throw new MpesaError(
      "CONFIG_MISSING",
      "M-Pesa Shortcode is missing. Use 174379 for sandbox"
    );
  }
  if (isPlaceholder(process.env.MPESA_CALLBACK_URL)) {
    throw new MpesaError(
      "CONFIG_MISSING",
      "M-Pesa callback URL is missing. Use ngrok for local testing: https://YOUR-NGROK-URL/api/mpesa/callback"
    );
  }
}

function mapDarajaError(raw: string): MpesaError {
  let message = raw;

  try {
    const parsed = JSON.parse(raw);
    message =
      parsed.errorMessage ||
      parsed.error_description ||
      parsed.ResultDesc ||
      parsed.fault?.faultstring ||
      raw;
  } catch {
    // use raw text
  }

  const lower = message.toLowerCase();

  if (lower.includes("wrong credentials") || lower.includes("invalid credentials")) {
    return new MpesaError(
      "WRONG_CREDENTIALS",
      "M-Pesa rejected the request. Check MPESA_PASSKEY and MPESA_SHORTCODE in .env.local (sandbox: shortcode 174379 + passkey from Daraja portal).",
      message
    );
  }

  if (lower.includes("invalid access token") || lower.includes("access token")) {
    return new MpesaError(
      "AUTH_FAILED",
      "M-Pesa login failed. Check MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET.",
      message
    );
  }

  if (lower.includes("callback") || lower.includes("invalid call back")) {
    return new MpesaError(
      "CALLBACK_INVALID",
      "M-Pesa callback URL is invalid. Use a public HTTPS URL (ngrok) pointing to /api/mpesa/callback",
      message
    );
  }

  return new MpesaError("MPESA_ERROR", message, message);
}

export async function getMpesaAccessToken(): Promise<string> {
  validateMpesaConfig();

  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw mapDarajaError(text);
  }

  const data = JSON.parse(text);
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

function generatePassword(): string {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const str = shortcode + passkey + timestamp;
  return Buffer.from(str).toString("base64");
}

export interface StkPushParams {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export async function initiateStkPush(params: StkPushParams) {
  validateMpesaConfig();

  const token = await getMpesaAccessToken();
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);

  const shortcode = process.env.MPESA_SHORTCODE!;
  const isSandbox = process.env.MPESA_ENV !== "production";

  const body = {
    BusinessShortCode: shortcode,
    Password: generatePassword(),
    Timestamp: timestamp,
    TransactionType: isSandbox
      ? "CustomerPayBillOnline"
      : "CustomerPayBillOnline",
    Amount: Math.round(params.amount),
    PartyA: params.phone,
    PartyB: shortcode,
    PhoneNumber: params.phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: params.transactionDesc.slice(0, 13),
  };

  const res = await fetch(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw mapDarajaError(text);
  }

  const data = JSON.parse(text);

  // Daraja can return 200 with ResponseCode != 0
  if (data.ResponseCode && data.ResponseCode !== "0") {
    throw mapDarajaError(
      JSON.stringify({
        errorMessage: data.ResponseDescription || data.errorMessage,
      })
    );
  }

  return data;
}

export interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: string | number }>;
      };
    };
  };
}

export function parseMpesaCallback(body: MpesaCallbackBody) {
  const callback = body.Body.stkCallback;
  const metadata = callback.CallbackMetadata?.Item ?? [];

  const getValue = (name: string) =>
    metadata.find((item) => item.Name === name)?.Value;

  return {
    success: callback.ResultCode === 0,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
    merchantRequestId: callback.MerchantRequestID,
    checkoutRequestId: callback.CheckoutRequestID,
    amount: getValue("Amount") as number | undefined,
    mpesaReceiptNumber: getValue("MpesaReceiptNumber") as string | undefined,
    phoneNumber: getValue("PhoneNumber") as string | undefined,
    transactionDate: getValue("TransactionDate") as string | undefined,
  };
}
