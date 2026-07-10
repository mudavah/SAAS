/**
 * KaziFlow Public API — CORS
 * ------------------------------------------------------------------
 * Minimal CORS support so third-party apps (websites, mobile, POS, eCommerce)
 * can call the public API from the browser. Allowlist can be tightened via
 * KAIZFLOW_API_ALLOWED_ORIGINS (comma-separated) in the future.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigins = (process.env.KAZIFLOW_API_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (!origin || allowedOrigins.includes(origin)) {
    return {
      ...API_CORS_HEADERS,
      "Access-Control-Allow-Origin": origin || "*",
    };
  }

  return {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
    "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining",
  };
}

const API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining",
};

export function corsResponse(body: BodyInit | null, status = 204, req?: Request): Response {
  return new Response(body, {
    status,
    headers: req ? getCorsHeaders(req) : { ...API_CORS_HEADERS, "Access-Control-Allow-Origin": "*" },
  });
}
