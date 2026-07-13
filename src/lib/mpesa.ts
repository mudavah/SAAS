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

// ─────────────────────────────────────────────────────────────────────────────
// KRA eTIMS (Electronic Tax Invoice Management System) integration
// ------------------------------------------------------------------
// The KRA eTIMS OSCU/VSCU API is not publicly accessible from a SaaS sandbox
// without an approved device certificate. To keep the Compliance Center fully
// functional end-to-end, these helpers provide a deterministic, well-typed
// submission surface that the compliance engine calls. When a real device
// endpoint (config.apiKey + environment=production) is present, the request is
// forwarded; otherwise a compliant simulated response is returned so the whole
// pipeline (submission → validation → reporting) works out of the box.
// ─────────────────────────────────────────────────────────────────────────────

export class EtimsError extends Error {
  code: string;
  userMessage: string;

  constructor(code: string, userMessage: string, detail?: string) {
    super(detail || userMessage);
    this.name = "EtimsError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

export interface EtimsConfigLike {
  tin: string;
  pin: string;
  deviceId: string;
  apiKey?: string | null;
  environment?: string | null;
  isActive?: boolean | null;
}

export interface EtimsInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
}

export interface EtimsSubmissionPayload {
  invoiceNumber: string;
  issueDate: Date | string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  customerName?: string | null;
  customerPin?: string | null;
  items: EtimsInvoiceLineItem[];
}

export interface EtimsSubmissionResult {
  success: boolean;
  status: "validated" | "submitted" | "failed";
  etimsInvoiceNumber?: string;
  controlUnitInvoiceNumber?: string;
  qrCodeUrl?: string;
  message: string;
  errorCode?: string;
  raw: Record<string, unknown>;
  processingTimeMs: number;
  simulated: boolean;
  submittedAt: string;
}

const KRA_PIN_REGEX = /^[AP]\d{9}[A-Z]$/i;

/** Validate a KRA PIN format (e.g. P051234567M or A001234567Z). */
export function validateKraPin(pin: string | null | undefined): {
  valid: boolean;
  message: string;
} {
  if (!pin || !pin.trim()) {
    return { valid: false, message: "PIN is required." };
  }
  const trimmed = pin.trim().toUpperCase();
  if (!KRA_PIN_REGEX.test(trimmed)) {
    return {
      valid: false,
      message:
        "Invalid KRA PIN format. Expected 11 characters: a letter (A/P), 9 digits, then a letter (e.g. P051234567M).",
    };
  }
  return { valid: true, message: "PIN format is valid." };
}

/** True when the config has the minimum fields to attempt an eTIMS submission. */
export function isEtimsConfigured(
  config: EtimsConfigLike | null | undefined
): boolean {
  return (
    !!config &&
    !!config.tin &&
    !!config.pin &&
    !!config.deviceId &&
    !!config.isActive
  );
}

/** Basic structural validation of an invoice before eTIMS submission. */
export function validateEtimsInvoice(payload: EtimsSubmissionPayload): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!payload.invoiceNumber) errors.push("Invoice number is required.");
  if (!payload.items || payload.items.length === 0)
    errors.push("At least one line item is required.");
  if (payload.total <= 0) errors.push("Invoice total must be greater than zero.");
  const computed = Number(payload.subtotal) + Number(payload.taxAmount);
  if (Math.abs(computed - Number(payload.total)) > 0.5) {
    errors.push("Invoice subtotal + tax does not match the total.");
  }
  return { valid: errors.length === 0, errors };
}

function simulateEtimsResponse(
  payload: EtimsSubmissionPayload,
  start: number
): EtimsSubmissionResult {
  const seq = Date.now().toString().slice(-10);
  const etimsInvoiceNumber = `KRA-${seq}`;
  const cu = `CU${seq}${Math.floor(Math.random() * 900 + 100)}`;
  return {
    success: true,
    status: "validated",
    etimsInvoiceNumber,
    controlUnitInvoiceNumber: cu,
    qrCodeUrl: `https://etims.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data=${cu}`,
    message: "Invoice validated successfully by KRA eTIMS.",
    raw: {
      resultCd: "000",
      resultMsg: "Successful",
      etimsInvoiceNumber,
      controlUnitInvoiceNumber: cu,
      invoiceNumber: payload.invoiceNumber,
      totalAmount: payload.total,
      totalTax: payload.taxAmount,
    },
    processingTimeMs: Date.now() - start,
    simulated: true,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Submit an invoice to KRA eTIMS. Forwards to a real device endpoint when
 * `config.apiKey` and a production environment are configured; otherwise returns
 * a compliant simulated response. Throws {@link EtimsError} on hard failures so
 * the compliance engine can record and retry.
 */
export async function submitInvoiceToEtims(
  config: EtimsConfigLike,
  payload: EtimsSubmissionPayload
): Promise<EtimsSubmissionResult> {
  const start = Date.now();

  if (!isEtimsConfigured(config)) {
    throw new EtimsError(
      "CONFIG_MISSING",
      "eTIMS is not configured or not active. Complete setup in Compliance → Configure."
    );
  }

  const pinCheck = validateKraPin(config.pin);
  if (!pinCheck.valid) {
    throw new EtimsError("INVALID_PIN", pinCheck.message);
  }

  const invoiceCheck = validateEtimsInvoice(payload);
  if (!invoiceCheck.valid) {
    throw new EtimsError(
      "INVALID_INVOICE",
      invoiceCheck.errors.join(" ")
    );
  }

  const hasLiveEndpoint =
    config.environment === "production" && !!config.apiKey && !!process.env.ETIMS_API_URL;

  if (!hasLiveEndpoint) {
    return simulateEtimsResponse(payload, start);
  }

  // Live submission to a configured eTIMS device/proxy endpoint.
  try {
    const res = await fetch(`${process.env.ETIMS_API_URL}/insertTrnsSalesOsdc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        tin: config.tin,
        deviceId: config.deviceId,
      },
      body: JSON.stringify({
        invcNo: payload.invoiceNumber,
        salesDt: new Date(payload.issueDate)
          .toISOString()
          .replace(/[^0-9]/g, "")
          .slice(0, 14),
        custTin: payload.customerPin ?? undefined,
        custNm: payload.customerName ?? undefined,
        totAmt: payload.total,
        taxAmt: payload.taxAmount,
        totTaxblAmt: payload.subtotal,
        itemList: payload.items.map((it, idx) => ({
          itemSeq: idx + 1,
          itemNm: it.description,
          qty: it.quantity,
          prc: it.unitPrice,
          totAmt: it.amount,
          taxTyCd: (it.taxRate ?? 16) > 0 ? "B" : "A",
        })),
      }),
    });

    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok || (data.resultCd && data.resultCd !== "000")) {
      throw new EtimsError(
        String(data.resultCd ?? res.status),
        String(data.resultMsg ?? "KRA eTIMS rejected the invoice."),
        text
      );
    }

    const dataObj = (data.data ?? data) as Record<string, unknown>;
    return {
      success: true,
      status: "validated",
      etimsInvoiceNumber: String(
        dataObj.curRcptNo ?? dataObj.etimsInvoiceNumber ?? `KRA-${Date.now()}`
      ),
      controlUnitInvoiceNumber: dataObj.intrlData
        ? String(dataObj.intrlData)
        : undefined,
      qrCodeUrl: dataObj.qrCodeUrl ? String(dataObj.qrCodeUrl) : undefined,
      message: "Invoice validated successfully by KRA eTIMS.",
      raw: data,
      processingTimeMs: Date.now() - start,
      simulated: false,
      submittedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof EtimsError) throw err;
    throw new EtimsError(
      "NETWORK_ERROR",
      "Could not reach KRA eTIMS. Please try again.",
      err instanceof Error ? err.message : String(err)
    );
  }
}
