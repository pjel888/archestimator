# Audit Findings — Next.js / Vercel, Headers & Deploy Readiness

Domain 7 · 2026-06-19 Launch-Readiness Audit · READ-ONLY on source.

## Scope & coverage

**Read in full:** `next.config.ts`, `vercel.json`, `.vercelignore`, `.env.example`,
`src/proxy.ts` (the actual route-protection mechanism — see DEPLOY-00), `src/app/layout.tsx`,
`src/app/api/health/route.ts`, `src/lib/auth/redirects.ts` (env/origin resolution),
`scripts/check-vercel-env-readiness.ts`, `check-vercel-production-readiness.ts`, and the
header/analytics tail of `check-vercel-speed-insights-readiness.ts`. Grepped `process.env`
across `src/lib`, the `@vercel/analytics` dist for its script/beacon URLs, worker/wasm usage,
and `report-uri`/`report-to`/robots/sitemap/security.txt across the repo.

**Verified early signals:** (a) **No `middleware.ts`** — route protection lives in
`src/proxy.ts` (Next 16's renamed middleware convention; compiles to `.next/server/middleware.js`,
exports `proxy` + `config.matcher`). (b) CSP is **Report-Only** on `/`,`/workshop`,`/invite`
and **enforced** only on `/share`; `'unsafe-inline'`/`'unsafe-eval'` retained; nonce deferred (D-9).
(c) `vercel.json` `git.deploymentEnabled:false` (CLI-only). (e) PITR/Sentry/Turnstile not built
(other domains). All confirmed.

**Deferred / out of lane:** rate-limiting (Domain 9), RLS/auth correctness (1/2), bundle size
(6), dependency CVEs (12). The CSP **nonce pipeline** is a known deferral (D-9), reported as
context only, not a new finding.

## Reconciliation vs prior packs

| Topic | Prior pack | Status |
|---|---|---|
| CSP Report-Only vs enforced; `unsafe-inline`/`eval` | 2026-06-01 security-owasp `23_THIRD_PASS/16_CSP_HEADER_THREAT_MODEL.md` (SEC-…-016, F-ERR-05) | **covered** — confirmed design choice, nonce deferred. Not re-reported. |
| HSTS present | security-owasp `EG-…-3P-002` flagged HSTS as an evidence gap | **stale** — HSTS is now set in `next.config.ts:111` for share/workshop/invite. Prior gap resolved; remaining gap is the *public marketing* routes (DEPLOY-02). |
| `/workshop`+`/invite` hardening headers | Teamspace T1.5 / Library T18 (`current-state.md:201,204`) | **covered** — shipped. |
| Share API security headers note `no-referrer-when-downgrade` | security-owasp doc 16 | **stale** — code now ships `Referrer-Policy: no-referrer` (`next.config.ts:110`), stronger than the doc's text. |
| Env readiness (names only) | `launch:check-vercel-env` script | **partial** — checks variable *names* exist, not values/format (DEPLOY-04). |
| robots / sitemap / security.txt | none found in any pack | **none** — net-new (DEPLOY-03, DEPLOY-06). |
| `report-uri`/`report-to` for Report-Only CSP | none | **none** — net-new (DEPLOY-01). |

---

## Findings

### DEPLOY-00 — Route protection is `src/proxy.ts`, not middleware (INFO, confirmed)
**launch_blocker:** false
**Evidence:** `src/proxy.ts:53` exports `proxy(request)` + `:144` `config.matcher`; no
`middleware.ts` exists; `.next/server/middleware.js` is the compiled output. Protects
`/workshop/*`, redirects unauth to `/login`, enforces closed-beta allowlist + dev-auth bypass.
**Impact:** Documentation/onboarding only — auditors searching for `middleware.ts` will wrongly
conclude there is no edge auth. The mechanism itself is sound.
**Recommendation:** Note in `current-state.md` that Next 16 uses `proxy.ts`. No code change.
**Effort:** S · **Confidence:** high · **Overlap:** none

### DEPLOY-01 — CSP Report-Only has no `report-uri`/`report-to` sink (violations are discarded) (MEDIUM)
**launch_blocker:** false
**Evidence:** `next.config.ts:93` ships `Content-Security-Policy-Report-Only` on `/`,
`/workshop/*`, `/invite/*` with the policy from `landingReportOnlyCsp` (`:10-21`), which has
**no `report-uri` and no `report-to` directive**; grep for `report-uri|report-to|reporting-endpoints`
across the repo returns nothing. There is no `/api/csp-report` route.
**Impact:** The entire point of Report-Only — observe violations before enforcing — is defeated.
Browsers compute violations and throw them away. The "observation window" the code comments
repeatedly cite (D-9, `next.config.ts:152-156`) collects **zero** data, so the team can never
gain evidence to flip to enforced or to tighten away `unsafe-inline`/`unsafe-eval`. The deferral
becomes permanent by construction.
**Recommendation:** Add `report-to csp-endpoint` (+ a `Reporting-Endpoints: csp-endpoint="/api/csp-report"`
header) and a minimal no-store `/api/csp-report` route that logs to the existing observability sink.
Then the Report-Only window produces actionable data. Low risk, additive.
**Effort:** M · **Confidence:** high · **Overlap:** none

### DEPLOY-02 — Public marketing/auth routes get ZERO security headers (HSTS, nosniff, frame, referrer) (MEDIUM)
**launch_blocker:** false
**Evidence:** `next.config.ts:83-97` (`landingReportOnly`) covers only `/`,`/about`,`/features`,
`/pricing`,`/contact` — and gives them **only** a Report-Only CSP, no `X-Content-Type-Options`,
no `X-Frame-Options`/`frame-ancestors` enforcement, no HSTS, no `Referrer-Policy`. The public
routes `/privacy`, `/terms`, `/login`, `/beta` (enumerated as public in `src/proxy.ts:10-11`)
appear in **no** headers block at all → no CSP, no HSTS, no anti-clickjacking, no nosniff.
`/share` and `/workshop` get the full `shareHardeningHeaders` (`:107-113`) but the marketing/auth
shell does not.
**Impact:** `/login` (the auth entry, credential surface) and `/privacy`,`/terms` are
clickjackable (no `X-Frame-Options`/`frame-ancestors` enforced) and lack HSTS on first contact
(HSTS must be present on the apex/marketing response to seed the browser policy; Vercel may add a
default but it is not guaranteed and not verifiable from the repo). nosniff is also absent on these
responses. For a public beta, the un-hardened `/login` page is the weakest link.
**Recommendation:** Apply `shareHardeningHeaders` (minus `X-Robots-Tag`, which marketing pages
want indexed — see DEPLOY-03) to all public routes, and ship HSTS + `X-Frame-Options:SAMEORIGIN`
(or `frame-ancestors 'self'`) on `/`,`/about`,`/features`,`/pricing`,`/contact`,`/privacy`,
`/terms`,`/login`,`/beta`. Refactor the header arrays so no public route is uncovered. Verify with
`curl -sI` post-deploy.
**Effort:** S · **Confidence:** high · **Overlap:** partial: security-owasp doc 16 restated HSTS
as an evidence gap (EG-…-3P-002) but predates the current per-route hardening; the marketing-route
gap specifically is unreported.

### DEPLOY-03 — No `robots.txt`/`sitemap` and no app-wide `noindex` on authed/token routes (MEDIUM)
**launch_blocker:** false
**Evidence:** No `src/app/robots.ts`, `src/app/sitemap.ts`, or `public/robots.txt` (find returns
nothing). `/share`,`/workshop`,`/invite` carry `X-Robots-Tag: noindex,nofollow` via
`shareHardeningHeaders` (`next.config.ts:112`), but **there is no global robots policy**: with no
`robots.txt`, crawlers are free to crawl everything not header-protected, and there is no positive
allow/sitemap for the marketing pages the team *wants* indexed. `/privacy`,`/terms`,`/login`,
`/beta` have neither a noindex header (DEPLOY-02) nor a robots directive.
**Impact:** SEO is unmanaged for the public marketing surface (no sitemap → slower/weaker indexing
of `/`,`/features`,`/pricing`), and the auth/beta pages may be indexed. Confidential proposal
content on `/share` is header-protected (good) but relies solely on the header — a `robots.txt`
disallow for `/share`,`/api`,`/workshop`,`/invite` is defense-in-depth.
**Recommendation:** Add `src/app/robots.ts` (allow marketing, disallow `/api`,`/workshop`,
`/invite`,`/share`,`/login`,`/beta`) and a `src/app/sitemap.ts` for the marketing routes. This is
partly Domain 11 (SEO) territory — see cross_domain_notes.
**Effort:** S · **Confidence:** high · **Overlap:** none

### DEPLOY-04 — Env readiness validates names only; no value/format/runtime assertion (MEDIUM)
**launch_blocker:** false
**Evidence:** `scripts/check-vercel-env-readiness.ts:88` self-documents: *"checks variable names
only. It does not read or prove secret values, callback URL correctness, … or hosted auth behavior."*
There is no t3-env/zod env schema anywhere (`rg createEnv|@t3-oss|envSchema` → none). Runtime access
is ad-hoc: `src/proxy.ts:15-17` guards `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` presence and **fails
*open*** for non-protected routes when they are missing (`:82-93`), and `src/lib/auth/redirects.ts:21-38`
silently produces an **empty allowed-origins set** if `NEXT_PUBLIC_APP_URL`/`SITE_URL`/
`VERCEL_PROJECT_PRODUCTION_URL` are all unset/malformed. The publication secrets
(`PUBLICATION_TOKEN_ENCRYPTION_SECRET` etc., `.env.example:33-35`) are only name-checked.
**Impact:** A misconfigured/empty critical env in Vercel (e.g. a typo'd `NEXT_PUBLIC_APP_URL`, a
missing `PUBLICATION_TOKEN_ENCRYPTION_SECRET`) is not caught at build or boot — it surfaces as a
runtime failure (broken auth redirects, share links that cannot decrypt) only when a user hits the
path. For a wider beta this is a silent-foot-gun: the name-only check passes while a value is wrong.
**Recommendation:** Add a tiny boot-time assertion module (no new dep) imported from a server entry
that throws on missing/blank values for the production-critical set when `NODE_ENV==='production'`
(URLs parse as absolute https; secrets meet min length; `CLOSED_BETA_ACCESS_ENABLED` is a real bool),
and make `getAllowedAppOrigins` log/throw when it yields an empty set in production.
**Effort:** M · **Confidence:** high · **Overlap:** partial:`launch:check-vercel-env` (names-only,
by design — this finding closes the value/format gap it explicitly disclaims).

### DEPLOY-05 — `X-Powered-By: Next.js` not disabled; no `Permissions-Policy` (LOW)
**launch_blocker:** false
**Evidence:** `next.config.ts` does not set `poweredByHeader:false` (Next defaults to sending
`X-Powered-By: Next.js`), and grep for `Permissions-Policy`/`Cross-Origin-Opener-Policy` returns
nothing across `next.config.ts` and `src/`.
**Impact:** Minor fingerprinting (framework disclosure). Absence of `Permissions-Policy` leaves
camera/microphone/geolocation/etc. at browser defaults — low risk for this app but a cheap
hardening win that scanners (and the prior OWASP pack's posture) will flag.
**Recommendation:** Set `poweredByHeader:false`; add a conservative `Permissions-Policy`
(`camera=(), microphone=(), geolocation=(), browsing-topics=()`) to the shared hardening header set.
**Effort:** S · **Confidence:** high · **Overlap:** none

### DEPLOY-06 — No `security.txt` for vulnerability disclosure (LOW)
**launch_blocker:** false
**Evidence:** No `public/.well-known/security.txt` and no `/.well-known/` route (find returns
nothing).
**Impact:** No published contact path for security researchers ahead of exposing the app to wider
external users. Not exploitable; an industry-standard courtesy/coverage item.
**Recommendation:** Add `public/.well-known/security.txt` (Contact, Expires, Policy URL). Trivial.
**Effort:** S · **Confidence:** high · **Overlap:** none

### DEPLOY-07 — `staleTimes.dynamic:60`/`static:180` router-cache reuse (INFO, confirmed)
**launch_blocker:** false
**Evidence:** `next.config.ts:64-67` sets `experimental.staleTimes {dynamic:60, static:180}`.
Documented (`:58-63`, `current-state.md:201`) as intentional: single-user-per-workspace product,
5-min staleness acceptable, mutations bust cache entries explicitly (Library T4).
**Impact:** A warm-tab navigation can serve a segment rendered up to 60s ago without re-suspending.
For the closed-beta single-user-per-workspace model this is acceptable and was validated. Flagged
only so the data-fetching/RSC auditor (Domain 8) is aware the assumption is "no cross-user shared
mutation surface visible within 60s." If multi-collaborator workshop views land before launch,
re-verify the 60s window does not show stale teammate state.
**Recommendation:** No change. Hand the staleness assumption to Domain 8 for confirmation against
the collaboration/presence surfaces.
**Effort:** S · **Confidence:** high · **Overlap:** covered-by: Library Optimization (current-state.md:201)

### DEPLOY-08 — `images.remotePatterns` scoped only to Supabase public component-images (INFO/LOW, confirmed-good)
**launch_blocker:** false
**Evidence:** `next.config.ts:31-50` builds `remotePatterns` solely from `NEXT_PUBLIC_SUPABASE_URL`,
restricted to `pathname:/storage/v1/object/public/component-images/**`, with `search:""`. No
wildcard hosts. If the env is unset it returns `[]` (no remote optimization).
**Impact:** Correctly tight — no SSRF-via-image-optimizer surface. The only risk is operational:
if a deploy is missing `NEXT_PUBLIC_SUPABASE_URL`, `next/image` for remote component thumbnails
silently fails to optimize (broken images), which ties to DEPLOY-04's env-validation gap.
**Recommendation:** No security change. Covered operationally by DEPLOY-04.
**Effort:** S · **Confidence:** high · **Overlap:** none

### DEPLOY-09 — Vercel Web Analytics under enforced CSP on `/share` — verify, do not assume blocked (INFO)
**launch_blocker:** false
**Evidence:** `src/app/layout.tsx:40` mounts `<VercelWebAnalytics/>` in the **root** layout, so it
renders on `/share` where CSP is **enforced** (`next.config.ts:121`). In **production** the Vercel
analytics package loads its script from the **same-origin** path `/_vercel/insights/script.js`
(`@vercel/analytics/dist/.../index.mjs:85`) and beacons to same-origin `/_vercel/insights/*` — both
covered by `script-src 'self'` and `connect-src 'self'`. Only the **debug** build uses cross-origin
`https://va.vercel-scripts.com` (`:80`), which is NOT in `script-src`.
**Impact:** No production breakage expected (same-origin path is allowed). The residual risk is (a)
a future move to the cross-origin script, or (b) the privacy question of running analytics on the
confidential `/share` proposal surface at all (the `beforeSend` redactor in
`src/lib/analytics/vercel-web-analytics.ts` mitigates URL leakage). Recording so it is verified, not
assumed: confirm with a `curl`/devtools check on a live `/share` page that no CSP violation fires.
**Recommendation:** Verify on the live `/share` route; consider gating `<VercelWebAnalytics/>` to
non-`/share` segments if analytics on shared proposals is undesirable. No config change required if
the same-origin script is confirmed.
**Effort:** S · **Confidence:** medium · **Overlap:** none

### DEPLOY-10 — `git.deploymentEnabled:false` is deliberate; document the human-gate implication (INFO)
**launch_blocker:** false
**Evidence:** `vercel.json:2-4`. CLI-only deploys; no auto-deploy on push.
**Impact:** Correct safety posture (no surprise prod deploy from a concurrent agent's push). The
*implication* to document: there is **no automated production deploy pipeline**, so every launch/
rollback is a manual `vercel` CLI step gated by `launch:check-vercel-production` (which itself only
parses sanitized transcripts, `check-vercel-production-readiness.ts:230`). Ensure the human runbook
for deploy + rollback is current before wider beta.
**Recommendation:** No code change. Confirm the deploy/rollback runbook exists and the
`check-vercel-production` rollback-drill input has actually been exercised once (its
`rollbackDrillStatus` defaults to `not-provided`).
**Effort:** S · **Confidence:** high · **Overlap:** none

## Launch-blocker summary

**No hard launch blockers in this domain.** Production is already live and the token/authed
surfaces (`/share`,`/workshop`,`/invite`) are well-hardened. The highest-value pre-wider-beta fixes
are **DEPLOY-02** (un-hardened `/login` + public routes), **DEPLOY-01** (blind Report-Only CSP),
**DEPLOY-03** (robots/noindex), and **DEPLOY-04** (env value validation) — all MEDIUM, all small/
additive, none blocking.
