import { stringifyJsonLd } from "@/lib/landing/json-ld";
import { LANDING_SITE_ORIGIN } from "@/lib/landing/seo-metadata";

/**
 * structured-data.tsx - JSON-LD structured data for the landing surface
 * (doc 13 §4). Sits in the root layout so Organization + WebSite schema
 * apply sitewide. Per-route WebPage/Breadcrumb/ItemList can be added by
 * individual routes (not required for the MVP slice).
 *
 * No fabricated metrics, no fake aggregateRating, no invented founder sameAs
 * links (L-FND-1 gated). Only what is verifiably true.
 *
 * RSC-safe: renders a single <script type="application/ld+json">.
 */

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Archestimator",
  url: LANDING_SITE_ORIGIN,
  description:
    "A construction cost estimating platform where every estimate becomes reusable commercial knowledge.",
  slogan: "Your cost intelligence layer.",
  // No logo sameAs / founder sameAs until assets exist (L-FND-1, L-SEO-1 gated).
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Archestimator",
  url: LANDING_SITE_ORIGIN,
  description:
    "A construction cost estimating platform where every estimate becomes reusable commercial knowledge.",
  inLanguage: "en",
};

export function LandingStructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD is static + trusted (authored here, not user input).
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(websiteSchema) }}
      />
    </>
  );
}
