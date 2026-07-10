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

export async function sendInviteEmail({
  to,
  orgName,
  inviterName,
  role,
}: {
  to: string;
  orgName: string;
  inviterName?: string | null;
  role: string;
}): Promise<{ success: boolean }> {
  if (!isEmailConfigured()) return { success: false };
  try {
    const resend = getResendClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: [to],
      subject: `You've been invited to ${orgName} on KaziFlow`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#16a34a">Join ${orgName}</h2>
          <p style="color:#334155;font-size:15px">
            ${inviterName ? `${inviterName} has` : "You have been"} invited you to collaborate on
            <strong>${orgName}</strong> as <strong>${role}</strong>.
          </p>
          <a href="${appUrl}/signup" style="display:inline-block;margin-top:12px;background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Create your account</a>
        </div>`,
    });
    if (error) {
      console.error("Invite email failed:", error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error("Invite email error:", err);
    return { success: false };
  }
}
export async function sendNotificationEmail({
  to,
  title,
  message,
  category,
  deepLink,
  orgName,
}: {
  to: string;
  title: string;
  message: string;
  category: string;
  deepLink?: string | null;
  orgName?: string;
}): Promise<{ success: boolean }> {
  if (!isEmailConfigured()) return { success: false };

  try {
    const resend = getResendClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = deepLink ? `${appUrl}${deepLink}` : appUrl;
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: [to],
      subject: `[${orgName || "KaziFlow"}] ${title}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#16a34a">${title}</h2>
          <p style="color:#334155;font-size:15px">${message}</p>
          <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">${category}</p>
          <a href="${link}" style="display:inline-block;margin-top:12px;background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Open in KaziFlow</a>
        </div>`,
    });
    if (error) {
      console.error("Notification email failed:", error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error("Notification email error:", err);
    return { success: false };
  }
}
