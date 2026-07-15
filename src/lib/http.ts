/**
 * KaziFlow — HTTP utilities
 * ------------------------------------------------------------------
 * Shared helpers for outbound HTTP requests with timeouts and
 * request correlation IDs.
 */

export function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = init;
  const signals: AbortSignal[] = [];

  if (init.signal) {
    signals.push(init.signal);
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  signals.push(timeoutSignal);

  const combined = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      combined.abort();
      break;
    }
    signal.addEventListener(
      "abort",
      () => combined.abort(),
      { once: true }
    );
  }

  return fetch(input, {
    ...rest,
    signal: combined.signal,
  });
}
