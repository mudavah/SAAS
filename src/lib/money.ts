/**
 * Money helpers — always do arithmetic in integer cents to avoid the rounding
 * drift you get from parseFloat() on decimal strings.
 */
export function toCents(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  // Guard against float error before scaling.
  return Math.round(Math.round(n * 1e6) / 1e4);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Add two monetary amounts (strings or numbers) and return a fixed 2-dp string. */
export function addAmounts(a: string | number, b: string | number): string {
  return fromCents(toCents(a) + toCents(b));
}

/** Subtract b from a, clamped at 0, returned as a fixed 2-dp string. */
export function subtractAmounts(a: string | number, b: string | number): string {
  return fromCents(Math.max(0, toCents(a) - toCents(b)));
}
