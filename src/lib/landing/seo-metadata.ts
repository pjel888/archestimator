import type { Metadata } from "next";

/**
 * seo-metadata.ts — per-route metadata factory for the landing surface
 * (doc 13 §3 / §4). Keeps title/description/canonical/OG shaping consistent
 * across every marketing route. The route supplies the content; this factory
 * shapes it.
 *
 * L-SEO-1 GATED: the domain is a placeholder (`https://archestimator.com`)
 * until Philip confirms the production domain. Canonical/OG absolutization
 * is gated on that confirmation; meanwhile the absolute-URL strings below
 * are the working assumption.
 */

// L-SEO-1 GATED — placeholder until domain confirmed.
export const LANDING_SITE_ORIGIN = "https://archestimator.com";

const BRAND_SUFFIX = "Archestimator";

function withBrand(title: string): string {
  // Avoid double-branding when the route title already includes "Archestimator".
  if (title.toLowerCase().includes(BRAND_SUFFIX.toLowerCase())) return title;
  return `${title} — ${BRAND_SUFFIX}`;
}

export interface LandingRouteMeta {
  /** The page title. Brand-suffixed automatically unless it already contains "Archestimator". */
  title: string;
  /** Meta description (≤160 chars ideal). */
  description: string;
  /** The route path, leading slash, no query. Used for canonical + OG url. */
  path: string;
  /** Optional OG image absolute URL or relative path. */
  ogImage?: string;
  /** Allow indexing? Marketing routes = true; auth/preview/legacy = false. */
  indexable?: boolean;
}

/**
 * Build indexable metadata for a marketing route (/, /features, /pricing,
 * /about, /contact, /trust). Self-canonical, OG + Twitter cards, index,follow.
 */
export function buildLandingMetadata(meta: LandingRouteMeta): Metadata {
  const canonical = `${LANDING_SITE_ORIGIN}${meta.path}`;
  const title = withBrand(meta.title);
  const ogImage = meta.ogImage ?? "/og/default.png";
  return {
    title,
    description: meta.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: meta.description,
      url: canonical,
      siteName: BRAND_SUFFIX,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: meta.description,
      images: [ogImage],
    },
  };
}

/**
 * Build noindex metadata for auth routes (/login, /signup) and the
 * preview/rollback routes (/newdesign/**, /legacy). Self-canonical,
 * noindex,nofollow, sitemap-excluded (doc 13 §4 / doc 23 §7).
 */
export function buildNoIndexMetadata(meta: { title: string; path: string }): Metadata {
  const title = withBrand(meta.title);
  return {
    title,
    robots: { index: false, follow: false },
    alternates: { canonical: `${LANDING_SITE_ORIGIN}${meta.path}` },
  };
}
