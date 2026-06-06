<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Open Gates and Provider Evidence


## Major-upgrade gate

The plan may target massive performance gains, but the claim is blocked until at least one high-impact hypothesis from `11-performance-hypothesis-scorecard.md` is proven by:

1. before/after local attribution,
2. hosted request/cache/function evidence when relevant, and
3. Vercel Speed Insights route/device p75 evidence when traffic is sufficient.

If only local proof exists, use `IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN`, not `COMPLETE`.

## Provider/dashboard gates

- [x] Vercel Speed Insights exact metrics captured from dashboard/CLI/export. Evidence: `evidence/vercel-speed-insights-cli-2026-06-06/vercel-speed-insights-cli-baseline.md` plus raw JSON captures provider p75 LCP, INP, CLS, FCP, and TTFB via `vercel metrics`; dashboard overview score/screenshot remains unavailable.
- [x] Vercel latest deployment and commit matched to metric window. Evidence: `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md` plus 2026-06-06 Vercel connector refresh (`dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, commit `2d9e12d4d8b3f08a6da686bcb06f753474590511`).
- [x] Production or preview public-route timing captured with `vercel httpstat` or comparable Vercel evidence. Evidence: `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`; authenticated route timing remains open under the auth/proxy gate.
- [x] Speed Insights route/device breakdown attached. Evidence: `evidence/vercel-speed-insights-cli-2026-06-06/current-*-route-device.json` and summary in `vercel-speed-insights-cli-baseline.md`.
- [x] Supabase EXPLAIN/provider query evidence captured before DB/index work. Evidence: `evidence/2026-06-06-live-supabase-explain-provider-proof.md`; no DB/index work is justified from current beta proof.
- [x] Manual Chrome/Lighthouse traces captured for the route(s) Speed Insights flags. Evidence: `/` desktop was the largest LCP/FCP and anomalous INP provider outlier; production Lighthouse desktop trace captured at `evidence/vercel-speed-insights-cli-2026-06-06/prod-home-desktop-speed-insights-flagged.report.json` / `.html`.

## Product decision gates

- [x] Decide whether to keep `@vercel/speed-insights` absent or intentionally add Speed Insights package instrumentation. Decision: keep absent for PR-1A; numeric provider p75 is captured via Vercel CLI, while dashboard overview/recommendation cards remain unavailable.
- [x] Decide if marketing visual effects can degrade gracefully on mobile/reduced-motion. 2026-06-06 decision: Neat hero canvas degrades to a static gradient on mobile/coarse-pointer/reduced-motion, Lenis is removed from non-home public pages, and the public image/font LCP audit found no image preload candidate while removing unused root fonts. Evidence: `evidence/2026-06-06-open-gate-reconciliation.md`. Hosted third-party script timing and before/after Speed Insights comparison remain open.
- [x] Decide acceptable privacy posture for Speed Insights route labels on share/invite/auth paths. Decision: no package/custom telemetry for PR-1A; existing Web Analytics drops/redacts sensitive routes.
- [x] Decide whether public marketing pages can have cache headers less restrictive than `private, no-cache`. Decision: not yet; keep current private/no-cache posture until personalization is isolated/proven.
- [x] Decide acceptable delay/sampling for Clarity/GA post-consent scripts. Decision: keep existing consent-gated loading and no new delay/sampling change in this branch; `LandingAnalyticsLoader` returns null until analytics consent, and Clarity remains `afterInteractive`. Evidence: `evidence/2026-06-06-open-gate-reconciliation.md`.


## Hard gates added by second-pass research

- [x] No Speed Insights package instrumentation without `beforeSend`/allowlist/redaction tests and an owner privacy decision. Current PR-1A decision keeps the package absent.
- [x] No cache-header relaxation while auth state, consent state, or A/B variant output can vary in shared marketing HTML. PR-0B harness preserves this guardrail.
- [x] No broad caching for protected, tokenized, share, invite, password/session, or auth-dependent responses. PR-0B cache-safety matrix preserves this guardrail.
- [x] No `cacheComponents`, `inlineCss`, `cssChunking`, or React Compiler global toggle without route-by-route proof and rollback. Evidence: `evidence/2026-06-06-open-gate-reconciliation.md`; `next.config.ts` does not enable those toggles.
- [x] No Next/Image preload/private-image change without media route waterfall and access-policy proof. 2026-06-06 image/font audit made no image/preload/private-media change because public LCP evidence did not identify an image candidate.

## Security and data gates

- [x] Auth/proxy changes reviewed with `getClosedBetaAccessForEmail` CRITICAL blast radius noted. Evidence: `evidence/2026-06-06-beta-access-optimization-spike.md` and `evidence/2026-06-06-open-gate-reconciliation.md`; no auth/proxy production code change shipped.
- [x] No change to `getUser()` proxy security without explicit architecture/security approval. Evidence: `evidence/2026-06-06-open-gate-reconciliation.md`; beta spike explicitly retained `supabase.auth.getUser()`.
- [x] No cache headers on tokenized/protected/share APIs unless proven non-sensitive. Evidence: `evidence/2026-06-06-share-no-store-invariants.md`, `tests/vitest/share-no-store-invariants.test.ts`, and `evidence/2026-06-06-open-gate-reconciliation.md`.
- [x] No Supabase mutations against unrelated provider projects; Archestimator project id remains `ebxxqidacheyapmmzavr`. 2026-06-06 proof used read-only SQL/advisor calls against Archestimator only; SlateCamp remained untouched.
- [x] No database index migrations without staging/live EXPLAIN proof and rollback plan. 2026-06-06 live EXPLAIN/provider proof captured and concluded no migration proposal is justified for current beta rows.

## Completion language gate

Use these labels:

- `PLANNED`: this folder’s current state.
- `IMPLEMENTED LOCALLY`: code changed and local tests pass, but provider proof open.
- `PROVIDER PROOF OPEN`: production/dashboard/manual proof still missing.
- `COMPLETE`: Speed Insights/provider/manual evidence confirms the target metric and regression gates pass.

Do not use `COMPLETE` for route-transition or Speed Insights improvements without production/manual evidence files.
