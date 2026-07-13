/**
 * KaziFlow — CRM Lead Scoring
 * ------------------------------------------------------------------
 * Rules-based, deterministic lead scoring. Produces a 0–100 score plus a list
 * of human-readable reasons so the UI and the AI assistant can explain *why* a
 * lead is hot. No external dependencies — easy to unit test and to later tune.
 */
import type { LeadSource, LeadStatus } from "@/db/schema";

export interface LeadScoringInput {
  source?: LeadSource | string | null;
  status?: LeadStatus | string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  estimatedValue?: number | string | null;
  tags?: string[] | null;
}

export interface LeadScoreResult {
  score: number; // clamped to 0..100
  reasons: string[];
}

const SOURCE_WEIGHTS: Record<string, { points: number; label: string }> = {
  referral: { points: 20, label: "Referral source" },
  partner: { points: 18, label: "Partner source" },
  event: { points: 12, label: "Event attendee" },
  social_media: { points: 10, label: "Social media reach-out" },
  website: { points: 8, label: "Website inquiry" },
  email_campaign: { points: 8, label: "Email campaign response" },
  advertisement: { points: 6, label: "Paid advertisement" },
  cold_call: { points: 4, label: "Cold call" },
  other: { points: 2, label: "Other source" },
};

const STATUS_WEIGHTS: Record<string, { points: number; label: string }> = {
  converted: { points: 25, label: "Converted lead" },
  qualified: { points: 15, label: "Qualified" },
  contacted: { points: 5, label: "Contacted" },
  new: { points: 0, label: "New lead" },
  unqualified: { points: -10, label: "Marked unqualified" },
  lost: { points: -20, label: "Marked lost" },
};

/** Convert a possibly-string numeric value to a finite number. */
function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function scoreLead(input: LeadScoringInput): LeadScoreResult {
  const reasons: string[] = [];
  let score = 0;

  const source = (input.source || "other").toString();
  const sourceWeight = SOURCE_WEIGHTS[source] ?? SOURCE_WEIGHTS.other;
  score += sourceWeight.points;
  if (sourceWeight.points > 0) reasons.push(`+${sourceWeight.points} ${sourceWeight.label}`);

  const status = (input.status || "new").toString();
  const statusWeight = STATUS_WEIGHTS[status] ?? STATUS_WEIGHTS.new;
  score += statusWeight.points;
  if (statusWeight.points !== 0) {
    reasons.push(`${statusWeight.points >= 0 ? "+" : ""}${statusWeight.points} ${statusWeight.label}`);
  }

  if (input.email) {
    score += 10;
    reasons.push("+10 Has email");
  }
  if (input.phone) {
    score += 10;
    reasons.push("+10 Has phone");
  }
  if (input.company) {
    score += 10;
    reasons.push("+10 Has company");
  }

  const value = toNumber(input.estimatedValue);
  if (value >= 100000) {
    score += 20;
    reasons.push("+20 High estimated value");
  } else if (value >= 25000) {
    score += 12;
    reasons.push("+12 Solid estimated value");
  } else if (value >= 5000) {
    score += 6;
    reasons.push("+6 Moderate estimated value");
  } else if (value > 0) {
    score += 2;
    reasons.push("+2 Some estimated value");
  }

  const tags = input.tags ?? [];
  if (tags.some((t) => /engag|respons|warm|hot/i.test(t))) {
    score += 10;
    reasons.push("+10 Engagement signals in tags");
  }

  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, reasons };
}

/** Qualitative tier for quick UI badges. */
export function leadTier(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
