import type { AiRequestInput } from "@/lib/validations";
import { fetchWithTimeout } from "@/lib/http";
import { cache } from "@/lib/cache";
import { estimateCostCents } from "@/lib/ai/usage";
import { logger } from "@/lib/logger";

/**
 * KaziFlow AI — content generation with caching, cost estimation, and
 * graceful fallback. Designed to be backward compatible with the existing
 * `generateAiContent(input): Promise<string>` contract while adding:
 *   - deterministic response caching (cache hit => no API call, no cost)
 *   - approximate token counting + cost estimation for monitoring
 *   - a single hardened system prompt and richer per-type instructions
 *   - structured fallback (deterministic, never throws)
 */

const AI_CACHE_TTL = Number(process.env.AI_CACHE_TTL_SECONDS ?? 60 * 60 * 24); // 24h
const MAX_CACHE_INPUT_CHARS = 4000;

const SYSTEM_PROMPT =
  "You are KaziFlow AI, a senior business assistant for Kenyan freelancers, " +
  "solopreneurs, and small businesses across Africa. Write in clear, professional " +
  "English with occasional natural Swahili phrases where it fits the context. " +
  "Be specific, actionable, and concise. Avoid fluff. Use Kenyan shilling (KES) " +
  "context and local business realities (M-Pesa, KRA, eTIMS) when relevant.";

const INSTRUCTIONS: Record<AiRequestInput["type"], string> = {
  invoice_description:
    "Write a concise, professional invoice line-item description a Kenyan business would use. 1–2 sentences, no preamble.",
  email_followup:
    "Write a warm but professional payment follow-up email. Include a polite reminder of the outstanding amount and a clear call to action. Keep under 120 words.",
  social_post:
    "Write an engaging social media post for a Kenyan small business. Include 2–3 relevant hashtags (#KenyanBusiness #KaziFlow). Keep under 80 words.",
  business_tip:
    "Give one specific, actionable business tip for a Kenyan freelancer or SME. Lead with the tip, then a one-line rationale.",
  stock_shortage_prediction:
    "Analyze the inventory context and predict likely stock shortages. Recommend reorder quantities and timing. Use bullet points.",
  purchase_recommendation:
    "Based on sales velocity and stock levels provided, recommend optimal purchase quantities and suggest reorder timing for a Kenyan SME.",
  expense_anomaly:
    "Review the expense context and flag unusual spending patterns. List anomalies and suggest concrete cost-saving actions.",
  revenue_forecast:
    "Forecast revenue from the historical context. Provide a range with a brief rationale including seasonality typical for Kenyan businesses.",
  invoice_summary:
    "Summarize outstanding invoices: highlight overdue amounts, aging buckets, and suggest prioritized collection actions.",
  business_insights:
    "Summarize business health: cash flow, profit margins, and 2–3 growth opportunities. Be specific to the provided context.",
};

const TONE_GUIDANCE: Record<string, string> = {
  professional: "Tone: professional and formal.",
  friendly: "Tone: friendly and approachable.",
  casual: "Tone: casual and conversational.",
  formal: "Tone: formal and deferential.",
};

export interface AiResult {
  content: string;
  cached: boolean;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  costCents: number;
}

export async function generateAiContent(
  input: AiRequestInput
): Promise<string> {
  const res = await generateAiContentDetailed(input);
  return res.content;
}

export async function generateAiContentDetailed(
  input: AiRequestInput
): Promise<AiResult> {
  const fallback = getFallbackContent(input);

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    // No key configured — return deterministic fallback, mark as free.
    return {
      content: fallback,
      cached: false,
      model: null,
      promptTokens: 0,
      completionTokens: 0,
      costCents: 0,
    };
  }

  // Deterministic cache key from the normalized request.
  const cacheKey = `ai:${input.type}:${hashInput(input)}`;
  try {
    const cached = await cache.get<string>(cacheKey);
    if (cached) {
      return {
        content: cached,
        cached: true,
        model,
        promptTokens: 0,
        completionTokens: 0,
        costCents: 0,
      };
    }
  } catch {
    /* fall through to compute */
  }

  const userPrompt =
    `${INSTRUCTIONS[input.type]}\n\n${
      TONE_GUIDANCE[input.tone] ?? "Tone: professional."
    }\n\nContext:\n${input.context}`.slice(0, MAX_CACHE_INPUT_CHARS);

  try {
    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
        timeoutMs: 30_000,
      }
    );

    if (!res.ok) {
      logger.warn("AI provider returned non-OK status", {
        status: res.status,
        type: input.type,
      });
      return { ...fallbackResult(fallback, model), cached: false };
    }

    const data = await res.json();
    const content: string =
      data?.choices?.[0]?.message?.content?.trim() || fallback;

    const promptTokens = Number(data?.usage?.prompt_tokens ?? estimateTokens(userPrompt));
    const completionTokens = Number(
      data?.usage?.completion_tokens ?? estimateTokens(content)
    );
    const costCents = estimateCostCents(model, promptTokens, completionTokens);

    // Cache successful generations.
    try {
      await cache.set(cacheKey, content, AI_CACHE_TTL);
    } catch {
      /* ignore cache write failure */
    }

    return {
      content,
      cached: false,
      model,
      promptTokens,
      completionTokens,
      costCents,
    };
  } catch (err) {
    logger.error("AI generation failed; using fallback", {
      error: err instanceof Error ? err.message : String(err),
      type: input.type,
    });
    return { ...fallbackResult(fallback, model), cached: false };
  }
}

function fallbackResult(fallback: string, model: string): AiResult {
  return {
    content: fallback,
    cached: false,
    model,
    promptTokens: 0,
    completionTokens: 0,
    costCents: 0,
  };
}

/** Rough token estimate (~4 chars/token) used only when the API omits usage. */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/** Stable, collision-resistant hash for cache keys (no external dep). */
function hashInput(input: AiRequestInput): string {
  const raw = `${input.type}|${input.tone}|${input.context ?? ""}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function getFallbackContent(input: AiRequestInput): string {
  const ctx = input.context ?? "";
  const fallbacks: Record<AiRequestInput["type"], string> = {
    invoice_description: `Professional services rendered — ${ctx}`,
    email_followup: `Dear Client,\n\nI hope this message finds you well. I'm writing to kindly follow up on the outstanding invoice related to: ${ctx}.\n\nPlease let me know if you need any further details to process payment. Thank you for your continued partnership.\n\nBest regards`,
    social_post: `🚀 Growing my business one step at a time! ${ctx} #KenyanBusiness #KaziFlow #Entrepreneur`,
    business_tip: `Tip: Always send invoices within 24 hours of completing work. Prompt invoicing leads to faster payments. Context: ${ctx}`,
    stock_shortage_prediction: `Based on current stock levels and typical sales patterns, review items near their reorder point and plan purchases ahead of demand spikes. Context: ${ctx}`,
    purchase_recommendation: `Review current inventory and sales history. For fast-moving items, increase order quantities and negotiate better terms with reliable suppliers. Context: ${ctx}`,
    expense_anomaly: `Review recent expenses for duplicate charges, unexpected spikes, or categories exceeding budget. Address anomalies promptly to protect margins. Context: ${ctx}`,
    revenue_forecast: `Based on historical trends and typical Kenyan seasonality, estimate next month's revenue and prepare for known upcoming projects or lean periods. Context: ${ctx}`,
    invoice_summary: `You have outstanding invoices that need attention. Prioritize older unpaid invoices and send polite reminders to accelerate collection. Context: ${ctx}`,
    business_insights: `Maintain positive cash flow, control expenses, and grow revenue consistently. Focus on collecting overdue payments and optimizing inventory turnover. Context: ${ctx}`,
  };
  return fallbacks[input.type];
}
