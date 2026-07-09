function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#006B3F;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;">KaziFlow</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#71717a;">Sent via KaziFlow — business tools for Kenya</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function invoiceEmailHtml({
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  businessName,
  mpesaTill,
  mpesaPaybill,
  notes,
}: {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  businessName: string;
  mpesaTill?: string | null;
  mpesaPaybill?: string | null;
  notes?: string | null;
}) {
  const paymentLines: string[] = [];
  if (mpesaTill) paymentLines.push(`M-Pesa Till: <strong>${escapeHtml(mpesaTill)}</strong>`);
  if (mpesaPaybill) paymentLines.push(`M-Pesa Paybill: <strong>${escapeHtml(mpesaPaybill)}</strong>`);

  return layout(`
    <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Invoice from ${escapeHtml(businessName)}</h1>
    <p style="margin:0 0 24px;color:#71717a;font-size:15px;">Hi ${escapeHtml(clientName)}, please find your invoice attached as a PDF.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#fafafa;">
        <td style="padding:12px 16px;font-size:13px;color:#71717a;border-bottom:1px solid #e4e4e7;">Invoice #</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#18181b;border-bottom:1px solid #e4e4e7;text-align:right;">${escapeHtml(invoiceNumber)}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;border-bottom:1px solid #e4e4e7;">Amount due</td>
        <td style="padding:12px 16px;font-size:18px;font-weight:700;color:#006B3F;border-bottom:1px solid #e4e4e7;text-align:right;">${escapeHtml(amount)}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;">Due date</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${escapeHtml(dueDate)}</td>
      </tr>
    </table>

    ${paymentLines.length > 0 ? `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">Pay via M-Pesa:<br/>${paymentLines.join("<br/>")}</p>` : `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">Contact ${escapeHtml(businessName)} for payment options.</p>`}

    ${notes ? `<p style="margin:0 0 16px;font-size:14px;color:#71717a;"><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ""}

    <p style="margin:0;font-size:14px;color:#3f3f46;">Asante,<br/><strong>${escapeHtml(businessName)}</strong></p>
  `);
}

export function passwordResetEmailHtml(resetUrl: string) {
  return layout(`
    <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Reset your password</h1>
    <p style="margin:0 0 24px;color:#71717a;font-size:15px;">Click the button below to reset your KaziFlow password. This link expires in 1 hour.</p>
    <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:14px 28px;background:#006B3F;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Reset Password</a>
    <p style="margin:24px 0 0;font-size:13px;color:#71717a;">If you didn't request this, you can safely ignore this email.</p>
  `);
}
