/**
 * KaziFlow — AI-generated documents
 * ------------------------------------------------------------------
 * Generates draft invoices, quotations and purchase orders from a context
 * (client/company/supplier + optional hints), stores them in `ai_documents`
 * for human review, then commits an approved draft into a real record. All
 * org-scoped; no cross-tenant leakage.
 */
import { db } from "@/db";
import {
  aiDocuments,
  invoices,
  invoiceItems,
  crmQuotations,
  crmQuotationItems,
  inventoryPurchaseOrders,
  inventoryPurchaseOrderItems,
  inventoryProducts,
  inventoryStock,
  clients,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { generateInvoiceNumber } from "@/lib/utils";
import { emitTimelineEvent } from "@/lib/timeline";
import { logAuditSafe } from "@/lib/audit";
import { callOpenAI } from "./copilot";

export interface DocumentContext {
  clientId?: string;
  companyId?: string;
  supplierId?: string;
  hint?: string;
  items?: { description: string; quantity: number; unitPrice: number }[];
  taxRate?: number;
}

function genNumber(prefix: string): string {
  return `${prefix}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function computeTotals(items: { quantity: number; unitPrice: number }[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  return { subtotal: Math.round(subtotal * 100) / 100, taxAmount: Math.round(taxAmount * 100) / 100, total: Math.round((subtotal + taxAmount) * 100) / 100 };
}

async function buildItems(orgId: string, ctx: DocumentContext): Promise<{ description: string; quantity: number; unitPrice: number }[]> {
  if (ctx.items && ctx.items.length) return ctx.items;

  // Inherit line items from the client's most recent invoice when generating
  // a repeat invoice/quotation.
  if (ctx.clientId) {
    const recent = await db.query.invoices.findFirst({
      where: and(eq(invoices.organizationId, orgId), eq(invoices.clientId, ctx.clientId)),
      with: { items: true },
      orderBy: (i: any) => [/* newest */],
    });
    if (recent?.items?.length) {
      return recent.items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      }));
    }
  }

  // For purchase orders, suggest reordering low-stock products.
  if (ctx.supplierId) {
    const low = await db.query.inventoryStock.findMany({
      where: eq(inventoryStock.organizationId, orgId),
      with: { product: true },
      limit: 10,
    });
    const suggested = low
      .filter((s) => {
        const p = s.product as { reorderPoint?: number | null } | null;
        return Number(s.quantity) <= Number(p?.reorderPoint ?? 0);
      })
      .slice(0, 5);
    if (suggested.length) {
      return suggested.map((s) => {
        const p = s.product as { name?: string; reorderPoint?: number | null; costPrice?: string | number | null } | null;
        return {
          description: p?.name ?? "Item",
          quantity: Math.max(1, Number(p?.reorderPoint ?? 1) - Number(s.quantity)),
          unitPrice: Number(p?.costPrice ?? 0),
        };
      });
    }
  }

  return [];
}

export async function generateAiDocument(
  ctx: ServerContext,
  documentType: "invoice" | "quotation" | "purchase_order",
  input: DocumentContext
): Promise<typeof aiDocuments.$inferSelect> {
  const items = await buildItems(ctx.organizationId, input);
  const taxRate = input.taxRate ?? 16;
  const { subtotal, taxAmount, total } = computeTotals(items, taxRate);

  let title = "";
  let rationale = "";
  if (documentType === "invoice") {
    title = `Invoice draft for ${input.clientId ?? "client"}`;
    rationale = `Generated from ${items.length} line item(s)${input.hint ? ` · ${input.hint}` : ""}.`;
  } else if (documentType === "quotation") {
    title = `Quotation draft for ${input.companyId ?? "company"}`;
    rationale = `Generated from ${items.length} line item(s).`;
  } else {
    title = `Purchase order draft for ${input.supplierId ?? "supplier"}`;
    rationale = `Suggested reorder for ${items.length} product(s) at/below reorder point.`;
  }

  if (process.env.OPENAI_API_KEY && input.hint) {
    try {
      rationale = await callOpenAI(
        "You are a procurement/invoice assistant. One sentence on why this draft was created.",
        `Context: ${input.hint}`,
        []
      );
    } catch {
      /* keep rule-based rationale */
    }
  }

  const [doc] = await db
    .insert(aiDocuments)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      documentType: documentType as any,
      status: "draft",
      title,
      payload: { ...input, items, taxRate, subtotal, taxAmount, total },
      rationale,
    })
    .returning();

  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "ai.document.generated",
    title: `AI ${documentType} draft generated`,
    description: title,
    resourceType: "ai_document",
    resourceId: doc.id,
    metadata: { documentType, total },
  });

  return doc;
}

/** Commit a reviewed AI document draft into a real business record. */
export async function commitAiDocument(
  ctx: ServerContext,
  documentId: string
): Promise<{ resourceType: string; resourceId: string }> {
  const doc = await db.query.aiDocuments.findFirst({
    where: and(eq(aiDocuments.id, documentId), eq(aiDocuments.organizationId, ctx.organizationId)),
  });
  if (!doc) throw new Error("Document not found");
  if (doc.status === "created") throw new Error("Document already committed");

  const payload = doc.payload as any;
  const items: { description: string; quantity: number; unitPrice: number }[] = payload.items ?? [];
  const taxRate = Number(payload.taxRate ?? 16);
  const { subtotal, taxAmount, total } = computeTotals(items, taxRate);

  let resourceType = "";
  let resourceId = "";

  if (doc.documentType === "invoice") {
    resourceType = "invoice";
    const now = new Date();
    const [inv] = await db
      .insert(invoices)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        clientId: payload.clientId ?? null,
        invoiceNumber: generateInvoiceNumber(),
        issueDate: now,
        dueDate: new Date(now.getTime() + 30 * 86_400_000),
        currency: "KES",
        subtotal: String(subtotal),
        taxRate: String(taxRate),
        taxAmount: String(taxAmount),
        total: String(total),
        status: "draft",
      })
      .returning();
    await db.insert(invoiceItems).values(
      items.map((it, idx) => ({
        invoiceId: inv.id,
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        amount: String(it.quantity * it.unitPrice),
        sortOrder: idx,
      }))
    );
    resourceId = inv.id;
    await logAuditSafe(ctx, { action: "invoice.create", category: "invoices", resourceType: "invoice", resourceId: inv.id, description: "Invoice created from AI draft" });
  } else if (doc.documentType === "quotation") {
    resourceType = "crm_quotation";
    const [q] = await db
      .insert(crmQuotations)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        quotationNumber: genNumber("QUO"),
        companyId: payload.companyId ?? null,
        status: "draft",
        version: 1,
        currency: "KES",
        subtotal: String(subtotal),
        taxRate: String(taxRate),
        taxAmount: String(taxAmount),
        total: String(total),
      })
      .returning();
    if (items.length) {
      await db.insert(crmQuotationItems).values(
        items.map((it, idx) => ({
          organizationId: ctx.organizationId,
          quotationId: q.id,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          amount: String(it.quantity * it.unitPrice),
          sortOrder: idx,
        }))
      );
    }
    resourceId = q.id;
  } else {
    resourceType = "inventory_purchase_order";
    const [po] = await db
      .insert(inventoryPurchaseOrders)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        supplierId: payload.supplierId ?? null,
        status: "draft",
        orderDate: new Date(),
      })
      .returning();
    await db.insert(inventoryPurchaseOrderItems).values(
      items.map((it) => ({
        organizationId: ctx.organizationId,
        purchaseOrderId: po.id,
        productId: (it as any).productId,
        quantity: String(it.quantity),
        unitCost: String(it.unitPrice),
        receivedQuantity: "0",
      }))
    );
    resourceId = po.id;
  }

  await db
    .update(aiDocuments)
    .set({ status: "created", createdResourceId: resourceId, createdResourceType: resourceType, updatedAt: new Date() })
    .where(eq(aiDocuments.id, doc.id));

  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: doc.documentType === "invoice" ? "invoice.created" : doc.documentType === "quotation" ? "crm.quotation.created" : "procurement.po.created",
    title: `AI ${doc.documentType} committed`,
    description: doc.title ?? undefined,
    resourceType,
    resourceId,
  });

  return { resourceType, resourceId };
}
