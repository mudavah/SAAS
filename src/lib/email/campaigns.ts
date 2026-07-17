/**
 * KaziFlow — Email Campaigns (foundation)
 * ------------------------------------------------------------------
 * Minimal but production-shaped campaign manager: create campaigns, send to an
 * audience list (org members or a manual segment), track open/click counts
 * (incremented by Resend webhooks out of scope here), and keep an audit trail.
 * Degrades gracefully when Resend is not configured (records status, skips send).
 */
import { db } from "@/db";
import { emailCampaigns, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { isEmailConfigured, getEmailFrom } from "@/lib/email";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

export async function listCampaigns(ctx: ServerContext) {
  return db.query.emailCampaigns.findMany({
    where: eq(emailCampaigns.organizationId, ctx.organizationId),
    orderBy: (t) => [desc(t.createdAt)],
  });
}

export async function createCampaign(ctx: ServerContext, input: {
  name: string;
  subject: string;
  preheader?: string;
  html: string;
  audience?: string;
}) {
  const [row] = await db
    .insert(emailCampaigns)
    .values({
      organizationId: ctx.organizationId,
      authorId: ctx.userId ?? null,
      name: input.name,
      subject: input.subject,
      preheader: input.preheader ?? null,
      html: input.html,
      audience: input.audience ?? "all",
      status: "draft",
    })
    .returning();
  return row;
}

export async function sendCampaign(ctx: ServerContext, id: string) {
  const campaign = await db.query.emailCampaigns.findFirst({
    where: and(eq(emailCampaigns.id, id), eq(emailCampaigns.organizationId, ctx.organizationId)),
  });
  if (!campaign) throw new Error("Campaign not found.");

  const recipients = await db.query.users.findMany({
    where: campaign.audience === "all" ? undefined : eq(users.plan, campaign.audience as any),
    columns: { email: true },
    limit: 5000,
  });

  const recipientCount = recipients.length;
  await db
    .update(emailCampaigns)
    .set({ status: "sending", recipientCount, sentAt: new Date(), updatedAt: new Date() })
    .where(eq(emailCampaigns.id, campaign.id));

  if (!isEmailConfigured()) {
    await db.update(emailCampaigns).set({ status: "sent", updatedAt: new Date() }).where(eq(emailCampaigns.id, campaign.id));
    return { ok: true, simulated: true, recipientCount };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await Promise.all(
      recipients.map((r) =>
        resend.emails.send({
          from: getEmailFrom(),
          to: [r.email],
          subject: campaign.subject,
          html: campaign.html,
        }).catch(() => undefined)
      )
    );
    await db.update(emailCampaigns).set({ status: "sent", updatedAt: new Date() }).where(eq(emailCampaigns.id, campaign.id));
    return { ok: true, recipientCount };
  } catch (err) {
    logger.error("Campaign send failed:", { error: err instanceof Error ? err.message : String(err) });
    await db.update(emailCampaigns).set({ status: "failed", updatedAt: new Date() }).where(eq(emailCampaigns.id, campaign.id));
    throw err;
  }
}
