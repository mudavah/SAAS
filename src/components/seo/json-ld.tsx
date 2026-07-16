/**
 * KaziFlow — JSON-LD structured data component
 * ------------------------------------------------------------------
 * Injects Schema.org JSON-LD into a page's <head> via a script tag. Server
 * component safe (no client JS). Used for Organization/WebSite/SoftwareApplication
 * and breadcrumb markup to improve rich-result eligibility.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify is safe here: data is app-controlled, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
