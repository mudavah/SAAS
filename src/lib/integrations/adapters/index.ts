/**
 * KaziFlow Integration Hub — adapter registry.
 * ------------------------------------------------------------------
 * Re-exports every provider adapter grouped by category and exposes a flat
 * lookup map. Every adapter degrades gracefully offline (see ./types): when a
 * provider's secrets or environment variables are absent it returns a
 * "degraded"/"failed" result instead of throwing.
 */
import { type IntegrationAdapter } from "./types";

// Existing adapters (bridged to engines already in the codebase).
import { etimsAdapter } from "./government";
import {
  mpesaAdapter,
  pesapalAdapter,
  flutterwaveAdapter,
  stripeAdapter,
} from "./payments";
import { emailAdapter } from "./email";
import { smsAdapter } from "./sms";
import { whatsappAdapter } from "./whatsapp";
import { pushAdapter } from "./push";

// Newly added adapters — one file per provider.
import { googleCalendarAdapter } from "./calendar/google";
import { outlookCalendarAdapter } from "./calendar/outlook";
import { quickbooksAdapter } from "./accounting/quickbooks";
import { xeroAdapter } from "./accounting/xero";
import { googleDriveAdapter } from "./storage/googledrive";
import { onedriveAdapter } from "./storage/onedrive";
import { dropboxAdapter } from "./storage/dropbox";
import { barcodeScannerAdapter } from "./hardware/barcode";
import { thermalPrinterAdapter } from "./hardware/printer";

/** All adapters grouped by category. */
export const ADAPTERS: Record<string, Record<string, IntegrationAdapter>> = {
  government: { etims: etimsAdapter },
  payments: {
    mpesa: mpesaAdapter,
    pesapal: pesapalAdapter,
    flutterwave: flutterwaveAdapter,
    stripe: stripeAdapter,
  },
  email: { email: emailAdapter },
  sms: { sms: smsAdapter },
  whatsapp: { whatsapp: whatsappAdapter },
  push: { push: pushAdapter },
  calendar: {
    google_calendar: googleCalendarAdapter,
    outlook_calendar: outlookCalendarAdapter,
  },
  accounting: { quickbooks: quickbooksAdapter, xero: xeroAdapter },
  storage: {
    google_drive: googleDriveAdapter,
    onedrive: onedriveAdapter,
    dropbox: dropboxAdapter,
  },
  hardware: {
    barcode_scanner: barcodeScannerAdapter,
    thermal_printer: thermalPrinterAdapter,
  },
};

/** Flat provider-key -> adapter map. */
export const ADAPTERS_MAP: Record<string, IntegrationAdapter> = (() => {
  const flat: Record<string, IntegrationAdapter> = {};
  for (const group of Object.values(ADAPTERS)) {
    for (const [key, adapter] of Object.entries(group)) {
      flat[key] = adapter;
    }
  }
  return flat;
})();

/** Resolve an adapter by its provider key (e.g. "mpesa", "google_drive"). */
export function getAdapter(provider: string): IntegrationAdapter | undefined {
  return ADAPTERS_MAP[provider];
}
