# 03 — Source and Codebase Audit

All paths are repo-relative. Line numbers are from the current working tree
(Next.js 16.2.10, React 19.2.7, OpenNext `@opennextjs/cloudflare ^1.20.1`,
wrangler `^4.105.0`, Bun 1.3.14). Evidence was gathered by 4 read-only discovery
lanes + direct file reads by the lead.

## 3.1 Current CSP matrix by route class

Source of truth: `next.config.ts` `headers()` return array (lines 154-288).

| # | Route class | CSP applied? | Mode | Policy value | Hardening headers | next.config.ts source |
|---|---|---|---|---|---|---|
| 1 | `/`, `/about`, `/features`, `/pricing`, `/contact` | Yes | **Report-Only** | `landingReportOnlyCsp` | ⚠️ See note | `:156-170` (`landingReportOnly`) |
| 2 | `/share/:path*` (page) | Yes | **Enforced** | `landingReportOnlyCsp` (same value) | Yes (full `shareHardeningHeaders` + `Cache-Control: no-store`) | `:191-206` (`sharePageEnforced`) |
| 3 | `/api/share/:path*` | **No** | — | none | Yes (`shareHardeningHeaders` only) | `:209-214` (`shareApiSecurityHeaders`) |
| 4 | `/workshop/:path*` | Yes | Report-Only | `workshopReportOnlyCsp` | Yes (`shareHardeningHeaders`) | `:237-247` (`appAndInviteHardening`) |
| 5 | `/invite/:path*` | Yes | Report-Only | `landingReportOnlyCsp` | Yes (`shareHardeningHeaders`) | `:248-257` (`appAndInviteHardening`) |
| 6 | `/:path*` (catch-all) | **No** | — | none | 4 base headers only (no `X-Robots-Tag`) | `:266-279` (`globalHardeningCatchAll`) |

**Policy values:**
- `landingReportOnlyCsp` (`next.config.ts:20-31`): `default-src 'self'`; `script-src`
  includes `'unsafe-inline' 'unsafe-eval'` + Cloudflare Insights, GTM, GA, Clarity;
  `style-src 'self' 'unsafe-inline'`; `img-src`/`connect-src` whitelist GA/Clarity;
  `frame-ancestors 'none'`; `object-src 'none'`; `form-action 'self'`.
- `workshopReportOnlyCsp` (`:33-47`): same base + Google Maps
  (`maps.googleapis.com`, `*.googleapis.com`, `*.gstatic.com`, `*.google.com`,
  `*.ggpht.com`, `*.googleusercontent.com`, `blob:`); `style-src` adds
  `fonts.googleapis.com`; `font-src` adds `fonts.gstatic.com`; `frame-src
  https://*.google.com`; `worker-src 'self' blob:`; `child-src 'self' blob:`.
- `shareHardeningHeaders` (`:180`): `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS, `X-Robots-Tag:
  noindex, nofollow`.
- `globalHardeningCatchAll` (`:266`): only the 4 base hardening headers (no
  `X-Robots-Tag`).

> ⚠️ **Note on row 1 (landing exact-match routes):** Next.js `headers()` does
> per-source matching. The 5 exact `source: "/"`, `"/about"`, etc. blocks
> (`landingReportOnly`, `:156`) emit only the Report-Only CSP header. Whether they
> also inherit the `/:path*` catch-all's 4 hardening headers is a Next.js
> source-matching detail that should be confirmed in-browser during implementation
> (DISCOVERY step in P1). Discovery L1 flagged this as a probable gap. Either way it
> is corrected by moving all CSP + hardening header emission into the proxy (the
> target architecture in `06`), which applies uniformly per request.

## 3.2 Routes with NO CSP today (the gaps)

1. **All API routes except `/api/share/*`** — `/api/ai/*`, `/api/projects/*`,
   `/api/component-library/*`, `/api/internal/*`, `/api/compliance/*`,
   `/api/estimate-row-images`, `/api/health`. (JSON API responses generally don't need
   `script-src`, but if any return HTML error pages they're uncovered.)
2. **`/auth/callback`** (`src/app/auth/callback/route.ts`) — OAuth callback; carries
   `code`/`state` in query. No CSP.
3. **`/api/auth/[...all]`** (`src/app/api/auth/[...all]/route.ts`) — Better-auth
   catch-all. No CSP.
4. **`/login`, `/signup`, `/access-required`** — HTML pages rendering forms. No CSP.
5. **`/trust`, `/privacy`, `/terms`, `/security`, `/new`** — public pages that **load
   third-party analytics via `PublicPageShell`** (`LandingAnalyticsLoader`) but are
   **not** in the `landingReportOnly` source list (`next.config.ts:156-170`). They get
   only the catch-all hardening headers. **This is the most material coverage gap:**
   GA4/Clarity/Cloudflare Insights scripts load with no CSP observing them.
6. **`/`, `/about`, `/features`, `/pricing`, `/contact`** — these 5 get Report-Only
   CSP but (per the source-matching note above) may be missing the 4 hardening headers.

## 3.3 Inline script inventory (what needs the nonce)

| # | Script | Location | Strategy / type | Mounted on | Notes |
|---|---|---|---|---|---|
| 1 | `AuthStateMismatchRecoveryScript` | `src/components/auth/AuthStateMismatchRecoveryScript.tsx:32` | `next/script` `beforeInteractive` + `dangerouslySetInnerHTML` | **Root layout** (`src/app/layout.tsx:32`) → every route | Currently relies on `'unsafe-inline'`. Must accept `nonce` prop. |
| 2 | `LandingStructuredData` (Organization) | `src/components/landing/structured-data.tsx:40` | `<script type="application/ld+json" dangerouslySetInnerHTML>` | Root layout (`src/app/layout.tsx:35`) → every route | JSON-LD is not executed, but under strict CSP it must be nonced OR allowed via the `strict-dynamic` propagation. |
| 3 | `LandingStructuredData` (WebSite) | `src/components/landing/structured-data.tsx:45` | same | same | same |
| 4 | v3 FAQ JSON-LD | `src/components/landing-v3/ArchestimatorLandingPage.tsx:621` | `<script type="application/ld+json">` | homepage `/` only | same |
| 5 | `ClarityScript` | `src/components/landing/ClarityScript.tsx:7-19` | `next/script` `afterInteractive` + inline `dangerouslySetInnerHTML` (injects `https://www.clarity.ms/tag/{id}`) | landing only (via `PublicPageShell` → `LandingAnalyticsLoader`) | Must accept `nonce`. |
| 6 | `CloudflareWebAnalytics` | `src/components/landing/CloudflareWebAnalytics.tsx:13-18` | `next/script` `afterInteractive`, **external src** `https://static.cloudflareinsights.com/beacon.min.js` | landing only | External src → allowlist; `next/script` accepts `nonce` for the wrapper. |
| 7 | `GoogleAnalytics` (`@next/third-parties/google`) | `src/components/landing/LandingAnalyticsLoader.tsx:22` | Emits inline `_next-ga-init` + external `https://www.googletagmanager.com/gtag/js` | landing only (consent-gated) | Supports a `nonce` prop but `LandingAnalyticsLoader` does **not** pass one today. |
| 8 | OAuth reset inline script | `src/lib/cloudflare/worker-route-optimizations.ts:173` | server-rendered HTML `<script>window.location.replace(...)</script>` | Worker route returning `text/html` | Needs nonce injection in the HTML string OR a per-route policy. |
| 9 | Pending-invite inline script | `src/app/workshop/pending-invite/route.ts:56` | server-rendered HTML `<script>window.location.replace(...)</script>` | invite-accept redirect page | same |

**Plus Next.js's own inline scripts** (RSC flight data, hydration bootstraps). Per the
official guide: when a nonce is provided via the `x-nonce` request header, Next.js
auto-applies it to these. No manual work needed.

## 3.4 Inline style inventory (why `style-src 'unsafe-inline'` stays)

| Site | Location | Type |
|---|---|---|
| `PublicPageShell` | `src/components/landing/PublicPageShell.tsx:21` | keyframe animation `<style>` |
| `spinner` | `src/components/ui/spinner.tsx:39` | `<style>` |
| `NeatWireframeBackground` | `src/components/landing/NeatWireframeBackground.tsx:151` | `<style>` |
| `ClaimFilter` | `src/components/landing/claims-ledger/ClaimFilter.tsx:82` | `FILTER_STYLE` const |

**No runtime CSS-in-JS** (no styled-components/emotion/stitches). Tailwind v4 compiles
to static CSS (`src/app/globals.css:1` `@import "tailwindcss"`). CSS Modules are
static. React-rendered `<style>` tags cannot be nonced natively → the standard posture
is `style-src 'self' 'unsafe-inline'` (DEC-08).

## 3.5 Third-party origin inventory (target directive allowlists)

### script-src (allowlist + nonce + strict-dynamic)
- `https://static.cloudflareinsights.com` — Cloudflare beacon (landing only)
- `https://www.clarity.ms` — Clarity loader (landing only)
- `https://www.googletagmanager.com` — GA4 (landing only)
- `https://maps.googleapis.com` — Google Maps loader, **dynamically injected via
  `document.createElement("script"`** at `src/lib/google-maps/loader.ts:74` (workshop
  only). Under `strict-dynamic`, a nonced script that creates a child script propagates
  the allowance; but the Maps loader is created without a nonce → needs allowlist in
  workshop policy.

### img-src
- `'self' data: blob:` (base)
- `maps.googleapis.com` — workshop static map tiles
- `*.ggpht.com`, `*.googleusercontent.com`, `lh3.googleusercontent.com` — Google OAuth
  user avatars (`src/components/ui/avatar.tsx`, `src/components/sidebar/MainSidebar.tsx:306`
  use `unoptimized` → raw `<img src>`; `better-auth-cloudflare.ts:289` reads `avatarUrl`).
  **Already in workshop CSP; MISSING from landing CSP** → would break the landing
  header avatar for a logged-in user viewing `/`. Must be added to the landing policy.
- ⚠️ **Demo seed hosts** (`images.unsplash.com`, `www.ikea.com`, `www.boysen.com.ph`,
  `www.daviespaints.com.ph`, `www.mariwasa.com`, `www.matimco.com`, `www.wilcon.com.ph`,
  `floorcenter.com`, `nirogranite.com`, `encrypted-tbn0.gstatic.com`,
  `thumbor.forbes.com`) — referenced in `src/components/workshop/estimate-tree-data.ts:142-268+`.
  **In no CSP and no `next.config` `remotePatterns`** → already partially broken under
  `next/image` optimization. Decision needed (DEC-12): migrate to local thumbnails vs
  allowlist.

### connect-src
- `'self'` (base; all client `fetch()` are relative)
- `wss:` / `ws:` — **MISSING today.** Collaboration Durable Object WebSocket
  (`src/lib/cloudflare/collaboration-room-client.ts:81` `new WebSocket(this.url)`,
  built same-origin from `window.location.href` at `:27-32`). **Would break under any
  enforced CSP until added.**
- analytics domains (landing only): `cloudflareinsights.com`, `*.cloudflareinsights.com`,
  `www.google-analytics.com`, `region1.google-analytics.com`, `www.clarity.ms`,
  `*.clarity.ms`
- Note: `https://api.deepseek.com` (`src/lib/ai/deepseek.ts:29`) is **server-side only**
  → not needed in CSP.

### font-src
- `'self' data:` is sufficient. `fonts.gstatic.com` is in the workshop CSP but
  **nothing fetches it** (no Google Fonts; the only `@font-face` is local `Doto` at
  `src/app/globals.css:6`; the `"Geist"` font-family string at `:38` has no `@font-face`
  → resolves to system fallbacks). **Can be dropped.**

### frame-src
- **None in production.** No `<iframe>` in `src/`. `frame-src https://*.google.com` in
  the workshop CSP is unused (Google Maps is loaded via JS API + DOM, not iframe).
  **Can be dropped.**

### worker-src
- `'self'` is sufficient. No web workers, service workers, or worklets in `src/`.
  `worker-src 'self' blob:` + `child-src 'self' blob:` are defensive-only.

### frame-ancestors / object-src / base-uri / form-action
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
  — keep (already correct).

## 3.6 Nonce infrastructure today: **none**

- `grep` for `nonce`, `generateNonce`, `RequestHeadersNonce`, `createNonce` across the
  repo → **zero matches** (excluding `node_modules`).
- 26 `crypto.randomUUID()` hits — all unrelated (data IDs for invitations, privacy
  requests, scan overrides, proof runs).
- No `x-nonce` request header read anywhere.
- No `nonce=` prop on any `<Script>` component.
- No `generateComponents` import.

**Implication:** the nonce pipeline is fully greenfield. The natural site is the proxy.

## 3.7 Proxy / request-level hook

- `src/proxy.ts` — thin wrapper delegating to `requestProxy`.
- `src/lib/auth/request-proxy.ts:130` — `export async function proxy(request)`
  implementing the Next 16 proxy pattern. Already:
  - Runs on every non-static route (matcher excludes `_next/static`, `_next/image`,
    `favicon.ico`; impl also short-circuits paths with `.` / starting `/_next` or
    `/api`).
  - **Injects per-request request headers** via
    `createRequestPathResponse()` → `NextResponse.next({ request: { headers: requestHeaders } })`.
    This is the **exact nonce-injection pattern** from the official Next.js CSP guide.
  - Sets `Cache-Control` (marketing `s-maxage=31536000`; sensitive `private, no-cache,
    no-store, max-age=0, must-revalidate`).
  - Sets `Clear-Site-Data` on the OAuth mismatch redirect.
  - Does **not** set `Content-Security-Policy` or any `x-nonce` header today.
- `src/instrumentation.ts` — `register()` is a no-op; `onRequestError` is a post-error
  hook (cannot modify response headers). Not usable for nonce injection.

> **Proxy matcher gap (official best practice):** the current matcher
> `["/((?!_next/static|_next/image|favicon.ico).*)"]` does **not** exclude prefetch
> requests. The official Next.js CSP guide recommends additionally ignoring
> `next-router-prefetch` / `purpose: prefetch` requests to avoid nonce churn and CSP
> mismatches between prefetched route data and the eventual render. This is a low-risk,
> high-value matcher adjustment included in the implementation plan (P1).

## 3.8 OpenNext / Cloudflare Workers deployment

- `wrangler.jsonc` — `name: archestimator-proof`, `main: worker.ts`,
  `compatibility_date: 2026-06-29`, `nodejs_compat`. **No `headers[]` block** → no
  interference with response headers. Bindings: R2 `ARCH_UPLOADS_R2`, D1 `ARCH_DB`, DO
  `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`.
- `wrangler.next-dev.jsonc` — dev bindings only; no headers.
- `open-next.config.ts` — minimal `defineCloudflareConfig()` with **no overrides** (no
  custom header/response rewriting).
- `worker.ts:85-100` — the Worker `fetch` handler wraps
  `generatedOpenNextWorker.fetch` with pre-route optimizations and a post-route
  `normalizeAuthStateMismatchRedirectResponse`. Line 93-94 (`return response`) is the
  **outermost response wrapper** — a fallback nonce-injection point if ever needed,
  but the proxy path is the correct one (it can set the request header that server
  components read).
- Build pipeline: `next build` → OpenNext (`cf:build` sets
  `ARCHESTIMATOR_CLOUDFLARE_BUILD=1`). The `next.config.ts:77-91` block swaps the image
  loader and aliases `sharp` for the Cloudflare build only.

**OpenNext + proxy + dynamic per-request headers on Workers: COMPATIBLE.** The auth
gating already proves dynamic per-request behavior works (Better-Auth identity
resolution, per-route cache control). A per-request nonce generated in the proxy will
survive the request lifecycle **within the same Worker invocation**.

**Header-ownership conflict:** `next.config.ts headers()` ALSO emits CSP for `/share`,
landing, `/workshop`, `/invite`. When the proxy adds its own CSP, Next appends/dedupes
→ risk of two CSP headers (browser applies the union/first depending on browser). The
rollout must **move CSP out of `next.config.headers()`** for nonced routes (the 4 plain
hardening headers can stay static since they don't need the nonce). This is
`OPEN-DEC-007` from the prior decision brief.

## 3.9 Root layout

`src/app/layout.tsx` — currently a **synchronous** Server Component rendering
`AuthStateMismatchRecoveryScript`, `AppProviders`, `LandingStructuredData`,
`LiquidGlassReady`. It does **not** call `headers()`. To consume a nonce it must become
`async` and `await headers()` to read `x-nonce`, then propagate the nonce down.

`headers()` is already used elsewhere to read proxy-injected headers
(`src/app/workshop/layout.tsx:19` reads `AUTH_REQUEST_PATH_HEADER`; `share/[token]/page.tsx`,
`invite/[token]/page.tsx`, `session.ts`) — proving the pattern works in this codebase.

## 3.10 CSP violation reporting today: **none**

`grep` for `csp-report`, `report-to`, `Reporting-Endpoints`, `report-uri` across
`src/app/api`, `next.config.ts`, `worker.ts` → **zero matches**. No `/api/csp-report`
route. The `OPEN-DEC-008` observation window (CSP violation telemetry for 7 consecutive
days) **cannot close** until a reporting endpoint + `Reporting-Endpoints` / `report-to`
header exist. This is a P1 prerequisite.

## 3.11 Existing CSP/security-header tests

All under `tests/vitest/`, run via `bun run test:dom` (= `vitest run --maxWorkers=1`,
serial — `fileParallelism:false` is load-bearing). Per-file: `bunx vitest run <file>`.

| # | File | What it tests | Asserts | Run |
|---|---|---|---|---|
| 1 | `tests/vitest/landing-security-headers.test.ts` | Imports live `nextConfig.headers()` output | Exact source order; landing Report-Only has the listed sources; `/share` enforced; `/workshop`+`/invite` Report-Only + hardening; catch-all has 4 headers + no CSP | `bunx vitest run tests/vitest/landing-security-headers.test.ts` |
| 2 | `tests/vitest/next-config-workshop-headers.test.ts` | Reads `next.config.ts` as raw text | Source contains `/workshop/:path*`, `Content-Security-Policy-Report-Only`, hardening headers, appAndInvite wiring | `bunx vitest run tests/vitest/next-config-workshop-headers.test.ts` |
| 3 | `tests/vitest/project-location-map-csp.test.ts` | Imports `nextConfig` | workshop CSP has maps/google domains + worker/child blob; `/share` has none; no `supabase.co`/OSM/mapbox | `bunx vitest run tests/vitest/project-location-map-csp.test.ts` |
| 4 | `tests/vitest/project-publication-security-headers.test.ts` | Imports `nextConfig` | `/share` CSP exact contract; `no-store`; 5 hardening headers; no supabase/wildcard; `/api/share` same 5 | `bunx vitest run tests/vitest/project-publication-security-headers.test.ts` |
| 5 | `tests/vitest/project-publication-security.test.ts` | Publication token/password/CSRF | P11 block (lines 235-258) is **placeholder `expect(true).toBe(true)`** — no live assertion against next.config | `bunx vitest run tests/vitest/project-publication-security.test.ts` |
| 6 | `tests/vitest/project-location-privacy-source.test.ts` | Reads source as text | Maps bounded to workshop; no OSM/mapbox | `bunx vitest run tests/vitest/project-location-privacy-source.test.ts` |
| 7 | `tests/vitest/cloudflare-web-analytics-integration.test.ts` | Reads source as text | Beacon sources in CSP; never in root layout or `/share` | `bunx vitest run tests/vitest/cloudflare-web-analytics-integration.test.ts` |
| 8 | `tests/vitest/shared-link-header-smoke-script.test.ts` | Tests `scripts/smoke-share-headers.mjs` | Smoke helper requires the 7 share headers; token redaction | `bunx vitest run tests/vitest/shared-link-header-smoke-script.test.ts` |

**Critical impact:** tests #1, #3, #4 import `nextConfig` and assert against the
**current static policy strings**. Any move to proxy-owned nonced CSP will break these
assertions (the policy is no longer in `next.config.headers()`). They must be
**rewritten** to test the proxy output (a unit test that invokes `proxy()` with a
mock `NextRequest` and asserts the returned `NextResponse` headers). Test #5's P11
placeholders should become real assertions. Test #2 reads source as text and needs
updating.

## 3.12 package.json scripts (relevant)

- `type-check` → `tsc --noEmit`
- `lint` → `eslint`; `lint:design-system`, `lint:font-size`, `lint:design`
- `test` → `bun test tests/unit` (bun unit tests)
- `test:dom` → `vitest run --maxWorkers=1` (where all CSP tests run)
- `test:e2e` → `playwright test`
- `validate` → type-check + lint + lint:design-system + lint:design + test + test:dom
  (**the full gate**)
- `validate:agents` → `node scripts/validate-ai-workflow-adapters.mjs`
- `cf:build` / `cf:deploy` / `cf:preview`
- `launch:verify-hosted-sensitive-routes` → `bun run scripts/verify-hosted-sensitive-route-fail-closed.ts`

**No CSP-specific test script exists** (no `test:csp`). CSP coverage is embedded in
`test:dom`. The plan recommends adding a focused `test:csp` script (DEC-10).

## 3.13 Prior `.ai` decisions this plan reconciles

- **D-9 / D6** (`.ai/10_state/decisions.md:99, 1004`): CSP tightening to per-request
  nonce is **deliberately deferred**; workshop/invite Report-Only first. Quoted in
  `next.config.ts:178-179, 230-236`.
- **OPEN-DEC-007** (`.ai/10_state/compliance/csp-decision-brief.md`): CSP enforcement
  location. Recommended = keep in `next.config.ts` until a per-request nonce pipeline
  is designed; rejects immediate global enforced CSP (retains unsafe-inline/eval) and
  edge-only Worker rewrite (harder to test). Explicitly states: "Strict CSP with
  nonces is not static; that later step likely needs middleware/request-time
  integration... Treat that as a separate implementation plan before changing the
  enforcement surface." **This pack is that plan.** → **CLOSED** by DEC-01.
- **OPEN-DEC-008** (same brief): third-party allowlist. Recommended = keep `/share`
  map-free/tracking-free; workshop/invite Report-Only until telemetry; no new sources
  without brief+test. → **CLOSED** by DEC-02 / DEC-03.
- `current-state.md:377-381`: P0.2 CSP status PARTIAL as of 2026-07-05. "P0.2 remains
  partial until strict nonced CSP location, third-party allowlist, implementation,
  browser proof, and telemetry gates close." This plan defines those gates.

## 3.14 Document-impact matrix

| Document | Purpose | Affected by implementation? | Action |
|---|---|---|---|
| `.ai/10_state/compliance/csp-decision-brief.md` | OPEN-DEC-007 / OPEN-DEC-008 | Yes — both close | Update to record closure (DEC-01/02/03) |
| `.ai/10_state/decisions.md` | D-9 / D6 | Yes — superseded by this plan's phased enforcement | Add new DEC-* entries |
| `.ai/10_state/current-state.md` | P0.2 PARTIAL | Yes — moves toward CLOSED as phases land | Update per phase |
| `next.config.ts` (in-code comments) | Deferral notes | Yes — remove deferral comments once enforced | Update comments |
| `.ai/01_roadmap/02-security-tenancy-data-protection.md` | CSP roadmap row | Yes | Update status per phase |
| `.ai/01_roadmap/00-production-readiness-dashboard.md` row 1.21 | CSP dashboard | Yes | Update per phase |
| `.ai/01_roadmap/01-launch-gates-master-checklist.md` SEC-05 | Token boundary (not CSP) | No — SEC-05 is token enumeration/lockout, not CSP (the next.config comments conflate them) | Clarify in update |
