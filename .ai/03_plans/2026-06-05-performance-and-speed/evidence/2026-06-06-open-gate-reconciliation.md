# Open gate reconciliation — 2026-06-06

Status: **LOCAL DECISION GATES RECONCILED / PROVIDER GATES STILL OPEN**.

## Purpose

Reconcile stale decision/security checkboxes in `09-open-gates-and-provider-evidence.md` after PR-0B/PR-1 local implementation and provider attempts. This artifact does not close before/after Speed Insights comparison, signed-in auth fixture, hosted proposal export proof, or post-deploy protected redirect cache proof.

## Gates closed by current source/test evidence

### Marketing visual degradation

Decision: **closed for this branch**.

Evidence:

- `evidence/neat-mobile-fallback-2026-06-06/neat-mobile-fallback-summary.md` records that `NeatWireframeBackground` keeps a static fallback for mobile, coarse-pointer, and reduced-motion clients.
- `evidence/lenis-non-home-scope-2026-06-06/lenis-non-home-scope-summary.md` records that non-home public pages no longer use Lenis, while home keeps the reduced-motion-aware provider.
- `evidence/public-image-font-lcp-audit-2026-06-06/public-image-font-lcp-summary.md` records that no image preload/media change was justified and unused root fonts were removed.

Provider caveat: hosted third-party timing and before/after Speed Insights comparison remain open; this gate only decides the local graceful-degradation posture.

### GA/Clarity delay/sampling

Decision: **keep existing consent-gated loading; no new delay/sampling change in this branch**.

Source/test evidence:

- `src/components/landing/LandingAnalyticsLoader.tsx` returns `null` until `consent.analytics` is true.
- `src/components/landing/LandingAnalyticsLoader.tsx` only renders `GoogleAnalytics` and `ClarityScript` when their public IDs exist.
- `src/components/landing/ClarityScript.tsx` uses Next `Script` with `strategy="afterInteractive"`.
- `tests/vitest/landing-consent.test.tsx` proves essential-only consent does not opt into analytics and explicit “Accept analytics” records analytics opt-in.
- `tests/vitest/project-publication-security.test.ts` records that share pages do not load GA4/Clarity.

Provider caveat: hosted third-party script timing remains open. No sampling or additional delay is justified without hosted consented-route timing or Speed Insights route/device attribution.

### Global Next/React experimental toggles

Decision: **closed for this branch**.

Source evidence:

- `next.config.ts` does not enable `cacheComponents`, `inlineCss`, `cssChunking`, or React Compiler.
- `next.config.ts` only uses `experimental.optimizePackageImports` for `@phosphor-icons/react`.
- Workstream evidence already rejected broad provider/root-shell changes without route-level proof.

### Auth/proxy security review gate

Decision: **closed for this branch because no auth/proxy code change shipped**.

Evidence:

- `evidence/2026-06-06-beta-access-optimization-spike.md` records fresh GitNexus impact for `getClosedBetaAccessForEmail` as CRITICAL and `src/proxy.ts:proxy` as low upstream but dependent on the critical helper.
- The same artifact records the explicit decision to keep `supabase.auth.getUser()`, avoid allowlist caching, and avoid auth/proxy production edits until safe authenticated hosted proof and security/architecture approval exist.
- `bun run test:dom -- tests/vitest/auth-proxy.test.ts tests/vitest/closed-beta-access.test.ts` passed 2 files / 25 tests.

### Tokenized/protected/share cache headers

Decision: **closed for this branch**.

Evidence:

- `evidence/2026-06-06-share-no-store-invariants.md` plus `tests/vitest/share-no-store-invariants.test.ts` keep tokenized share APIs and `/share/[token]` dynamic/no-store.
- `evidence/2026-06-06-public-cache-safety-harness.md` and `24-cache-safety-and-public-personalization-matrix.md` keep public marketing cache relaxation deferred.
- `src/proxy.ts` still applies `MARKETING_PAGE_CACHE_CONTROL` only to the marketing path set, not tokenized share/invite/API routes.

## Gates left open

- Vercel Speed Insights dashboard overview/export evidence and before/after route/device comparison windows.
- Manual Chrome capture specifically for Speed Insights-flagged routes, because Speed Insights route flags are still unavailable.
- Signed-in auth/proxy waterfall with safe authenticated fixture/storage state.
- Hosted authenticated proposal export benchmark.
- Speed Insights window comparison.
