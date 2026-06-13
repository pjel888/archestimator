import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";

type ImageRemotePattern = Exclude<NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number], URL>;

// Dev-only allowance so impeccable live mode can load. Guarded by NODE_ENV.
const __impeccableLiveDev =
  process.env.NODE_ENV === "development" ? " http://localhost:8400" : "";

const landingReportOnlyCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms${__impeccableLiveDev}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms${__impeccableLiveDev}`,
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
    return [
      { ...base, pathname: "/storage/v1/object/public/component-images/**" },
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

    // Shared hardening headers applied to BOTH the share page and the share API:
    // - SEC-01: Referrer-Policy: no-referrer so the `?recipient=` token in the URL is never
    //   leaked via the Referer header to outbound links / subresources.
    // - SEC-05: HSTS (force HTTPS) + X-Robots-Tag: noindex,nofollow (keep confidential client
    //   proposals out of search indexes). nosniff + frame-clickjacking protection.
    // NOTE: CSP `script-src`/`style-src` still allow 'unsafe-inline'/'unsafe-eval' (the SEC-05
    // CSP-tightening to a per-request nonce is deferred — see 06_SECURITY_AUDIT.md / the T3
    // deferral note — because removing them needs a nonce pipeline verified in a live browser).
    const shareHardeningHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];

    // P11: /share/:path* now enforced CSP (upgrade from Report-Only) + the shared hardening headers.
    const sharePageEnforced = [
      {
        source: sharePageSource,
        headers: [
          {
            key: "Content-Security-Policy",
            value: landingReportOnlyCsp,
          },
          ...shareHardeningHeaders,
        ],
      },
    ];

    // Share API routes get the shared hardening headers (additive to per-route no-store etc.)
    const shareApiSecurityHeaders = [
      {
        source: shareApiSource,
        headers: [...shareHardeningHeaders],
      },
    ];

    // ── Teamspace Improvement Plan · T1.5 (security finding F8 / gap G4) ───────────
    // Also satisfies Estimates-List F14 / P3-2 (workshop frame + sniff + Report-Only
    // CSP): this /workshop/:path* block supersedes the standalone workshop headers
    // from that plan — same intent, broader coverage (adds /invite + HSTS).
    // Authenticated app routes /workshop/* and invite routes /invite/* previously had
    // ZERO security headers (clickjacking + Referer-token-leak risk). We now apply the
    // four hardening headers IMMEDIATELY (reusing `shareHardeningHeaders`):
    //   • X-Content-Type-Options: nosniff
    //   • X-Frame-Options: DENY              (anti-clickjacking)
    //   • Referrer-Policy: no-referrer       (CRITICAL for /invite — raw token in URL path)
    //   • Strict-Transport-Security (HSTS)   (force HTTPS)
    //   (X-Robots-Tag: noindex,nofollow also rides along — both are authed/token-bearing.)
    //
    // CSP is shipped as Report-Only FIRST (decision D-9): we observe violations during an
    // observation window before flipping to enforced `Content-Security-Policy`. Enforcement
    // is DEFERRED and must be coordinated with the Shared-Link CSP-nonce work (the per-request
    // nonce pipeline that replaces 'unsafe-inline'/'unsafe-eval') so the app and /share converge
    // on one enforced policy. The Report-Only value reuses `landingReportOnlyCsp`, whose
    // connect-src already allows `https://*.supabase.co wss://*.supabase.co` — required for
    // Supabase Realtime websockets used on /workshop (presence + live cursors).
    const appAndInviteHardening = [
      {
        source: "/workshop/:path*",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: landingReportOnlyCsp,
          },
          ...shareHardeningHeaders,
        ],
      },
      {
        source: "/invite/:path*",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: landingReportOnlyCsp,
          },
          ...shareHardeningHeaders,
        ],
      },
    ];

    return [
      ...landingReportOnly,
      ...sharePageEnforced,
      ...shareApiSecurityHeaders,
      ...appAndInviteHardening,
    ];
  },
};

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
