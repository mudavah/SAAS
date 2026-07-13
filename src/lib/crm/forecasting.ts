/**
 * KaziFlow — CRM Sales Forecasting
 * ------------------------------------------------------------------
 * Pure helpers that turn raw deals + pipeline stages into forecast numbers.
 * Kept dependency-free so they can be unit tested and reused by the reports
 * endpoint and the AI assistant.
 */
export interface ForecastDeal {
  amount: number | string;
  probability?: number | null;
  stageProbability?: number | null;
  status: "open" | "won" | "lost" | string;
}

/** Numeric probability to use: deal override → stage default → 0. */
export function effectiveProbability(
  dealProbability?: number | null,
  stageProbability?: number | null
): number {
  if (typeof dealProbability === "number" && dealProbability >= 0) {
    return Math.max(0, Math.min(100, dealProbability));
  }
  if (typeof stageProbability === "number" && stageProbability >= 0) {
    return Math.max(0, Math.min(100, stageProbability));
  }
  return 0;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

/** Expected value of a single deal = amount × probability. */
export function weightedAmount(deal: ForecastDeal): number {
  const amount = toNumber(deal.amount);
  const probability = effectiveProbability(deal.probability, deal.stageProbability);
  return amount * (probability / 100);
}

export interface ForecastSummary {
  totalPipeline: number; // sum of open deal amounts
  weightedPipeline: number; // sum of weighted open deal amounts
  openCount: number;
  wonCount: number;
  lostCount: number;
  wonValue: number;
  lostValue: number;
  avgDealSize: number;
}

/**
 * Aggregate a list of deals into a forecast summary. `deals` should already be
 * scoped to one organization by the caller.
 */
export function summarizeForecast(deals: ForecastDeal[]): ForecastSummary {
  let totalPipeline = 0;
  let weightedPipeline = 0;
  let openCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let wonValue = 0;
  let lostValue = 0;
  let totalSizeForAvg = 0;
  let avgDenominator = 0;

  for (const deal of deals) {
    const amount = toNumber(deal.amount);
    if (deal.status === "open") {
      totalPipeline += amount;
      weightedPipeline += weightedAmount(deal);
      openCount += 1;
      totalSizeForAvg += amount;
      avgDenominator += 1;
    } else if (deal.status === "won") {
      wonCount += 1;
      wonValue += amount;
      totalSizeForAvg += amount;
      avgDenominator += 1;
    } else if (deal.status === "lost") {
      lostCount += 1;
      lostValue += amount;
    }
  }

  return {
    totalPipeline: round2(totalPipeline),
    weightedPipeline: round2(weightedPipeline),
    openCount,
    wonCount,
    lostCount,
    wonValue: round2(wonValue),
    lostValue: round2(lostValue),
    avgDealSize: avgDenominator > 0 ? round2(totalSizeForAvg / avgDenominator) : 0,
  };
}

/** Win rate as a percentage (0–100). Returns 0 when there are no closed deals. */
export function winRate(wonCount: number, lostCount: number): number {
  const closed = wonCount + lostCount;
  if (closed === 0) return 0;
  return round2((wonCount / closed) * 100);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
