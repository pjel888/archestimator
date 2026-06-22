import type { MetadataRoute } from "next";

import { LANDING_SITE_ORIGIN } from "@/lib/landing/seo-metadata";

/**
 * sitemap.ts — the XML sitemap for the Archestimator public surface
 * (doc 13 §4). Includes ONLY the indexable marketing routes.
 *
 * Excluded (per doc 23 §7 + doc 13 §4): /login, /signup (noindex,nofollow
 * conversion dead-ends), /newdesign/** (preview), /legacy (rollback host),
 * /workshop/** (auth-gated app), /beta/* (auth-gated).
 *
 * L-SEO-1 GATED: the origin is a placeholder until the production domain is
 * confirmed; the sitemap uses LANDING_SITE_ORIGIN so it updates in one place.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const indexableRoutes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/features", priority: 0.9, changeFrequency: "weekly" },
    { path: "/trust", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  return indexableRoutes.map((route) => ({
    url: `${LANDING_SITE_ORIGIN}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
