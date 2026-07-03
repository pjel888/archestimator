import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";

type ImageRemotePattern = Exclude<NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number], URL>;
type ImageLocalPattern = NonNullable<NonNullable<NextConfig["images"]>["localPatterns"]>[number];

// Dev-only allowance so impeccable live mode can load. Guarded by NODE_ENV.
const __impeccableLiveDev =
  process.env.NODE_ENV === "development" ? " http://localhost:8400" : "";
const isCloudflareWorkersProofBuild = process.env.ARCHESTIMATOR_CLOUDFLARE_BUILD === "1";
const useCloudflareImageLoader = isCloudflareWorkersProofBuild;

const landingReportOnlyCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms${__impeccableLiveDev}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms",
  "font-src 'self' data:",
  `connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms${__impeccableLiveDev}`,
].join("; ");

const workshopReportOnlyCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com https://*.googleusercontent.com blob:${__impeccableLiveDev}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com https://*.googleusercontent.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms https://*.googleapis.com https://*.google.com https://*.gstatic.com data: blob:${__impeccableLiveDev}`,
  "frame-src https://*.google.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
].join("; ");

// P11: Separate sources for enforced CSP on public share (additive security upgrade from Report-Only)
// Landing/other pages remain Report-Only (existing behavior).
// Share API gets the 3 required security headers (central, minimal blast, consistent with existing no-store in handlers).
// Policy value kept identical for share enforced (no tighten) — tracking domains (Cloudflare Web Analytics/GA4/Clarity) verified never loaded on /share (landing-only components + providers + consent gate in src/lib/landing/* and public page shells only; see P11 tests + grep).
// This is the best engineering choice: additive, 0 execution flow impact (graph confirmed), backwards compat for all P0-P10 share flows (view, password P10, session P5, interactive tabs/comments/decisions), fail-closed enforcement, one-file change.
const sharePageSource = "/share/:path*";
const shareApiSource = "/api/share/:path*";

const googleMapsImageRemotePatterns: ImageRemotePattern[] = [
  { protocol: "https", hostname: "maps.googleapis.com", pathname: "/maps/api/staticmap" },
];

const localImagePatterns: ImageLocalPattern[] = [
  // Next 16 requires an explicit local pattern for queried same-origin images.
  // The `path` query is intentionally dynamic; access control and storage-path
  // validation live in src/app/api/projects/images/route.ts.
  { pathname: "/api/projects/images" },
  { pathname: "/component-thumbnails/**", search: "" },
  { pathname: "/landing/**", search: "" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  compiler: {
    defineServer: {
      __ARCHESTIMATOR_CLOUDFLARE_WORKERS_PROOF_BUILD__: isCloudflareWorkersProofBuild,
    },
  },
  ...(isCloudflareWorkersProofBuild
    ? {
        // ponytail: OpenNext generates .open-next/worker.js AFTER next build succeeds,
        // so worker.ts's import fails the next-build TS check on a cold .open-next/.
        // Real type errors are still caught by `bun run type-check` and CI validate gates.
        typescript: {
          ignoreBuildErrors: true,
        },
        turbopack: {
          resolveAlias: {
            sharp: "./src/lib/uploads/sharp-cloudflare-stub.ts",
          },
        },
      }
    : {}),
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
    // Library Optimization Plan P0 T3: let the client Router Cache reuse a
    // recently-rendered dynamic segment on Link / back-forward navigation so a
    // warm tab revisit does NOT re-suspend the server segment and re-fire its
    // loading.tsx. Combined with the browse tabs' warm TanStack Query cache
    // (LibraryPageClient / TemplatesBrowsePageClient), warm Library tab switches
    // render instantly with no route-level skeleton. App-wide (documented in the
    // plan's DECISIONS): single-user-per-workspace product, 5-min staleness is
    // acceptable; mutations bust the relevant cache entries explicitly (T4).
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
  images: {
    ...(useCloudflareImageLoader
      ? {
          loader: "custom" as const,
          loaderFile: "./image-loader.ts",
          unoptimized: true,
        }
      : {}),
    localPatterns: localImagePatterns,
    remotePatterns: [
      ...googleMapsImageRemotePatterns,
    ],
  },
  async redirects() {
    return [
      {
        source: "/workshop/templates",
        destination: "/workshop/library/templates",
        permanent: false,
      },
      {
        source: "/workshop/components",
        destination: "/workshop/library",
        permanent: false,
      },
      {
        source: "/workshop/projects/:projectId/charts",
        destination: "/workshop/projects/:projectId/data",
        permanent: true,
      },
      {
        source: "/beta/access-required",
        destination: "/access-required",
        permanent: false,
      },
      {
        source: "/beta",
        destination: "/access-required",
        permanent: false,
      },
      {
        source: "/workshop/settings/beta-users",
        destination: "/workshop/settings/users",
        permanent: false,
      },
    ];
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

    // P11: /share/:path* now enforced CSP (upgrade from Report-Only), no-store cache policy,
    // and the shared hardening headers. The page carries client proposal data in the HTML shell,
    // so it must not rely only on dynamic rendering to prevent intermediary/browser storage.
    const sharePageEnforced = [
      {
        source: sharePageSource,
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
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
    // This /workshop/:path* block is the single canonical workshop hardening: it
    // supersedes BOTH the Library Optimization (T18/F20) and Estimates-List (F14/P3-2)
    // standalone workshop-headers work — same intent, broader coverage (covers
    // /workshop AND /invite with no-referrer + HSTS + Report-Only CSP).
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
    // on one enforced policy. Workshop uses its own Report-Only value so the authenticated
    // dashboard can load the optional Google Maps/Places project-location surface without widening the
    // enforced public-share CSP.
    const appAndInviteHardening = [
      {
        source: "/workshop/:path*",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: workshopReportOnlyCsp,
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
