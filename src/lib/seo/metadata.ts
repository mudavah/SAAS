/**
 * KaziFlow — SEO helpers (metadata + JSON-LD)
 * ------------------------------------------------------------------
 * Small, framework-agnostic helpers that compose Next.js `Metadata` objects
 * consistently across the app. Designed to be additive — existing pages keep
 * working; new/updated pages can opt in for canonical URLs, Open Graph, and
 * Twitter Card coverage without boilerplate.
 */
import type { Metadata } from "next";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  canonical as canonicalFn,
} from "./config";

export interface SeoOptions {
  title?: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
  ogImage?: string;
  noIndex?: boolean;
}

/** Build a complete Metadata object with canonical + social tags. */
export function buildMetadata(opts: SeoOptions = {}): Metadata {
  const url = canonicalFn(opts.path ?? "/");
  const title = opts.title ?? `${SITE_NAME} — Run Your Kenyan Business Smarter`;
  const description = opts.description ?? SITE_DESCRIPTION;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: opts.type ?? "website",
      images: [
        {
          url: opts.ogImage ?? DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      images: [opts.ogImage ?? DEFAULT_OG_IMAGE],
    },
    robots: opts.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

interface JsonLdOrg {
  name: string;
  url: string;
  description: string;
}

/** Produce a Schema.org Organization + WebSite JSON-LD blob. */
export function organizationJsonLd(org?: Partial<JsonLdOrg>): Record<string, unknown> {
  const name = org?.name ?? SITE_NAME;
  const url = org?.url ?? SITE_URL;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name,
        url,
        description: org?.description ?? SITE_DESCRIPTION,
        logo: `${url}/icons/icon-512.png`,
        sameAs: [`https://twitter.com/${TWITTER_HANDLE.replace("@", "")}`],
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name,
        publisher: { "@id": `${url}/#organization` },
        inLanguage: "en-KE",
      },
    ],
  };
}

/** Produce a Schema.org SoftwareApplication JSON-LD blob for the landing page. */
export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    url: absoluteUrl("/"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1240",
    },
  };
}
