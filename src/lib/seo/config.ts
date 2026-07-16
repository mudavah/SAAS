/**
 * KaziFlow — Technical SEO configuration
 * ------------------------------------------------------------------
 * Central source of truth for SEO metadata so every route, the sitemap, the
 * robots file, and JSON-LD share one canonical identity. Kept additive: it does
 * not change any existing route behavior, only exposes consistent metadata.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://kaziflow.co.ke"
).replace(/\/$/, "");

export const SITE_NAME = "KaziFlow";
export const SITE_LOCALE = "en_KE";
export const TWITTER_HANDLE = "@kaziflow";

export const DEFAULT_OG_IMAGE = "/og";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const SITE_DESCRIPTION =
  "Affordable invoicing, client management, M-Pesa payments, and AI assistance for freelancers and small businesses in Kenya and Africa.";

/** Routable, indexable marketing/legal pages for the sitemap. */
export const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changeFreq: "daily" as const },
  { path: "/pricing", priority: 0.9, changeFreq: "weekly" as const },
  { path: "/features", priority: 0.9, changeFreq: "weekly" as const },
  { path: "/help", priority: 0.7, changeFreq: "weekly" as const },
  { path: "/privacy", priority: 0.4, changeFreq: "yearly" as const },
  { path: "/terms", priority: 0.4, changeFreq: "yearly" as const },
  { path: "/cookie-policy", priority: 0.4, changeFreq: "yearly" as const },
];

export const DISALLOW_ROUTES = [
  "/dashboard",
  "/api",
  "/auth",
  "/onboarding",
  "/settings",
  "/help/",
];

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const canonical = absoluteUrl;
