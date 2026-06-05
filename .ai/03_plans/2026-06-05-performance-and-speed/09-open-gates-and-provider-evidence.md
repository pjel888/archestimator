<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Open Gates and Provider Evidence


## Major-upgrade gate

The plan may target massive performance gains, but the claim is blocked until at least one high-impact hypothesis from `11-performance-hypothesis-scorecard.md` is proven by:

1. before/after local attribution,
2. hosted request/cache/function evidence when relevant, and
3. Vercel Speed Insights route/device p75 evidence when traffic is sufficient.

If only local proof exists, use `IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN`, not `COMPLETE`.

## Provider/dashboard gates

- [ ] Vercel Speed Insights exact metrics captured from dashboard or export.
- [ ] Vercel latest deployment and commit matched to metric window.
- [ ] Production or preview route timing captured with `vercel httpstat` or comparable Vercel evidence.
- [ ] Speed Insights route/device breakdown attached.
- [ ] Supabase EXPLAIN/provider query evidence captured before DB/index work.
- [ ] Manual Chrome/Lighthouse traces captured for the route(s) Speed Insights flags.

## Product decision gates

- [x] Decide whether to keep `@vercel/speed-insights` absent or intentionally add Speed Insights package instrumentation. Decision: keep absent for PR-1A; provider proof remains open.
- [ ] Decide if marketing visual effects can degrade gracefully on mobile/reduced-motion.
- [x] Decide acceptable privacy posture for Speed Insights route labels on share/invite/auth paths. Decision: no package/custom telemetry for PR-1A; existing Web Analytics drops/redacts sensitive routes.
- [x] Decide whether public marketing pages can have cache headers less restrictive than `private, no-cache`. Decision: not yet; keep current private/no-cache posture until personalization is isolated/proven.
- [ ] Decide acceptable delay/sampling for Clarity/GA post-consent scripts.


## Hard gates added by second-pass research

- [x] No Speed Insights package instrumentation without `beforeSend`/allowlist/redaction tests and an owner privacy decision. Current PR-1A decision keeps the package absent.
- [x] No cache-header relaxation while auth state, consent state, or A/B variant output can vary in shared marketing HTML. PR-0B harness preserves this guardrail.
- [x] No broad caching for protected, tokenized, share, invite, password/session, or auth-dependent responses. PR-0B cache-safety matrix preserves this guardrail.
- [ ] No `cacheComponents`, `inlineCss`, `cssChunking`, or React Compiler global toggle without route-by-route proof and rollback.
- [ ] No Next/Image preload/private-image change without media route waterfall and access-policy proof.

## Security and data gates

- [ ] Auth/proxy changes reviewed with `getClosedBetaAccessForEmail` CRITICAL blast radius noted.
- [ ] No change to `getUser()` proxy security without explicit architecture/security approval.
- [ ] No cache headers on tokenized/protected/share APIs unless proven non-sensitive.
- [ ] No Supabase mutations against unrelated provider projects; Archestimator project id remains `ebxxqidacheyapmmzavr`.
- [ ] No database index migrations without staging/live EXPLAIN proof and rollback plan.

## Completion language gate

Use these labels:

- `PLANNED`: this folder’s current state.
- `IMPLEMENTED LOCALLY`: code changed and local tests pass, but provider proof open.
- `PROVIDER PROOF OPEN`: production/dashboard/manual proof still missing.
- `COMPLETE`: Speed Insights/provider/manual evidence confirms the target metric and regression gates pass.

Do not use `COMPLETE` for route-transition or Speed Insights improvements without production/manual evidence files.
