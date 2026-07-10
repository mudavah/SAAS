/**
 * KaziFlow Public API — CORS
 * ------------------------------------------------------------------
 * Minimal CORS support so third-party apps (websites, mobile, POS, eCommerce)
 * can call the public API from the browser. Allowlist can be tightened via
 * KAIZFLOW_API_ALLOWED_ORIGINS (comma-separated) in the future.
 */
export const API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining",
};

export function corsResponse(body: BodyInit | null, status = 204): Response {
  return new Response(body, {
    status,
    headers: API_CORS_HEADERS,
  });
}
