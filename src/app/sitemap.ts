import type { MetadataRoute } from "next";
import { SITE_URL, STATIC_ROUTES } from "@/lib/seo/config";

/**
 * Dynamic sitemap.xml. Lists indexable marketing/legal routes with their
 * priority and change frequency. Authenticated/dashboard/api routes are
 * intentionally excluded (also blocked in robots.txt).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));
}
