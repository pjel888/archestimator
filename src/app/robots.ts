import type { MetadataRoute } from "next";

import { LANDING_SITE_ORIGIN } from "@/lib/landing/seo-metadata";

/**
 * robots.ts — robots.txt for the Archestimator public surface (doc 13 §4).
 *
 * Allow: the indexable marketing routes.
 * Disallow: auth routes (/login, /signup), the app (/workshop), the beta
 * gate (/beta), the preview (/newdesign), the rollback host (/legacy), the
 * API. These are noindex,nofollow anyway (per-route metadata), but robots.txt
 * is the belt; the per-route meta is the suspenders (doc 23 §7).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/login",
          "/signup",
          "/workshop",
          "/workshop/",
          "/beta",
          "/beta/",
          "/newdesign",
          "/newdesign/",
          "/legacy",
          "/legacy/",
          "/auth",
          "/auth/",
          "/api",
          "/api/",
          "/invite",
          "/invite/",
          "/share",
          "/share/",
        ],
      },
    ],
    sitemap: `${LANDING_SITE_ORIGIN}/sitemap.xml`,
    host: LANDING_SITE_ORIGIN,
  };
}
