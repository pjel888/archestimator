import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  LANDING_CONSENT_COOKIE_NAME,
  serializeLandingConsentState,
} from "@/lib/landing/consent";

export const PUBLIC_MARKETING_ROUTES = [
  "/",
  "/about",
  "/features",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export type PublicMarketingRoute = (typeof PUBLIC_MARKETING_ROUTES)[number];

export interface CacheSafetyScenario {
  id: string;
  label: string;
  headers: Record<string, string>;
  note: string;
}

export interface PublicCacheSafetyProbe {
  route: string;
  scenarioId: string;
  scenarioLabel: string;
  status: number;
  ok: boolean;
  bodyHash: string;
  bodyBytes: number;
  cacheControl: string | null;
  cdnCacheControl: string | null;
  vercelCdnCacheControl: string | null;
  setCookie: string | null;
  vary: string | null;
  xVercelCache: string | null;
  error: string | null;
}

export interface PublicCacheSafetySummary {
  route: string;
  compatibleWithSharedHtmlCache: boolean;
  bodyVaries: boolean;
  hasSetCookie: boolean;
  cacheControl: string;
  cdnCacheControl: string;
  vercelCdnCacheControl: string;
  vary: string;
  xVercelCache: string;
  blockers: string[];
}

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const FIXED_CONSENT_DATE = "2026-06-06T00:00:00.000Z";

function consentCookie(analytics: boolean) {
  return `${LANDING_CONSENT_COOKIE_NAME}=${serializeLandingConsentState({
    version: 1,
    analytics,
    updatedAt: FIXED_CONSENT_DATE,
  })}`;
}

function abCookie(variant: "A" | "B") {
  return `ab_test=${encodeURIComponent(JSON.stringify({ "hero-cta-copy": variant }))}`;
}

export const CACHE_SAFETY_SCENARIOS: CacheSafetyScenario[] = [
  {
    id: "anonymous-desktop",
    label: "Anonymous desktop visitor",
    headers: { "user-agent": DESKTOP_UA },
    note: "Fresh anonymous request with no consent or A/B cookies.",
  },
  {
    id: "synthetic-logged-in-cookie",
    label: "Synthetic logged-in-cookie assumption",
    headers: {
      "user-agent": DESKTOP_UA,
      cookie: "sb-synthetic-auth-token=redacted-placeholder",
    },
    note:
      "Credential-free placeholder only. Component/source tests prove logged-in CTA markup can vary when getLandingAuthState resolves true.",
  },
  {
    id: "consent-rejected",
    label: "Consent rejected",
    headers: {
      "user-agent": DESKTOP_UA,
      cookie: consentCookie(false),
    },
    note: "Analytics consent is false; A/B assignment should remain control without Set-Cookie.",
  },
  {
    id: "consent-accepted-ab-a",
    label: "Consent accepted with A/B variant A",
    headers: {
      "user-agent": DESKTOP_UA,
      cookie: `${consentCookie(true)}; ${abCookie("A")}`,
    },
    note: "Analytics consent true with explicit hero CTA control variant.",
  },
  {
    id: "consent-accepted-ab-b",
    label: "Consent accepted with A/B variant B",
    headers: {
      "user-agent": DESKTOP_UA,
      cookie: `${consentCookie(true)}; ${abCookie("B")}`,
    },
    note: "Analytics consent true with explicit hero CTA variant B.",
  },
  {
    id: "anonymous-mobile",
    label: "Anonymous mobile visitor",
    headers: { "user-agent": MOBILE_UA },
    note: "Mobile user-agent probe for server-output variance.",
  },
];

function header(response: Response, name: string) {
  return response.headers.get(name);
}

async function sha256(text: string) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function routeUrl(origin: string, route: string) {
  return `${normalizeOrigin(origin)}${route}`;
}

export async function runPublicCacheSafetyProbe({
  origin,
  fetchImpl = fetch,
  routes = PUBLIC_MARKETING_ROUTES,
  scenarios = CACHE_SAFETY_SCENARIOS,
}: {
  origin: string;
  fetchImpl?: typeof fetch;
  routes?: readonly string[];
  scenarios?: readonly CacheSafetyScenario[];
}): Promise<PublicCacheSafetyProbe[]> {
  const probes: PublicCacheSafetyProbe[] = [];

  for (const route of routes) {
    for (const scenario of scenarios) {
      try {
        const response = await fetchImpl(routeUrl(origin, route), {
          headers: scenario.headers,
          redirect: "manual",
        });
        const body = await response.text();
        probes.push({
          route,
          scenarioId: scenario.id,
          scenarioLabel: scenario.label,
          status: response.status,
          ok: response.ok,
          bodyHash: await sha256(body),
          bodyBytes: body.length,
          cacheControl: header(response, "cache-control"),
          cdnCacheControl: header(response, "cdn-cache-control"),
          vercelCdnCacheControl: header(response, "vercel-cdn-cache-control"),
          setCookie: header(response, "set-cookie"),
          vary: header(response, "vary"),
          xVercelCache: header(response, "x-vercel-cache"),
          error: null,
        });
      } catch (error) {
        probes.push({
          route,
          scenarioId: scenario.id,
          scenarioLabel: scenario.label,
          status: 0,
          ok: false,
          bodyHash: "error",
          bodyBytes: 0,
          cacheControl: null,
          cdnCacheControl: null,
          vercelCdnCacheControl: null,
          setCookie: null,
          vary: null,
          xVercelCache: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return probes;
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function containsPrivateOrNoCache(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes("private") || normalized.includes("no-store") || normalized.includes("no-cache");
}

export function evaluatePublicCacheSafety(probes: readonly PublicCacheSafetyProbe[]): PublicCacheSafetySummary[] {
  const byRoute = new Map<string, PublicCacheSafetyProbe[]>();
  for (const probe of probes) {
    byRoute.set(probe.route, [...(byRoute.get(probe.route) ?? []), probe]);
  }

  return Array.from(byRoute.entries()).map(([route, routeProbes]) => {
    const bodyHashes = unique(routeProbes.map((probe) => probe.bodyHash));
    const cacheControls = unique(routeProbes.map((probe) => probe.cacheControl));
    const cdnCacheControls = unique(routeProbes.map((probe) => probe.cdnCacheControl));
    const vercelCdnCacheControls = unique(routeProbes.map((probe) => probe.vercelCdnCacheControl));
    const varyHeaders = unique(routeProbes.map((probe) => probe.vary));
    const xVercelCacheHeaders = unique(routeProbes.map((probe) => probe.xVercelCache));
    const hasSetCookie = routeProbes.some((probe) => Boolean(probe.setCookie?.trim()));
    const hasErrors = routeProbes.some((probe) => probe.error || !probe.ok);
    const bodyVaries = bodyHashes.length > 1;

    const blockers: string[] = [];
    if (hasErrors) blockers.push("One or more probes failed or returned a non-2xx response.");
    if (hasSetCookie) blockers.push("Set-Cookie was present on at least one probe.");
    if (cacheControls.some(containsPrivateOrNoCache)) blockers.push("Cache-Control contains private/no-store/no-cache.");
    if (bodyVaries) blockers.push("HTML body differs across cache-safety scenarios.");
    if (varyHeaders.some((value) => value.toLowerCase().includes("cookie"))) {
      blockers.push("Vary includes Cookie, which requires explicit cache-key design.");
    }

    return {
      route,
      compatibleWithSharedHtmlCache: blockers.length === 0,
      bodyVaries,
      hasSetCookie,
      cacheControl: cacheControls.join(" / ") || "missing",
      cdnCacheControl: cdnCacheControls.join(" / ") || "missing",
      vercelCdnCacheControl: vercelCdnCacheControls.join(" / ") || "missing",
      vary: varyHeaders.join(" / ") || "missing",
      xVercelCache: xVercelCacheHeaders.join(" / ") || "missing",
      blockers,
    };
  });
}

export function buildPublicCacheSafetyReport({
  generatedAt,
  origin,
  summaries,
}: {
  generatedAt: string;
  origin: string;
  summaries: readonly PublicCacheSafetySummary[];
}) {
  const rows = summaries
    .map((summary) =>
      [
        `\`${summary.route}\``,
        summary.compatibleWithSharedHtmlCache ? "yes" : "no",
        summary.bodyVaries ? "yes" : "no",
        summary.hasSetCookie ? "yes" : "no",
        summary.cacheControl,
        summary.vary,
        summary.xVercelCache,
        summary.blockers.length > 0 ? summary.blockers.join("; ") : "none",
      ].join(" | "),
    )
    .map((row) => `| ${row} |`)
    .join("\n");

  return `# Public Cache-Safety Harness Evidence

Generated: ${generatedAt}
Origin: ${origin}
Status: **IMPLEMENTATION PACKET COMPLETE / OPTIMIZATION NOT YET SHIPPED**

This PR-0B harness probes public marketing routes with controlled anonymous, consent, A/B, synthetic logged-in-cookie, and mobile request states. It records whether headers and HTML are currently compatible with a future shared HTML cache. It does **not** change runtime behavior or relax cache headers.

## Logged-in proof note

The synthetic logged-in-cookie HTTP probe does not grant real Supabase authentication. A real logged-in beta cookie is credential-gated and must not be captured in repo evidence. The companion Vitest coverage renders \`LandingHeader\` with \`isLoggedIn=false\` and \`isLoggedIn=true\`, proving public marketing markup can vary when \`getLandingAuthState()\` resolves true. Future cache-header relaxation must isolate or account for that auth-specific CTA output.

## Route summary

| Route | Shared HTML cache compatible now? | Body varies | Set-Cookie seen | Cache-Control | Vary | x-vercel-cache | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Conservative conclusion

Routes marked \`no\` are not safe for broad shared HTML caching. Keep \`MARKETING_PAGE_CACHE_CONTROL\` unchanged until auth-specific CTA output, A/B variants, consent behavior, and hosted cache headers are either proven invariant or split into cache-keyed/client-only/dynamic boundaries.
`;
}

async function main() {
  const origin = process.env.PUBLIC_CACHE_SAFETY_ORIGIN ?? "https://www.archestimator.com";
  const generatedAt = new Date().toISOString();
  const outputPath =
    process.env.PUBLIC_CACHE_SAFETY_OUTPUT ??
    `.ai/03_plans/2026-06-05-performance-and-speed/evidence/${generatedAt.slice(0, 10)}-public-cache-safety-harness.md`;

  const probes = await runPublicCacheSafetyProbe({ origin });
  const summaries = evaluatePublicCacheSafety(probes);
  const report = buildPublicCacheSafetyReport({ generatedAt, origin, summaries });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, report);

  console.log(report);
  console.log(`\nWrote ${outputPath}`);

  if (
    process.env.PUBLIC_CACHE_SAFETY_FAIL_ON_UNSAFE === "1" &&
    summaries.some((summary) => !summary.compatibleWithSharedHtmlCache)
  ) {
    process.exitCode = 2;
  }
}

if (import.meta.main) {
  void main();
}
