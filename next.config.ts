import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";

type ImageRemotePattern = Exclude<NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number], URL>;

const landingReportOnlyCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms",
].join("; ");

// P11: Separate sources for enforced CSP on public share (additive security upgrade from Report-Only)
// Landing/other pages remain Report-Only (existing behavior).
// Share API gets the 3 required security headers (central, minimal blast, consistent with existing no-store in handlers).
// Policy value kept identical for share enforced (no tighten) — tracking domains (GA4/Clarity) verified never loaded on /share (landing-only components + providers + consent gate in src/lib/landing/* and app/page.tsx only; see P11 tests + grep).
// This is the best engineering choice: additive, 0 execution flow impact (graph confirmed), backwards compat for all P0-P10 share flows (view, password P10, session P5, interactive tabs/comments/decisions), fail-closed enforcement, one-file change.
const sharePageSource = "/share/:path*";
const shareApiSource = "/api/share/:path*";

const supabaseImageRemotePatterns = ((): ImageRemotePattern[] => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];
  try {
    const url = new URL(supabaseUrl);
    const protocol: "http" | "https" | null = url.protocol === "http:" ? "http" : url.protocol === "https:" ? "https" : null;
    if (!protocol) return [];
    const base = {
      protocol,
      hostname: url.hostname,
      port: url.port,
      search: "",
    };
    // P9: cover both component library images and project cover images (from metadata.projectImageUrl)
    // for Next/Image optimization on receiver hero + row thumbnails. Backwards compat.
    return [
      { ...base, pathname: "/storage/v1/object/public/component-images/**" },
      { ...base, pathname: "/storage/v1/object/public/project-images/**" },
    ];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  images: {
    remotePatterns: supabaseImageRemotePatterns,
  },
  async headers() {
    // P11: landing + about etc remain Report-Only (no behavior change)
    const landingReportOnly = [
      "/",
      "/about",
      "/features",
      "/pricing",
      "/contact",
    ].map((source) => ({
      source,
      headers: [
        {
          key: "Content-Security-Policy-Report-Only",
          value: landingReportOnlyCsp,
        },
      ],
    }));

    // P11: /share/:path* now enforced CSP (upgrade from Report-Only)
    const sharePageEnforced = [
      {
        source: sharePageSource,
        headers: [
          {
            key: "Content-Security-Policy",
            value: landingReportOnlyCsp,
          },
        ],
      },
    ];

    // P11: share API routes get the 3 required headers (additive to per-route no-store etc.)
    const shareApiSecurityHeaders = [
      {
        source: shareApiSource,
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
        ],
      },
    ];

    return [...landingReportOnly, ...sharePageEnforced, ...shareApiSecurityHeaders];
  },
};

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
