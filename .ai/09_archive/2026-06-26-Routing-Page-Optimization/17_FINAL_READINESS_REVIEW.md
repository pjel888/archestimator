# 17 - Final Readiness Review

## Review Status

This document is updated during the planning review loop.

Current state: specialist, adversarial, and final verifier review cycles are integrated. The package is implementation-ready for a benchmark-first execution pass.

## Critique and Revision Cycle 1

Reviewer: primary author self-check against the planning directive.

Findings:

- The plan must not claim codebase-wide analysis beyond the relevant route/loading/performance surface.
- The prompt file path requested by the user is a source directive, not a destination for edits, because it states plan artifacts should be in the dated folder.
- The prior June 21 estimate sheet skeleton work must be treated as current implementation context, not repeated as new work.
- The benchmark harness needs selector timelines, not just durations.

Revisions applied:

- Added explicit non-goals for PPR, DB changes, UI redesign, and global overlay rewrites.
- Added Phase 0 baseline and readiness tasks before implementation.
- Added required selector list and parent fallback budget.
- Added no-code-change statement.

## Critique and Revision Cycle 2

Reviewer: specialist lanes W6-W10.

Findings:

- The parent blockers include the intentional auth/terms gate and project-layout bootstrap; security gates must remain before protected content.
- The leaf Suspense split is feasible, but project-layout title streaming and global overlay changes need explicit evidence gates.
- Static/cross-user protected-data caches, service-role prefetches, and broad PPR/cacheComponents adoption are outside the safe first slice.
- If server boundary timing improves but the route remains slow, route-context query sharing and estimate-workspace bundle/hydration become the next bottlenecks.
- Next's local instant-navigation docs require Cache Components / `unstable_instant` validation before claiming "instant navigation."

Revisions applied:

- Added security ordering, protected-cache, project-layout, overlay, route-context, bundle/hydration, and instant-navigation caveats across docs 03, 04, 06, 07, 08, 09, 10, 11, 12, 14, 15, and 16.

## Critique and Revision Cycle 3

Reviewer: adversarial native `critic`.

Findings:

- Phase 0 incorrectly said no code changes before baseline while requiring harness changes before the enhanced baseline.
- Warm/prefetched, no-hover/general, and readiness-check budgets conflicted.
- Required before/after artifacts did not have exact commands for every scenario.
- Security validation needed explicit unauthenticated and unauthorized direct-load/prefetch proof.
- `.ai/05_logs` is not ignored, so raw screenshots/traces with protected data need a sanitization or ignored-scratch policy.
- The review ledger was stale after W6-W10 completed.

Revisions applied:

- Distinguished harness-only measurement changes from app optimization changes.
- Made enhanced same-harness baseline the required precondition for app optimization code.
- Split warm/prefetched p50 <= 500 ms from no-hover/general >= 30 percent improvement or <= 1000 ms.
- Replaced the single benchmark command with before/after route-transition, server-perf, and readiness command matrices.
- Added concrete unauthenticated, unauthorized storage-state, and unauthorized prefetch validation requirements.
- Added the artifact privacy rule: commit sanitized `.ai/05_logs` summaries only; keep raw protected browser artifacts in ignored `.ai/99_scratch`.
- Updated coordination and traceability ledgers.

## Critique and Revision Cycle 4

Reviewer: lead-orchestrator audit pass on 2026-06-26 applying `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md`. Six specialist subagents were dispatched in parallel (source verification, test infrastructure, data/network/cache layer, bundle/hydration/prefetch, adversarial security, cross-document consistency). The subagent runtime failed systemically in this environment: every one of the 9 dispatched agents (6 originals + 2 tighter-scope retries + 1 oracle verifier) timed out after 30 minutes of inactivity without producing tool output. The audit was therefore completed by the lead orchestrator directly: reading 14 of 19 plan docs, verifying test infrastructure against the actual repository (`package.json` scripts, `scripts/*`, `e2e/*`, `tests/vitest/*`, `src/lib/perf/server-timing.ts`, gitignore claims), and applying adversarial reasoning in place of the oracle lane. This deviates from Improve-Plan-Prompt's "independent final-verification agent that did not author the primary revisions" requirement — the lead orchestrator both authored and verified the revisions. A future session in a working subagent environment should re-run the verifier lane for independent confirmation.

Findings integrated into the plan:

- R-16: concurrent navigation during async-child suspense may allow stale props (HIGH). Added to `14_RISK_REGISTER.md`; P1-T1 instructions updated to require navId cancellation in async child.
- R-17: TanStack Query 30s `staleTime` creates inconsistent UX with the new server boundary (MEDIUM). Added to `14_RISK_REGISTER.md`.
- R-18: Realtime cursor/presence channel lifecycle across boundary transitions (MEDIUM). Added to `14_RISK_REGISTER.md`.
- R-19: recent commit `a12488cf` lazy subtree loading interacts with tail Suspense and may violate UX-03 (HIGH). Added to `14_RISK_REGISTER.md`; `03_SOURCE_AND_CODEBASE_AUDIT.md` and `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` updated with explicit lazy-subtree interaction notes.
- T-SEC-07: timing side-channel on project/estimate existence via skeleton render timing (MEDIUM). Added to `08_SECURITY_PRIVACY_THREAT_MODEL.md`.
- T-SEC-08: collaborator snapshot mid-transition race (MEDIUM). Added to `08_SECURITY_PRIVACY_THREAT_MODEL.md`.
- A5-4: React.cache lifetime across the new async-child boundary must be verified. Added to P1-T1 instructions and `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`.
- `tests/vitest/use-navigation-router.test.ts` exists in the repo but was missing from P2-T2's test list. Added.
- `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` selector list now includes provenance notes linking `[aria-label='Loading workspace']` to `WorkshopShellContentFallback`.

Test infrastructure verification (all confirmed, no plan changes required):

- `perf:measure-routes`, `perf:check-routes`, `test:e2e:perf`, `validate` package scripts exist exactly as cited.
- `scripts/measure-route-transitions.ts`, `scripts/check-route-transition-readiness.ts`, `e2e/estimate-sheet-loading-performance.spec.ts`, `e2e/route-transition-performance-budgets.json`, `tests/vitest/estimate-sheet-route-loading.test.ts`, `tests/vitest/project-estimates-list-skeleton.test.tsx`, `tests/vitest/navigation-ui-store.test.ts`, `src/lib/perf/server-timing.ts` all exist.
- `.ai/05_logs/` is tracked (not gitignored) and `.ai/99_scratch/` is gitignored, confirming the plan's artifact privacy rule is workable as written.

Open follow-ups the audit did not close (intentionally):

- Source-level verification of `page.tsx`, `loading.tsx`, `layout.tsx`, `route-loading-overlay.tsx`, `ProjectRouteContentFallback`, `EstimateSheetRouteSkeleton` symbol-level claims awaits implementation-time confirmation. The two retry subagents and the oracle verifier dispatched in this session all failed with 30-minute inactivity timeouts (subagent runtime issue in this environment). Doc 03's existing codebase audit covers most of these claims at the architectural level; P1-T1's implementation will discover any line-level discrepancies.
- The benchmark environment decision (local production build vs Vercel preview for the gate) remains open per D-02 in `02_FEATURE_BRIEF_AND_SCOPE.md`.
- An independent verifier pass by a different agent (per Improve-Plan-Prompt methodology) could not be completed in this session due to the same subagent runtime failure. A future session in a working environment should re-attempt this verification.

## Independent Final Verification

Verifier: native `verifier` (`Euclid`).

Initial determination: partial. The verifier found that the no-hover/general `>= 30 percent faster or <= 1000 ms` gate was described in prose but not enforceable by the concrete after-readiness command, because the command lacked a baseline file and improvement threshold.

Revision applied:

- Added `ROUTE_TRANSITION_BASELINE_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/before-route-transition.json` to the after-readiness command.
- Added `ROUTE_TRANSITION_GENERAL_IMPROVEMENT_MIN=0.30` to the after-readiness command.
- Added implementation instructions for checker support of the baseline comparison and OR gate.
- Added test-strategy language requiring the checker to fail if the after-readiness command needs the relative-improvement fallback but has no baseline file.

Final determination: implementation-ready. The verifier rechecked the patched scope and found no remaining blocker.

## Readiness Scores

| Category | Initial Score | Cycle 3 Score | Cycle 4 Score (post-audit) | Reason Below 100 |
|---|---:|---:|---:|---|
| Product strategy | 92 | 95 | 95 | External choice remains for authoritative benchmark environment |
| Scope clarity | 94 | 96 | 96 | Overlay/project-layout evidence gates intentionally conditional |
| Requirements completeness | 95 | 97 | 97 | R-16..19 and T-SEC-07..08 added; cycle-4 audit closed previously-untracked gaps |
| UX and UI readiness | 94 | 96 | 96 | Tail fallback behavior and lazy subtree interaction require Phase 0 proof (R-19) |
| Accessibility readiness | 90 | 93 | 93 | Overlay and live-region interaction needs browser/a11y proof during implementation |
| Architecture readiness | 92 | 95 | 95 | Async-child navId cancellation (R-16) and React.cache lifetime verification (A5-4) now explicit in P1-T1 |
| Data and database readiness | 96 | 97 | 96 | TanStack staleTime (R-17) and Realtime lifecycle (R-18) interactions now tracked but unresolved |
| API and network readiness | 92 | 95 | 95 | RSC timeline fields need implementation in benchmark script |
| Security and privacy readiness | 92 | 96 | 96 | T-SEC-07 timing side-channel and T-SEC-08 snapshot race now tracked; mitigations still implementation-bound |
| Performance and scalability readiness | 94 | 97 | 96 | R-19 lazy subtree interaction introduces a new measured risk until Phase 0 proves the mitigation |
| Reliability and operational readiness | 90 | 94 | 93 | R-16 navId race during async-child suspense adds a reliability case to prove |
| Blast-radius coverage | 94 | 96 | 96 | Layout/overlay/global-cache work remains evidence-gated |
| Testing and validation readiness | 94 | 96 | 96 | `use-navigation-router.test.ts` now in P2-T2 test list; tests specified but not implemented in planning pass |
| Rollout and rollback readiness | 92 | 95 | 95 | Rollback is commit-based; no live rollout decision yet |
| Requirements traceability | 96 | 97 | 97 | Current requirements traced through tasks and gates; cycle-4 additions traced |
| Overall implementation readiness | 93 | 98 | 97 | Cycle-4 audit found and integrated 8 gaps (3 HIGH, 5 MEDIUM); the plan is more complete but the score reflects honest residual risk pending Phase 0 baseline |

## Known Remaining Gaps

**Phase 0 baseline has not been run.** This is the single most material gap. The plan defines a complete benchmark protocol (doc 09), names the exact commands, lists the required scenarios, and specifies the pass/fail budgets — but no `before-route-transition.json`, `before-server-perf.log`, or `before-readiness.json` artifact exists yet. Until Phase 0 runs, every performance claim in this plan is conditional on evidence not yet captured. Implementation must NOT begin app-optimization code changes until the enhanced same-harness baseline exists.

Secondary gaps:

- No application source was changed in this planning pass.
- No benchmark was run in this planning pass.
- Tail fallback behavior (UX-03, R-19) and overlay interaction with lazy subtree loading remain evidence-gated behind Phase 0.
- The local production server commands are intentionally concrete but long-running; the future executor must manage their lifecycle while collecting logs.
- Authoritative benchmark environment decision (local production vs Vercel preview for the release gate) remains open.
