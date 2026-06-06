<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Safe Implementation and Rollback Plan

Performance work is only valuable if the app still works. This document defines the order, PR boundaries, rollback triggers, and no-break rules for future implementation.

## Sequencing principle

Implement from **lowest behavioral risk and highest measurement value** toward higher-risk changes.

```text
0 evidence-only baseline
1 observability and bundle attribution
2 public-route shell/bundle/canvas/script changes
3 public marketing cache headers
4 estimate workspace measured render fixes
5 data/query changes with EXPLAIN/RLS proof
6 share/proposal changes with security/export proof
```

Do not start a later phase if an earlier phase reveals a different top bottleneck.

## PR slicing

| PR | Scope | Allowed changes | Required proof | Rollback plan |
| --- | --- | --- | --- | --- |
| PR-0 | Baseline evidence only | Docs/evidence files only | Speed Insights, httpstat, bundle, traces | No runtime rollback needed. |
| PR-1 | Observability | Web vitals reporting or Speed Insights package only if needed | Privacy tests and dashboard proof | Remove instrumentation component/package. |
| PR-2 | Public shell/bundle | Provider/CSS/font/canvas/Lenis/script containment | Bundle delta, Lighthouse, visual screenshots, consent tests | Revert single shell/landing PR. |
| PR-3 | Marketing cache | Cache headers only for non-sensitive marketing routes | `x-vercel-cache`, `httpstat`, public smoke | Restore previous `private, no-cache` header. |
| PR-4 | Estimate INP | Measured lazy boundaries/throttles/memo fixes | React Profiler, DOM tests, route-transition peak profile | Revert feature slice; no data migration. |
| PR-5 | Data/query | Select narrowing, pagination, query consolidation, indexes only with proof | EXPLAIN, RLS tests, repository tests | Rollback migration or revert query slice. |
| PR-6 | Share/export | Token-safe query/API/export optimization | Publication tests, no-store headers, export benchmark | Revert API/export slice; preserve security state. |

## Hard no-break invariants

- Closed-beta auth must not weaken.
- Proxy auth must keep secure user verification; no `getSession()` substitution for protected authorization.
- Tokenized share/invite/password/session routes must not leak identifiers into analytics/evidence.
- Protected/share APIs must not receive broad CDN/browser caching.
- Supabase project remains Archestimator project `ebxxqidacheyapmmzavr`; do not mutate unrelated provider projects.
- No database migration without EXPLAIN proof, rollback plan, and owner approval where required.
- Proposal export must stay server-only for ExcelJS and preserve workbook content.
- Design-system consistency and landing visual identity must be screenshot-reviewed.

## Feature-flag and rollback recommendations

Use feature flags or narrow config switches for behavior that might need instant rollback:

| Area | Suggested switch | Reason |
| --- | --- | --- |
| Landing canvas fallback | env/config flag or component-level fallback toggle | Fast rollback if visual/INP tradeoff disappoints. |
| Lenis lazy/scope change | component flag | Fast rollback for scroll/anchor issues. |
| Speed Insights instrumentation | single root component/package boundary | Fast removal if privacy/provider concern appears. |
| Marketing cache policy | centralized constant in proxy/config | Restore previous cache header immediately. |
| Cursor broadcast throttling | constant for throttle interval | Tune without redesigning collaboration. |
| Query pagination limits | named constants | Roll back UX-impacting limits quickly. |

## Stop conditions during implementation

Stop and return to planning when:

- measured bottleneck differs from the selected hypothesis,
- bundle analyzer does not show a meaningful route-level delta,
- Lighthouse/trace improves locally but Speed Insights/provider data cannot be compared,
- auth/share/security tests fail,
- RLS or provider EXPLAIN evidence is missing for query work,
- visual review shows public/landing brand regression,
- any worker proposes a broad refactor not tied to a scorecard row.

## Definition of done for a performance PR

A performance PR is done only when:

1. it names one scorecard hypothesis,
2. it includes before/after evidence at the required evidence level,
3. it passes all surface-specific tests from `06-test-spec-and-validation-protocol.md`,
4. it includes rollback instructions,
5. it updates this plan folder with evidence links,
6. it uses conservative completion language:
   - `IMPLEMENTED LOCALLY` for local/test proof,
   - `PROVIDER PROOF OPEN` until Speed Insights/production confirms,
   - `COMPLETE` only after provider/manual proof.
