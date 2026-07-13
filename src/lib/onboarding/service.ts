/**
 * KaziFlow — guided onboarding service
 * ------------------------------------------------------------------
 * Server-only helpers that read/write onboarding state and apply each step's
 * data to the relevant business tables. Kept centralized so every wizard page
 * funnels through POST /api/onboarding/progress and the same persistence logic.
 */
import { db } from "@/db";
import {
  onboardingSteps,
  onboardingProgress,
  onboardingTips,
  organizations,
  businesses,
  clients,
  inventoryProducts,
  invoices,
  invoiceItems,
  etimsConfig,
  paymentProviderConfigs,
  organizationMembers,
  users,
} from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { ONBOARDING_STEPS, type OnboardingStepKey } from "./steps";
import { generateInvoiceNumber } from "@/lib/utils";
import type { ServerContext } from "@/lib/session";

export interface OnboardingStepDTO {
  id: string;
  key: string;
  title: string;
  description: string;
  route: string;
  order: number;
  required: boolean;
}

export interface OnboardingProgressDTO {
  stepId: string;
  status: "pending" | "completed" | "skipped";
  completedAt: string | null;
  metadata: Record<string, unknown>;
}

export type StepStatus = "pending" | "completed" | "skipped";

function toStepDTO(row: typeof onboardingSteps.$inferSelect): OnboardingStepDTO {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description,
    route: row.route,
    order: row.order,
    required: row.required,
  };
}

/** Return the seeded steps in order, seeding defaults on first access. */
export async function ensureOnboardingSteps(): Promise<OnboardingStepDTO[]> {
  const existing = await db
    .select()
    .from(onboardingSteps)
    .orderBy(asc(onboardingSteps.order));

  if (existing.length > 0) return existing.map(toStepDTO);

  await db.insert(onboardingSteps).values(
    ONBOARDING_STEPS.map((s, i) => ({
      key: s.key,
      title: s.title,
      description: s.description,
      route: s.route,
      order: i + 1,
      required: s.required,
    }))
  );

  const created = await db
    .select()
    .from(onboardingSteps)
    .orderBy(asc(onboardingSteps.order));
  return created.map(toStepDTO);
}

export async function getOnboardingProgress(
  ctx: ServerContext
): Promise<OnboardingProgressDTO[]> {
  const rows = await db
    .select()
    .from(onboardingProgress)
    .where(
      and(
        eq(onboardingProgress.organizationId, ctx.organizationId),
        eq(onboardingProgress.userId, ctx.userId!)
      )
    );

  return rows.map((r) => ({
    stepId: r.stepId,
    status: r.status,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));
}

async function resolveStep(
  steps: OnboardingStepDTO[],
  stepKey: string
): Promise<OnboardingStepDTO> {
  const step = steps.find((s) => s.key === stepKey);
  if (!step || !step.id) {
    throw new Error(`Unknown onboarding step: ${stepKey}`);
  }
  return step;
}

/**
 * Persist the data collected for a given step into the appropriate business
 * table. Intentionally idempotent (upserts) so re-running a step is safe.
 */
export async function applyStepData(
  ctx: ServerContext,
  stepKey: OnboardingStepKey,
  data: Record<string, any>
): Promise<void> {
  switch (stepKey) {
    case "organization": {
      const name = String(data.name ?? "").trim();
      if (name) {
        await db
          .update(organizations)
          .set({ name, updatedAt: new Date() })
          .where(eq(organizations.id, ctx.organizationId));
      }
      return;
    }

    case "business-details": {
      const name = String(data.name ?? "").trim();
      if (!name) return;
      const orgName = String(data.name ?? "").trim();
      await db
        .insert(businesses)
        .values({
          userId: ctx.userId!,
          organizationId: ctx.organizationId,
          name,
          type: data.type ? String(data.type) : null,
          email: data.email ? String(data.email) : null,
          phone: data.phone ? String(data.phone) : null,
          address: data.address ? String(data.address) : null,
          city: data.city ? String(data.city) : "Nairobi",
          currency: data.currency ? String(data.currency) : "KES",
        })
        .onConflictDoUpdate({
          target: businesses.userId,
          set: {
            name,
            type: data.type ? String(data.type) : null,
            email: data.email ? String(data.email) : null,
            phone: data.phone ? String(data.phone) : null,
            address: data.address ? String(data.address) : null,
            city: data.city ? String(data.city) : "Nairobi",
            currency: data.currency ? String(data.currency) : "KES",
            updatedAt: new Date(),
          },
        });
      // Keep the organization name in sync with the business name.
      await db
        .update(organizations)
        .set({ name: orgName, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId));
      return;
    }

    case "tax-config": {
      const pin = data.pin ? String(data.pin) : null;
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, ctx.organizationId),
        columns: { settings: true },
      });
      const settings = {
        ...((org?.settings as Record<string, unknown>) ?? {}),
        tax: {
          vatRegistered: Boolean(data.vatRegistered),
          regime: data.taxRegime ? String(data.taxRegime) : "vat",
        },
      };
      await db
        .update(organizations)
        .set({ settings, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId));
      if (pin) {
        await db
          .update(businesses)
          .set({ taxId: pin, updatedAt: new Date() })
          .where(eq(businesses.userId, ctx.userId!));
      }
      return;
    }

    case "etims": {
      const tin = String(data.tin ?? "");
      const pin = String(data.pin ?? "");
      const deviceId = String(data.deviceId ?? "");
      const environment = data.environment === "production" ? "production" : "sandbox";
      if (!tin || !pin || !deviceId) return;
      await db
        .insert(etimsConfig)
        .values({
          userId: ctx.userId!,
          organizationId: ctx.organizationId,
          tin,
          pin,
          deviceId,
          environment,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: etimsConfig.userId,
          set: { tin, pin, deviceId, environment, isActive: true, updatedAt: new Date() },
        });
      return;
    }

    case "payments": {
      const shortcode = data.shortcode ? String(data.shortcode) : null;
      const environment =
        data.environment === "production" ? "production" : "sandbox";
      await db
        .insert(paymentProviderConfigs)
        .values({
          organizationId: ctx.organizationId,
          provider: "mpesa",
          enabled: true,
          isDefault: true,
          shortcode,
          environment,
          settings: {
            paybill: data.paybill ? String(data.paybill) : null,
            till: data.till ? String(data.till) : null,
          },
        })
        .onConflictDoUpdate({
          target: [
            paymentProviderConfigs.organizationId,
            paymentProviderConfigs.provider,
          ],
          set: {
            enabled: true,
            isDefault: true,
            shortcode,
            environment,
            settings: {
              paybill: data.paybill ? String(data.paybill) : null,
              till: data.till ? String(data.till) : null,
            },
            updatedAt: new Date(),
          },
        });
      return;
    }

    case "customers": {
      const list: any[] = Array.isArray(data.customers) ? data.customers : [];
      const valid = list
        .filter((c) => c && String(c.name ?? "").trim())
        .map((c) => ({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          name: String(c.name).trim(),
          email: c.email ? String(c.email) : null,
          phone: c.phone ? String(c.phone) : null,
          company: c.company ? String(c.company) : null,
        }));
      if (valid.length) {
        await db.insert(clients).values(valid);
      }
      return;
    }

    case "products": {
      const list: any[] = Array.isArray(data.products) ? data.products : [];
      const valid = list
        .filter((p) => p && String(p.name ?? "").trim())
        .map((p) => ({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          name: String(p.name).trim(),
          description: p.description ? String(p.description) : null,
          sellingPrice: String(p.sellingPrice ?? "0"),
          costPrice: String(p.costPrice ?? "0"),
          unit: p.unit ? String(p.unit) : "pcs",
        }));
      if (valid.length) {
        await db.insert(inventoryProducts).values(valid);
      }
      return;
    }

    case "invoice": {
      const items: any[] = Array.isArray(data.items) ? data.items : [];
      if (!items.length) return;
      const subtotal = items.reduce(
        (sum, it) =>
          sum + Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0),
        0
      );
      const taxRate = Number(data.taxRate ?? 16);
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + taxAmount;
      const currency = data.currency ? String(data.currency) : "KES";
      const [invoice] = await db
        .insert(invoices)
        .values({
          userId: ctx.userId!,
          organizationId: ctx.organizationId,
          clientId: data.clientId ? String(data.clientId) : null,
          invoiceNumber: generateInvoiceNumber("INV"),
          status: "draft",
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate: data.dueDate
            ? new Date(data.dueDate)
            : new Date(Date.now() + 14 * 86400000),
          currency,
          subtotal: subtotal.toFixed(2),
          taxRate: String(taxRate),
          taxAmount: taxAmount.toFixed(2),
          total: total.toFixed(2),
          notes: data.notes ? String(data.notes) : null,
        })
        .returning();
      await db.insert(invoiceItems).values(
        items.map((it, i) => ({
          invoiceId: invoice.id,
          description: String(it.description ?? ""),
          quantity: String(it.quantity ?? "1"),
          unitPrice: String(it.unitPrice ?? "0"),
          amount: (Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0)).toFixed(2),
          sortOrder: i,
        }))
      );
      return;
    }

    case "team": {
      const invites: any[] = Array.isArray(data.invites) ? data.invites : [];
      const valid = invites
        .filter((m) => m && String(m.email ?? "").trim())
        .map((m) => ({
          organizationId: ctx.organizationId,
          email: String(m.email).trim(),
          roleType: (m.roleType as any) ?? "employee",
          status: "invited" as const,
        }));
      if (valid.length) {
        await db.insert(organizationMembers).values(valid);
      }
      return;
    }

    case "welcome":
    case "complete":
    default:
      return;
  }
}

export interface RecordStepResult {
  status: StepStatus;
  completedRequired: boolean;
  progress: OnboardingProgressDTO[];
}

/** Upsert a step's progress and finalize onboarding when all required done. */
export async function recordStepProgress(
  ctx: ServerContext,
  stepKey: string,
  status: StepStatus,
  data?: Record<string, any>
): Promise<RecordStepResult> {
  const steps = await ensureOnboardingSteps();
  const step = await resolveStep(steps, stepKey);

  if (data && status === "completed") {
    await applyStepData(ctx, stepKey as OnboardingStepKey, data);
  }

  await db
    .insert(onboardingProgress)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      stepId: step.id,
      status,
      completedAt:
        status === "completed" || status === "skipped" ? new Date() : null,
      metadata: data ?? {},
    })
    .onConflictDoUpdate({
      target: [onboardingProgress.userId, onboardingProgress.stepId],
      set: {
        status,
        completedAt:
          status === "completed" || status === "skipped" ? new Date() : null,
        metadata: data ?? {},
      },
    });

  const progress = await getOnboardingProgress(ctx);
  const statusByStep = new Map(progress.map((p) => [p.stepId, p.status]));

  const requiredDone = steps
    .filter((s) => s.required)
    .every((s) => {
      const st = statusByStep.get(s.id);
      return st === "completed" || st === "skipped";
    });

  if (requiredDone && ctx.userId) {
    await db
      .update(users)
      .set({ onboardingComplete: true, updatedAt: new Date() })
      .where(eq(users.id, ctx.userId));
  }

  return { status, completedRequired: requiredDone, progress };
}

export async function getOnboardingTips(
  ctx: ServerContext,
  stepKey?: string | null
): Promise<{ title: string; content: string; position: string }[]> {
  if (!stepKey) return [];
  const steps = await ensureOnboardingSteps();
  const step = steps.find((s) => s.key === stepKey);
  if (!step?.id) return [];

  const rows = await db
    .select()
    .from(onboardingTips)
    .where(eq(onboardingTips.stepId, step.id))
    .orderBy(asc(onboardingTips.order));

  if (rows.length > 0) {
    return rows.map((r) => ({
      title: r.title,
      content: r.content,
      position: r.position,
    }));
  }

  // Fall back to sensible built-in tips so the UI is never empty.
  return DEFAULT_TIPS[stepKey as OnboardingStepKey] ?? [];
}

const DEFAULT_TIPS: Partial<
  Record<OnboardingStepKey, { title: string; content: string; position: string }[]>
> = {
  "tax-config": [
    {
      title: "Where to find your KRA PIN",
      content:
        "Your KRA PIN is an 11-digit number on your tax compliance certificate, available on the iTax portal.",
      position: "bottom",
    },
    {
      title: "VAT registered?",
      content:
        "Only enable VAT if your business is VAT registered with KRA; this affects how tax is calculated on invoices.",
      position: "bottom",
    },
  ],
  etims: [
    {
      title: "eTIMS device ID",
      content:
        "The device ID is issued by KRA when you register a branch/cashbox on the eTIMS portal.",
      position: "bottom",
    },
  ],
  payments: [
    {
      title: "M-Pesa shortcode",
      content:
        "Use your Paybill or Till number. In sandbox you can use test credentials from the Safaricom portal.",
      position: "bottom",
    },
  ],
  invoice: [
    {
      title: "Invoice numbers",
      content:
        "KaziFlow auto-generates a unique invoice number per organization. You can change it later.",
      position: "bottom",
    },
  ],
  team: [
    {
      title: "Roles & permissions",
      content:
        "Invited members get an email link. Assign Owner only to people who should manage billing and the organization.",
      position: "bottom",
    },
  ],
};

// Re-export so callers don't need a separate import for the enum union.
export type { OnboardingStepKey };
