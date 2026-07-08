# 03 — Source And Codebase Audit — Production RUM And CWV Telemetry

This audit is the codebase ground truth the implementation AI must verify before
editing. Every path/symbol below was confirmed by an independent read-only
Explore sweep on 2026-07-07. Re-read immediately before editing — assume
concurrent agents.

## 1. Existing performance instrumentation (server-side)

**`src/lib/perf/server-timing.ts`** — the sole perf lib file. Exports:
- `withPerfTraceRequest(scope, fn)` — wraps a request in `AsyncLocalStorage`; logs `[perf-json]` to console. Dormant unless `PERF_TRACE=1`.
- `traced(label, fn)` — async timer; logs `[perf] <label> <ms>ms`.
- `traceDatabaseFetch(label, operation, relation, fn)` — DB round-trip timer.
- `instrumentDatabaseFetch(fetchImpl)` — fetch wrapper classifying Supabase RPC/REST URLs. **Defined but not imported anywhere in `src/` (dead/orphaned).**
- `getCurrentPerfTraceSnapshot()` — reads current trace (used by `route-error.ts` for error correlation).
- Types: `PerfTraceEvent`, `PerfTraceSnapshot`, `PerfTraceKind`, `DatabaseOperation`.

**Key limitation:** despite the filename, it emits **no `Server-Timing` HTTP
header** — only `console.log`. Safe labels only (regex-sanitized); stores no
ids/URLs/cookies. **Out of scope for this pack** (no Server-Timing work).

Consumers of `traced`/`withPerfTraceRequest`: `src/lib/auth/session.ts`,
`src/lib/repositories/workspace-repository.ts`,
`src/lib/repositories/recipient-proposals-repository.ts`,
`src/components/workshop/ProjectChromeAsync.tsx`,
`src/components/workshop/library/LibraryComponentsRoute.tsx`, and every workshop
page under `src/app/workshop/**/page.tsx`. **Unchanged by this pack.**

## 2. Existing client CWV (dev-only, no transmission)

- **`src/components/workshop/WebVitalsProbe.tsx`** — `export function WebVitalsProbe()`.
  Uses Next's `useReportWebVitals` from `next/web-vitals` (NOT the `web-vitals`
  npm package). Covers FCP/LCP/INP/CLS/TTFB but only `console.log`s when
  `NEXT_PUBLIC_PERF_TRACE=1`; **returns early in production and sends nothing.**
  Mounted in `WorkshopPageShell.tsx:176`. **Unchanged by this pack** (kept as dev probe).
- **`src/components/performance-monitor.tsx`** — `PerformanceMonitor` client
  component. Subscribes to `useNavigationUiStore`; logs
  `[Performance] <icon> <route> → <ms>` only in `NODE_ENV === "development"`.
  Mounted globally in `src/app/providers.tsx:39`. **The natural neighbor for the new RUM component.**
- **`src/components/bfcache-handler.tsx`** — `BfcacheHandler`. Listens for
  `pageshow` `event.persisted` → `bfcacheRestore()`. No telemetry. Mounted in `providers.tsx`.
- **`src/components/navigation-listener.tsx`** — `NavigationListener`. Drives the route-loading overlay store; not telemetry.
- **`src/stores/navigation-ui-store.ts`** — zustand store (`isNavigating`, `startTime`, `targetHref`, `bfcacheRestore`).

No direct `PerformanceObserver`, `performance.mark`, or `performance.measure`
calls exist in `src/`. (The only `performance.getEntriesByType` usage is inside
`e2e/route-transition-performance.spec.ts`, evaluated in-page.)

## 3. Existing telemetry/analytics collection points

**Third-party analytics (landing/public only, consent-gated):**
- **`src/components/landing/LandingAnalyticsLoader.tsx`** — `LandingAnalyticsLoader`
  client component. Consent-gated via `useLandingCookieConsent`; conditionally
  renders Cloudflare Web Analytics, GA4, and Microsoft Clarity from
  `NEXT_PUBLIC_*` env vars. Mounted only in
  `src/components/landing/PublicPageShell.tsx:42` (public/marketing pages) —
  **NOT mounted in the workshop app.**
- **`src/components/landing/CloudflareWebAnalytics.tsx`** —
  `CloudflareWebAnalytics({token})`. Loads
  `https://static.cloudflareinsights.com/beacon.min.js` via `next/script` with
  `data-cf-beacon`. **This is the existing component the landing slice reuses/enables.**
- `src/components/landing/ClarityScript.tsx` — `ClarityScript({projectId})`.
- GA4 via `@next/third-parties/google`'s `GoogleAnalytics` component (the only first-party dep powering analytics).

**First-party client error ingestion (the beacon template — NOT perf/RUM):**
- **`src/lib/observability/client-error-report.ts`** — `buildClientErrorPayload`,
  `postClientErrorReport`, `sanitizeClientErrorText`, type
  `ClientErrorReportPayload`. POSTs to `/api/internal/client-error` (uses
  `fetch`, not `navigator.sendBeacon`). **Model the new RUM client sender on this.**
- **`src/app/api/internal/client-error/route.ts`** — `POST` handler. Same-origin
  + Fetch-metadata gated, in-memory rate limit (10/min per `cf-connecting-ip`),
  16KB body cap, redacted, logs `client_error` event via `consoleAppLogger`.
  **Model the new `/api/internal/rum` route on this.**
- `src/app/global-error.tsx` — calls `postClientErrorReport` from the global error boundary.

**Observability logger (server):**
- `src/lib/observability/` — `logger.ts` (`AppLogger`, `LogRecord`,
  `consoleAppLogger`), `redact.ts` (`redactForLog`), `app-error.ts`
  (`normalizeAppError`), `route-error.ts` (`errorResponse`,
  `problemDetailsResponse` — RFC 9457), `client-identity.ts`,
  `toast-config.ts`, `with-action-errors.ts`, `action-result.ts`, `types.ts`.

**No `navigator.sendBeacon` usage anywhere.** No `/telemetry`, `/rum`, `/metrics`,
`/web-vitals`, `/analytics`, or `/collect` Route Handlers exist. No Server Actions
ingest perf data. No PostHog/Umami/Plausible/Vercel Analytics SDKs. (The one
`Plausible` grep hit is an unrelated UI string in `source-trust-model.ts`.)

## 4. Cloudflare Workers Observability / Analytics config

- **`wrangler.jsonc`** — observability configured:
  - `observability.enabled: true`
  - `observability.head_sampling_rate: 0.1`
  - `observability.logs.enabled: true`, `.head_sampling_rate: 0.1`, `.invocation_logs: true`, `.persist: true`
  - `observability.traces.enabled: true`, `.head_sampling_rate: 0.05`, `.persist: true`
  - Defines `r2_buckets` (`ARCH_UPLOADS_R2`), `d1_databases` (`ARCH_DB`), `durable_objects` (`COLLAB_ROOMS` / `CollaborationRoom`), `queues` (`UPLOAD_JOBS_QUEUE` producer + consumer with DLQ), `triggers.crons` (3 daily crons), `send_email` (`EMAIL`), `assets`, `images`, custom domain `routes`.
  - **No `analytics_engine` binding exists.** The implementation must add one (e.g. `RUM`).
- **`worker.ts`** — worker entry; `fetch`/`scheduled`/`queue` handlers. Reads/writes `request`/`response` but **does NOT read `request.cf` metadata** (no colo/country/asn/tlsVersion access). **Out of scope for v1** (deferred to `OPEN-PRIV-02`).
- `open-next.config.ts` — minimal: `defineCloudflareConfig()` with no overrides.

`src/app/api/internal/client-error/route.ts:38-43` reads the `cf-connecting-ip`
**request header** for rate-limit keying, but does not touch `request.cf`.
**Model the rate-limit key on this; do not persist the IP.**

## 5. CSP / privacy surface

- **CSP is defined in `next.config.ts`** (NOT middleware — there is no
  `middleware.ts`/`middleware.tsx`). Two policy strings via `next.config.ts` `headers()`:
  - `landingReportOnlyCsp` (lines ~20–31): `Content-Security-Policy-Report-Only`
    for `/`, `/about`, `/features`, `/pricing`, `/contact`, `/invite/:path*`.
    **Already allows analytics origins:** `script-src` includes
    `https://static.cloudflareinsights.com`, `https://www.googletagmanager.com`,
    `https://www.google-analytics.com`, `https://www.clarity.ms`; `connect-src`
    includes `https://cloudflareinsights.com`, `https://*.cloudflareinsights.com`,
    `https://www.google-analytics.com`, `https://region1.google-analytics.com`,
    `https://www.clarity.ms`, `https://*.clarity.ms`.
  - `workshopReportOnlyCsp` (lines ~33–47): `Content-Security-Policy-Report-Only`
    for `/workshop/:path*`. Same analytics origins plus Google Maps; `connect-src`
    also permits `data: blob:`.
  - `/share/:path*` is **enforced** (`Content-Security-Policy`, value = `landingReportOnlyCsp`) per lines ~191–206.
  - Global catch-all `/:path*` applies only the 4 hardening headers (nosniff, DENY, no-referrer, HSTS) — **no CSP** (lines ~266–279).
- **A first-party RUM endpoint at `/api/internal/rum` is already covered by
  `connect-src 'self'`** in both Report-Only policies; the implementation should
  still add it explicitly to both `connect-src` lists for clarity. A new
  third-party destination would need CSP additions (none planned for v1).
- CSP uses `'unsafe-inline'`/`'unsafe-eval'` everywhere except `/share`;
  nonce enforcement is **deferred** to `2026-07-07-global-nonced-csp-enforcement`.
  **Coordinate, do not duplicate.**

**Privacy/consent:**
- `src/components/landing/CookieConsentBanner.tsx` — `CookieConsentBanner` client component. Two-button (Essential only / Accept analytics) using `useSyncExternalStore`.
- `src/lib/landing/consent.ts` — `LANDING_CONSENT_COOKIE_NAME` (`archestimator_cookie_consent`), `LANDING_CONSENT_MAX_AGE_SECONDS` (180 days), `createLandingConsentState`, `serializeLandingConsentState`, `parseLandingConsentValue`, `getLandingConsentFromCookieHeader`, `hasLandingAnalyticsConsent`, `getCookieValue`. Versioned schema (`version: 1`, single `analytics: boolean` flag).
- `src/lib/landing/useLandingCookieConsent.ts` — `useLandingCookieConsent` hook (consumed by `LandingAnalyticsLoader`).
- `src/app/api/compliance/privacy-requests/route.ts` — privacy/DSAR request handler.
- `src/app/privacy/`, `src/app/trust/`, `src/app/security/` route groups exist for policy pages. **The privacy notice update goes here (`OPEN-CONSENT-01`).**

Consent is **landing-only**: workshop (`/workshop/*`) has no consent gate and no analytics loaded today.

## 6. Layout/root mount points

- **`src/app/layout.tsx`** — **Server Component** (root). Renders
  `<AuthStateMismatchRecoveryScript/>`, `<AppProviders>`,
  `<LandingStructuredData/>`, `<LiquidGlassReady/>`.
- **`src/app/providers.tsx`** — **Client Component** (`"use client"`). `AppProviders`
  wraps the app in `QueryClientProvider` > `ToastProvider` >
  `NotificationProvider` and mounts `BfcacheHandler`, `PerformanceMonitor`,
  `NavigationListener`, `RealtimeAuthBridge`, `RouteLoadingOverlay`.
  **This is the canonical global client mount — the new RUM component composes here.**
- `src/app/global-error.tsx` — **Client Component** global error boundary (own `<html>/<body>`, outside providers).
- `src/app/workshop/layout.tsx` — **Server Component** (auth + terms gate only).
- Error boundaries (Client Components): `src/app/workshop/library/error.tsx`, `library/components/error.tsx`, `library/templates/error.tsx`, `library/templates/[templateId]/error.tsx`, `projects/[projectId]/data/error.tsx`, `projects/[projectId]/estimates/error.tsx`, `projects/[projectId]/estimates/[nodeId]/error.tsx`, `publisher/error.tsx`.
- Public shell: `src/components/landing/PublicPageShell.tsx` — mounts `CookieConsentBanner` + `LandingAnalyticsLoader`.
- Workshop shell: `src/components/workshop/WorkshopPageShell.tsx` — mounts `WebVitalsProbe` (dev-only).

## 7. Existing performance tests / synthetic gates (independent of RUM)

- **`e2e/route-transition-performance.spec.ts`** — Playwright spec (`test:e2e:perf`). Asserts navigation duration, resource/script/`_next` counts, Slow-3G budgets, link-transition medians, bfcache restore, authenticated hover-prefetch RSC counts. Reads `e2e/route-transition-performance-budgets.json`. The richest existing perf gate. **Unchanged; RUM is complementary.**
- `scripts/check-performance-budgets.mjs` — advisory per-route gzipped first-load JS budget gate (default 350KB). Non-blocking unless `--strict`.
- `tests/vitest/workshop-dashboard-perf-tracing.test.ts` — unit-tests the `server-timing.ts` perf-trace primitives.
- `tests/vitest/public-font-lcp-audit.test.ts` — guards font/LCP strategy.
- `tests/vitest/perf/` folder — render baselines (estimate-sheet, projects-page, library, right-sidebar). Not CWV.
- Perf scripts: `scripts/measure-route-transitions.ts` (`perf:measure-routes`), `scripts/check-route-transition-readiness.ts` (`perf:check-routes`), `scripts/measure-workshop-dashboard-query-count.ts`, `scripts/seed-performance-test-data.ts`, `scripts/measure-library-performance-baseline.ts`, `scripts/collect-live-db-performance-evidence.ts`, `scripts/verify-cloudflare-hosted-performance.ts` (`cf:verify-hosted-performance`).

## 8. Package.json — relevant versions and scripts

- `next`: **16.2.10**
- `react`: **19.2.7**
- `@opennextjs/cloudflare`: **^1.20.1**
- `@next/third-parties`: **^16.2.6**
- **`web-vitals`: NOT present** (not in dependencies/devDependencies). **The implementation must add it** (`web-vitals@^5`, see `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`).
- No `@vercel/analytics`, `@vercel/speed-insights`, `posthog`, `umami`, `plausible`, or `sentry`.

Scripts: `build`, `cf:build`, `cf:deploy`, `cf:typegen` (regenerate Worker Env types when bindings change — **must run after adding `RUM` binding**), `cf:verify-hosted-performance`, `type-check` (`tsc --noEmit`), `lint`, `test` (`bun test tests/unit`), `test:dom` (`vitest run`), `test:e2e`, `test:e2e:perf`, `perf:*`, `validate`.

Toolchain: `bun@1.3.14` (packageManager), Vitest, Playwright, ESLint flat config, TypeScript.

## 9. Gaps — what is clearly MISSING for production RUM/CWV

1. **No production CWV transmission path.** `WebVitalsProbe` is hard-gated to `NEXT_PUBLIC_PERF_TRACE=1` and ships nothing in prod. No `reportWebVitals` export at the app root, no `web-vitals` npm lib, no ingestion route.
2. **No RUM ingestion endpoint.** Only `/api/internal/client-error` exists. A new `/api/internal/rum` is required.
3. **No `sendBeacon` / `visibilitychange` flush strategy.**
4. **No `analytics_engine` binding** in `wrangler.jsonc`; `worker.ts` never reads `request.cf`.
5. **CSP pre-allows third-party analytics origins** but a first-party `/api/internal/rum` should be added explicitly to both Report-Only `connect-src` lists.
6. **Consent is landing-only.** Workshop has no consent surface and no analytics. Workshop RUM is owner-gated (`OPEN-CONSENT-01`).
7. **No RUM dashboard or alert thresholds.**
8. **No privacy-notice mention** of performance telemetry.

## 10. Sibling pack boundaries (no overlap)

- `2026-07-07-cloudflare-worker-production-observability-and-budgets` — server/edge observability only; explicitly lists "Frontend visual/UX changes" as a non-goal. No RUM/CWV. **No overlap.**
- `2026-07-07-observability-alert-proof-and-log-retention` — server alerting + log retention. Mentions Cloudflare Web Analytics only as an existing operator-flag readiness gate to convert to artifact proof. **No overlap.**
- `2026-07-07-global-nonced-csp-enforcement` — nonce CSP. **Coordinate only** (CSP `connect-src` additions for `/api/internal/rum`).

## Document-impact matrix

| Document/path | Impact | Action |
|---|---|---|
| `wrangler.jsonc` | Required change (add `analytics_engine` binding `RUM`) | Implementation Phase 4; run `cf:typegen` after |
| `next.config.ts` | Probable change (explicit `connect-src 'self'` for `/api/internal/rum` in both Report-Only policies) | Phase 5 |
| `package.json` | Required change (add `web-vitals@^5`) | Phase 2 |
| `src/app/providers.tsx` | Required change (mount new RUM component) | Phase 2 |
| New `src/components/observability/RumReporter.tsx` (proposed) | New file | Phase 2 |
| New `src/lib/observability/rum-client.ts` (proposed) | New file | Phase 2 |
| New `src/lib/observability/rum-route-bucket.ts` (proposed) | New file | Phase 5 |
| New `src/app/api/internal/rum/route.ts` (proposed) | New file | Phase 3 |
| New `src/lib/observability/rum-server.ts` (proposed) | New file | Phase 4 |
| New migration `migrations/0039_rum_rollup.sql` (proposed) | New file (D1 rollup table, optional) | Phase 6 |
| New cron handler in `worker.ts` `scheduled()` | Probable change | Phase 6 |
| `src/app/privacy/page.tsx` (or equivalent) | Probable change (privacy notice) | Phase 9 |
| Tests under `tests/vitest/` + `e2e/` | New | Phases 2–9 |
| `src/components/landing/CloudflareWebAnalytics.tsx` | Verification only (already exists; landing enablement is config/env) | Phase 1 |
| `src/components/workshop/WebVitalsProbe.tsx` | Explicitly unaffected | — |
| `src/lib/perf/server-timing.ts` | Explicitly unaffected | — |
| `e2e/route-transition-performance.spec.ts` | Explicitly unaffected (complementary) | — |
