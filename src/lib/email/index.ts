import { Resend } from "resend";
import {
  invoiceEmailHtml,
  passwordResetEmailHtml,
} from "./templates";

function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  return value.includes("...") || value.trim() === "";
}

export function isEmailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!(key && key.startsWith("re_") && !isPlaceholder(key));
}

export function getEmailFrom(): string {
  // Resend test sender — works without domain verification (testing only)
  const testFrom = "KaziFlow <onboarding@resend.dev>";

  const configured = process.env.EMAIL_FROM?.trim();
  if (!configured || configured.includes("kaziflow.co.ke")) {
    // Default placeholder domain — use Resend test address until user verifies their domain
    return testFrom;
  }

  return configured;
}

function getResendClient(): Resend {
  if (!isEmailConfigured()) {
    throw new Error(
      "Email is not configured. Add RESEND_API_KEY to .env.local (get one free at resend.com)"
    );
  }
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendInvoiceEmail({
  to,
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  businessName,
  mpesaTill,
  mpesaPaybill,
  notes,
  pdfBuffer,
}: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  businessName: string;
  mpesaTill?: string | null;
  mpesaPaybill?: string | null;
  notes?: string | null;
  pdfBuffer: Buffer;
}) {
  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: getEmailFrom(),
    to: [to],
    subject: `Invoice ${invoiceNumber} from ${businessName}`,
    html: invoiceEmailHtml({
      clientName,
      invoiceNumber,
      amount,
      dueDate,
      businessName,
      mpesaTill,
      mpesaPaybill,
      notes,
    }),
    attachments: [
      {
        filename: `${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, id: data?.id };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: [to],
    subject: "Reset your KaziFlow password",
    html: passwordResetEmailHtml(resetUrl),
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}
