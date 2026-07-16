import type { MetadataRoute } from "next";
import { SITE_URL, DISALLOW_ROUTES } from "@/lib/seo/config";

/**
 * robots.txt. Allows all crawlers for public marketing/legal content while
 * blocking the authenticated dashboard, API surface, and onboarding flows.
 * Sitemap is advertised for discovery.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_ROUTES,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
