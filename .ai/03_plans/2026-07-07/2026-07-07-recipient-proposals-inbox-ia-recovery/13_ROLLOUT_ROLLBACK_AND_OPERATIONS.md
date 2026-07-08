# 13 — Rollout, Rollback, and Operations

## Release posture

- **Stage:** pre-launch closed-beta MVP; no external users yet. Bias to fast iteration.
- **Feature flags:** none required for V1. All changes are additive copy/component/routing with no contract or schema change.
- **Rollout rings:** none needed. Ship behind the normal Cloudflare Workers deploy (`archestimator-proof`).

## Performance/release gates

Performance is low-risk for V1 (no new query/API/binding). Gates are correspondingly light:

| Gate | Metric | Source | Pass/fail | Blocks merge? | Blocks closed-beta? |
|---|---|---|---|---|---|
| Type/lint | `bun run type-check`, `bun run lint` clean | local | zero errors | yes | yes |
| DOM tests | `bun run test:dom` green | vitest | all green (or skip-documented) | yes | yes |
| Bundle boundary | no new `"use client"` except route `error.tsx` | `bun run build` | ±0 client JS (excluding the route boundary) | yes (investigate) | no |
| Credential-free DTO | repo test green | vitest | assertion holds | yes | yes |
| Anti-enumeration | unknown ≠ expired ≠ revoked copy | vitest | distinct strings | yes | yes |
| No email leak | wrong-account CTA DOM has no email | vitest | no email string | yes | yes |
| Route TTFB (share/inbox) | no regression vs baseline | hosted probe (implementation) | < +50ms vs baseline | no (deferred) | no |
| D1 query plan | EXPLAIN listing query (implementation) | provider readback | index-backed, LIMIT 50 | no (deferred) | no |

**Rollback triggers:** any of (a) inbox listing regression, (b) share route 5xx spike, (c) wrong-account CTA mis-disclosure, (d) bundle-size jump > trivial, (e) credential-free assertion red.

## Rollback procedure

1. Revert the V1 component/route/copy changes (no migration to reverse).
2. Redeploy.
3. Confirm `bun run test:dom` green on the reverted state.
4. Record the rollback in `.ai/10_state/current-state.md`.

**Fix-forward is equally safe** for copy-level regressions (patch the copy/constants).

## Observability

- Existing `logStructured` (IP-hashed) on the decision route.
- Existing `withPerfTraceRequest("workshop.proposals.data", …)` on the inbox data fetch.
- **No new metric/event/dashboard** for V1. The changes are copy/component-level; existing traces cover the data paths.
- If a regression is suspected post-deploy, the existing Cloudflare Workers Observability + the inbox trace are the first-stop signals.

## Deployment sequencing

1. Land Phases 1–5 (parallel-safe after Phase 1 task 1.1).
2. Land Phase 6 tests alongside or immediately after.
3. `bun run validate` (or the focused `type-check && lint && test:dom && build`) before deploy.
4. Deploy via the existing OpenNext/Cloudflare Workers pipeline.
5. Post-deploy: spot-check `/workshop/proposals` (empty + populated) and `/share/<known-token>` (active + expired + revoked if available).

## Monitoring/alerts

- None new. Existing Workers Observability covers 5xx/latency.
- The owner-side digest (email) is owned by client-ready-proposal-workflow and is delivery-gated; not a V1 blocker for this pack.

## Support implications

- Recipient "where is my proposal?" → the forked empty state now points to "may be a different email" + sign-out.
- Recipient "link doesn't work" → differentiated copy tells them expired/revoked + "ask sender."
- These reduce support ambiguity — the core goal of the pack.

## Backward compatibility

- Full. No contract/schema/cookie change. Old bookmarks/links behave identically (unknown tokens still get generic copy; expired/revoked get *better* copy).

## Stale-plan revalidation

Before implementation, re-read every touched file (six sibling packs concurrent). The README checklist enumerates the files.
