/**
 * KaziFlow — Website Analytics (foundation)
 * ------------------------------------------------------------------
 * Injects Google Analytics 4 (gtag) when NEXT_PUBLIC_GA_MEASUREMENT_ID is set,
 * or Plausible when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. Renders nothing when
 * neither is configured, so the app stays functional in local/dev environments.
 */
export function SiteAnalytics() {
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  if (!ga && !plausible) return null;

  if (plausible) {
    return (
      <script
        defer
        data-domain={plausible}
        src="https://plausible.io/js/script.js"
      />
    );
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`,
        }}
      />
    </>
  );
}
