/**
 * KaziFlow — Integration Hub Catalog
 * ------------------------------------------------------------------
 * The marketplace is a static, in-code registry of every supported provider.
 * `provider` is stored as free text in the `integrations` table and validated
 * against this catalog, so new providers can be added here without a migration.
 *
 * Each entry declares its auth model, OAuth scopes, capabilities, and the
 * config/secret fields the connect form should render. Adapters (see
 * ./adapters) implement the actual connect/test/sync/send logic and degrade
 * gracefully when provider keys/secrets are not configured.
 */
import type { IntegrationCategory } from "@/db/schema";

export type AuthType = "oauth2" | "api_key" | "basic" | "credentials" | "none" | "webhook";

export interface CatalogField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select" | "boolean";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface CatalogEntry {
  id: string;
  category: IntegrationCategory;
  name: string;
  description: string;
  authType: AuthType;
  scopes: string[];
  capabilities: string[];
  configFields: CatalogField[];
  secretFields: CatalogField[];
  docsUrl: string;
  website: string;
  /** When true, the hub bridges to an existing engine instead of re-implementing it. */
  bridged?: boolean;
}

const OAUTH_REDIRECT_HELP =
  "KaziFlow redirects you to the provider to authorize access, then stores an encrypted token.";

export const CATALOG: CatalogEntry[] = [
  // ── Government ──────────────────────────────────────────────────────────────
  {
    id: "kra_etims",
    category: "government",
    name: "KRA eTIMS",
    description: "Connect to the KRA Electronic Tax Invoice Management System for compliant invoicing and VAT submission.",
    authType: "credentials",
    scopes: [],
    capabilities: ["invoice_submission", "vat_return", "credit_note", "status_check"],
    configFields: [
      { key: "env", label: "Environment", type: "select", required: true, options: [
        { value: "sandbox", label: "Sandbox" },
        { value: "production", label: "Production" },
      ] },
      { key: "tin", label: "Taxpayer TIN", type: "text", required: true, placeholder: "P0512..." },
      { key: "branchCode", label: "Branch Code", type: "text", placeholder: "00" },
    ],
    secretFields: [
      { key: "apiKey", label: "eTIMS API Key", type: "password", required: true },
      { key: "apiSecret", label: "eTIMS API Secret", type: "password", required: true },
      { key: "pin", label: "eTIMS PIN", type: "password" },
    ],
    docsUrl: "https://www.kra.go.ke/",
    website: "https://www.kra.go.ke/",
    bridged: true,
  },

  // ── Payment ─────────────────────────────────────────────────────────────────
  {
    id: "mpesa",
    category: "payment",
    name: "M-Pesa (Daraja)",
    description: "Accept Lipa Na M-Pesa payments via Safaricom's Daraja API for invoices and POS.",
    authType: "api_key",
    scopes: [],
    capabilities: ["stk_push", "b2c", "status_query", "webhook"],
    configFields: [
      { key: "shortcode", label: "Shortcode", type: "text", required: true, placeholder: "174379" },
      { key: "env", label: "Environment", type: "select", required: true, options: [
        { value: "sandbox", label: "Sandbox" },
        { value: "production", label: "Production" },
      ] },
      { key: "callbackUrl", label: "Callback URL", type: "url", placeholder: "https://.../api/integrations/webhooks/mpesa" },
    ],
    secretFields: [
      { key: "apiKey", label: "Consumer Key", type: "password", required: true },
      { key: "apiSecret", label: "Consumer Secret", type: "password", required: true },
      { key: "passkey", label: "Passkey", type: "password", required: true },
    ],
    docsUrl: "https://developer.safaricom.co.ke/",
    website: "https://www.safaricom.co.ke/",
    bridged: true,
  },
  {
    id: "pesapal",
    category: "payment",
    name: "Pesapal",
    description: "Process card, mobile money and bank payments across East Africa via Pesapal.",
    authType: "api_key",
    scopes: [],
    capabilities: ["payment_link", "status_query", "webhook", "refund"],
    configFields: [
      { key: "env", label: "Environment", type: "select", required: true, options: [
        { value: "sandbox", label: "Sandbox" },
        { value: "production", label: "Production" },
      ] },
      { key: "merchantId", label: "Merchant ID", type: "text", required: true },
      { key: "callbackUrl", label: "Callback URL", type: "url" },
    ],
    secretFields: [
      { key: "apiKey", label: "Consumer Key", type: "password", required: true },
      { key: "apiSecret", label: "Consumer Secret", type: "password", required: true },
    ],
    docsUrl: "https://developer.pesapal.com/",
    website: "https://pesapal.com/",
    bridged: true,
  },
  {
    id: "flutterwave",
    category: "payment",
    name: "Flutterwave",
    description: "Accept payments across Africa with Flutterwave's unified gateway.",
    authType: "api_key",
    scopes: [],
    capabilities: ["payment_link", "status_query", "webhook", "refund", "transfer"],
    configFields: [
      { key: "callbackUrl", label: "Callback URL", type: "url" },
    ],
    secretFields: [
      { key: "apiKey", label: "Secret Key", type: "password", required: true },
      { key: "apiSecret", label: "Encryption Key", type: "password" },
    ],
    docsUrl: "https://developer.flutterwave.com/",
    website: "https://flutterwave.com/",
    bridged: true,
  },
  {
    id: "stripe",
    category: "payment",
    name: "Stripe",
    description: "Global card and bank payments, subscriptions and invoicing via Stripe.",
    authType: "api_key",
    scopes: [],
    capabilities: ["payment_link", "subscription", "status_query", "webhook", "refund"],
    configFields: [
      { key: "callbackUrl", label: "Webhook URL", type: "url" },
    ],
    secretFields: [
      { key: "apiKey", label: "Secret Key", type: "password", required: true },
      { key: "webhookSecret", label: "Webhook Signing Secret", type: "password" },
    ],
    docsUrl: "https://stripe.com/docs",
    website: "https://stripe.com/",
    bridged: true,
  },

  // ── Email ───────────────────────────────────────────────────────────────────
  {
    id: "email",
    category: "email",
    name: "Email (Resend / SMTP)",
    description: "Send transactional email (invoices, quotes, notifications) via Resend or a compatible SMTP server.",
    authType: "api_key",
    scopes: [],
    capabilities: ["send_email", "templates"],
    configFields: [
      { key: "fromName", label: "From Name", type: "text", placeholder: "KaziFlow" },
      { key: "fromEmail", label: "From Email", type: "text", placeholder: "billing@yourdomain.com" },
      { key: "provider", label: "Email Provider", type: "select", required: true, options: [
        { value: "resend", label: "Resend" },
        { value: "smtp", label: "SMTP" },
      ] },
      { key: "host", label: "SMTP Host", type: "text", placeholder: "smtp.resend.com", help: "Only for SMTP" },
      { key: "port", label: "SMTP Port", type: "text", placeholder: "587", help: "Only for SMTP" },
    ],
    secretFields: [
      { key: "apiKey", label: "API Key (Resend) / Password (SMTP)", type: "password", required: true },
    ],
    docsUrl: "https://resend.com/docs",
    website: "https://resend.com/",
    bridged: true,
  },

  // ── SMS ─────────────────────────────────────────────────────────────────────
  {
    id: "sms",
    category: "sms",
    name: "SMS (Africa's Talking / Twilio)",
    description: "Send SMS reminders, OTPs and payment links via Africa's Talking or Twilio.",
    authType: "api_key",
    scopes: [],
    capabilities: ["send_sms"],
    configFields: [
      { key: "provider", label: "SMS Provider", type: "select", required: true, options: [
        { value: "africastalking", label: "Africa's Talking" },
        { value: "twilio", label: "Twilio" },
      ] },
      { key: "senderId", label: "Sender ID", type: "text", placeholder: "KAZIFLOW" },
    ],
    secretFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "apiSecret", label: "API Secret / Auth Token", type: "password", required: true },
    ],
    docsUrl: "https://developers.africastalking.com/",
    website: "https://africastalking.com/",
  },

  // ── WhatsApp ────────────────────────────────────────────────────────────────
  {
    id: "whatsapp",
    category: "whatsapp",
    name: "WhatsApp Cloud API",
    description: "Reach customers on WhatsApp with the Meta Cloud API for invoices and updates.",
    authType: "oauth2",
    scopes: ["whatsapp_business_messaging"],
    capabilities: ["send_message", "webhook"],
    configFields: [
      { key: "phoneNumberId", label: "Phone Number ID", type: "text", required: true },
      { key: "businessAccountId", label: "WhatsApp Business Account ID", type: "text" },
    ],
    secretFields: [
      { key: "apiKey", label: "Permanent Access Token", type: "password", required: true },
    ],
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    website: "https://www.whatsapp.com/business/",
  },

  // ── Push ────────────────────────────────────────────────────────────────────
  {
    id: "push",
    category: "push",
    name: "Push Notifications (Web Push / FCM)",
    description: "Send browser/device push notifications to your team and customers.",
    authType: "api_key",
    scopes: [],
    capabilities: ["send_push"],
    configFields: [
      { key: "provider", label: "Push Provider", type: "select", required: true, options: [
        { value: "webpush", label: "Web Push (VAPID)" },
        { value: "fcm", label: "Firebase Cloud Messaging" },
      ] },
      { key: "vapidSubject", label: "VAPID Subject", type: "text", placeholder: "mailto:admin@yourdomain.com", help: "Web Push only" },
    ],
    secretFields: [
      { key: "apiKey", label: "VAPID Private Key / FCM Server Key", type: "password", required: true },
    ],
    docsUrl: "https://developer.mozilla.org/docs/Web/API/Push_API",
    website: "https://web.dev/push-notifications",
  },

  // ── Calendar ────────────────────────────────────────────────────────────────
  {
    id: "google_calendar",
    category: "calendar",
    name: "Google Calendar",
    description: "Sync meetings, follow-ups and reminders to Google Calendar.",
    authType: "oauth2",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    capabilities: ["create_event", "read_events", "webhook"],
    configFields: [],
    secretFields: [],
    docsUrl: "https://developers.google.com/calendar",
    website: "https://calendar.google.com/",
  },
  {
    id: "outlook_calendar",
    category: "calendar",
    name: "Outlook Calendar",
    description: "Sync meetings and reminders to Microsoft Outlook Calendar.",
    authType: "oauth2",
    scopes: ["Calendars.ReadWrite"],
    capabilities: ["create_event", "read_events", "webhook"],
    configFields: [],
    secretFields: [],
    docsUrl: "https://learn.microsoft.com/graph/calendar-concept-overview",
    website: "https://outlook.com/",
  },

  // ── Accounting ──────────────────────────────────────────────────────────────
  {
    id: "quickbooks",
    category: "accounting",
    name: "QuickBooks Online",
    description: "Sync invoices, expenses and payments with QuickBooks Online.",
    authType: "oauth2",
    scopes: ["com.intuit.quickbooks.accounting"],
    capabilities: ["push_invoice", "push_expense", "pull_accounts", "webhook"],
    configFields: [
      { key: "companyId", label: "Company ID (Realm ID)", type: "text" },
    ],
    secretFields: [],
    docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/get-started",
    website: "https://quickbooks.intuit.com/",
  },
  {
    id: "xero",
    category: "accounting",
    name: "Xero",
    description: "Sync invoices, bills and contacts with Xero accounting.",
    authType: "oauth2",
    scopes: ["accounting.transactions", "accounting.contacts"],
    capabilities: ["push_invoice", "push_bill", "pull_accounts", "webhook"],
    configFields: [],
    secretFields: [],
    docsUrl: "https://developer.xero.com/documentation/",
    website: "https://www.xero.com/",
  },

  // ── Storage ──────────────────────────────────────────────────────────────────
  {
    id: "google_drive",
    category: "storage",
    name: "Google Drive",
    description: "Store and share documents (invoices, statements) in Google Drive.",
    authType: "oauth2",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    capabilities: ["upload", "download", "share"],
    configFields: [],
    secretFields: [],
    docsUrl: "https://developers.google.com/drive",
    website: "https://drive.google.com/",
  },
  {
    id: "onedrive",
    category: "storage",
    name: "OneDrive",
    description: "Back up and share business documents with Microsoft OneDrive.",
    authType: "oauth2",
    scopes: ["Files.ReadWrite"],
    capabilities: ["upload", "download", "share"],
    configFields: [],
    secretFields: [],
    docsUrl: "https://learn.microsoft.com/graph/onedrive-concept-overview",
    website: "https://onedrive.com/",
  },
  {
    id: "dropbox",
    category: "storage",
    name: "Dropbox",
    description: "Store and share documents in Dropbox.",
    authType: "oauth2",
    scopes: ["files.content.write", "files.metadata.read"],
    capabilities: ["upload", "download", "share"],
    configFields: [],
    secretFields: [],
    docsUrl: "https://www.dropbox.com/developers/documentation",
    website: "https://dropbox.com/",
  },

  // ── Hardware ────────────────────────────────────────────────────────────────
  {
    id: "barcode_scanner",
    category: "hardware",
    name: "Barcode & QR Scanner",
    description: "Use USB/serial barcode and QR scanners for fast POS and inventory lookups (client-side device).",
    authType: "none",
    scopes: [],
    capabilities: ["scan_lookup", "serial_capture"],
    configFields: [
      { key: "mode", label: "Capture Mode", type: "select", required: true, options: [
        { value: "keyboard_wedge", label: "Keyboard Wedge" },
        { value: "serial", label: "Serial / USB" },
      ] },
      { key: "prefix", label: "Prefix", type: "text", placeholder: "Optional scanner prefix" },
    ],
    secretFields: [],
    docsUrl: "https://developer.mozilla.org/docs/Web/API/Web_Serial_API",
    website: "https://developer.mozilla.org/",
  },
  {
    id: "thermal_printer",
    category: "hardware",
    name: "Thermal Receipt Printer",
    description: "Print ESC/POS receipts to networked or USB thermal printers from POS and billing.",
    authType: "none",
    scopes: [],
    capabilities: ["print_receipt", "print_test"],
    configFields: [
      { key: "connection", label: "Connection", type: "select", required: true, options: [
        { value: "browser", label: "Browser (WebUSB/WebPrint)" },
        { value: "network", label: "Network (IP)" },
        { value: "usb", label: "USB" },
      ] },
      { key: "printerIp", label: "Printer IP", type: "text", placeholder: "192.168.1.100", help: "Network mode" },
      { key: "vendorId", label: "Vendor ID", type: "text", placeholder: "04b8", help: "USB mode" },
    ],
    secretFields: [],
    docsUrl: "https://github.com/grandcentrix/ESC-POS",
    website: "https://www.epson.com/",
  },
];

export const CATALOG_MAP: Record<string, CatalogEntry> = Object.fromEntries(
  CATALOG.map((c) => [c.id, c])
);

export function getCatalogEntry(provider: string): CatalogEntry | undefined {
  return CATALOG_MAP[provider];
}

export function isKnownProvider(provider: string): boolean {
  return provider in CATALOG_MAP;
}

export const CATEGORIES: { value: IntegrationCategory; label: string }[] = [
  { value: "government", label: "Government" },
  { value: "payment", label: "Payments" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "push", label: "Push" },
  { value: "calendar", label: "Calendar" },
  { value: "accounting", label: "Accounting" },
  { value: "storage", label: "Storage" },
  { value: "hardware", label: "Hardware" },
];
