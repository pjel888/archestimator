# Path-to-Estimate-Sheet Performance Optimization — Audit Pack

**Created**: 2026-06-11
**Prior Oracle Review**: Recorded (ses_14d7fd71bffeTjzSxp7XMF1sQk) - 5 blind spots found, priorities corrected
**Prior Oracle Verification**: Recorded (ses_14d75f97cffe6OZJiSGoRHgEk6) - landing page + estimate list gaps filled
**Current Status**: Source-audited and planning-ready; implementation is gated by baseline measurement, scoped dependency approval, and future source edits

---

## What This Is

A comprehensive performance audit and implementation planning pack for Archestimator's **north-star path**: the full rendering and data fetching chain from the landing page (`/`) through the estimate list to the estimate sheet workspace (`/workshop/projects/[projectId]/estimates/[nodeId]`).

This is the main feature route — the "happy path" every user follows. Optimizing it cascades to every user session.

This pack is still **planning only**. It does not prove runtime wins, provider Speed Insights completion, or hosted production performance. Treat every modeled impact estimate as a hypothesis until [08-measurement-protocol.md](./08-measurement-protocol.md) and [14-adversarial-qa-matrix.md](./14-adversarial-qa-matrix.md) produce fresh evidence.

## Reading Order

1. **[00-executive-summary.md](./00-executive-summary.md)** — Start here. All findings across all pages, blind spots, corrected priorities.
2. **[12-current-evidence-and-gap-audit.md](./12-current-evidence-and-gap-audit.md)** — Current repo snapshot, stale/fresh evidence split, and false-green risks.
3. **[13-implementation-readiness-plan.md](./13-implementation-readiness-plan.md)** — Decision-complete implementation units, dependencies, and acceptance gates.
4. **[14-adversarial-qa-matrix.md](./14-adversarial-qa-matrix.md)** — UltraQA-style scenarios that future implementation must satisfy.
5. **[15-readiness-scorecard.md](./15-readiness-scorecard.md)** — Readiness score, blockers, and what may/may not be claimed.
6. **[16-dependency-cache-image-decision-matrix.md](./16-dependency-cache-image-decision-matrix.md)** — Redis/remote cache, package, `next/image`, and dependency approval gates.
7. **[17-blast-radius-and-impact-analysis-plan.md](./17-blast-radius-and-impact-analysis-plan.md)** — Pre-edit and post-diff impact analysis gates by implementation unit.
8. **[06-prioritized-recommendations.md](./06-prioritized-recommendations.md)** — Prioritized implementation sequence with Sprint 0-3 breakdown.
9. **[09-code-pattern-analysis.md](./09-code-pattern-analysis.md)** — Exact code patterns with line numbers showing bottlenecks; line numbers are current-snapshot anchors, not durable API.
10. **[01-rendering-path-audit.md](./01-rendering-path-audit.md)** — Complete component hierarchy, Suspense boundaries, layout waterfalls.
11. **[10-landing-page-audit.md](./10-landing-page-audit.md)** — Landing page (`/`): auth round-trip, global CSS, WebGL, Lenis, analytics scripts, A/B testing.
12. **[11-estimate-list-audit.md](./11-estimate-list-audit.md)** — Estimate list page: current explicit row-column select, remaining aggregate computation cost, navigation gateway.
13. **[02-data-fetching-audit.md](./02-data-fetching-audit.md)** — Every data fetch with file:line, waterfall analysis, `select('*')` instances, realtime channels.
14. **[03-client-side-bundle-ux-audit.md](./03-client-side-bundle-ux-audit.md)** — Virtualization gap, keystroke re-render storm, formula calculation analysis, dependency audit.
15. **[04-infrastructure-audit.md](./04-infrastructure-audit.md)** — Proxy flow, auth patterns, RLS policy audit, caching headers, Next.js config.
16. **[05-database-optimization-audit.md](./05-database-optimization-audit.md)** — 28 tables, existing/missing indexes, RPC/trigger audit, JSONB impact analysis.
17. **[07-oracle-review-notes.md](./07-oracle-review-notes.md)** — Historical Oracle analysis, blind spots, edge cases, emergency relief path.
18. **[08-measurement-protocol.md](./08-measurement-protocol.md)** — Reproducible before/after benchmarks, per-sprint measurement gates, regression checkpoints.

## Key Numbers

| Metric | Value |
|--------|-------|
| Path pages covered | 4 (`/`, estimate list, project layout, estimate sheet) |
| Client components in path | ~66 (31 landing + 35 workshop) |
| Database tables queried | 28 |
| `select('*')` instances | 29 repository hits, 48 source-wide hits in current worktree snapshot |
| Estimated wasted payload | 50-300KB per estimate-sheet load, measurement pending |
| Realtime channels active | 3 |
| Largest component | 4,336 lines (`EstimateSheetContent.tsx`) in current worktree snapshot |
| Largest landing component | 834 lines (AnimatedProposalRecordSection.tsx) |
| Third-party scripts | GA4 + Clarity (consent-gated) |
| WebGL libraries | `@firecms/neat` (dynamic import, idle activation) |
| Redis / remote cache | Not present; explicitly gated by [16-dependency-cache-image-decision-matrix.md](./16-dependency-cache-image-decision-matrix.md) |
| Inline image surfaces | Component thumbnails still use `backgroundImage`; `next/image` adoption gated by URL/privacy proof |
| Critical bottlenecks found | 7 (estimate sheet) + 2 (landing page) + 2 (estimate list) |

## Top 3 Future Actions (Sprint 0 Candidates)

1. Characterize current sheet editing, totals, bulk-selection, drag/drop, and cursor behavior before touching the 4,336-line sheet component.
2. Add `React.memo` around `EstimateRowItemsTable` only with a prop-stability test that proves stale rows do not render stale totals or callbacks.
3. Memoize `projectTotal` and capture before/after keystroke flame charts; defer broader `useDeferredValue` state surgery until the input-focus tests in [14-adversarial-qa-matrix.md](./14-adversarial-qa-matrix.md) exist.

These are implementation candidates, not completed improvements.

## For Implementers

Read [12-current-evidence-and-gap-audit.md](./12-current-evidence-and-gap-audit.md) and [13-implementation-readiness-plan.md](./13-implementation-readiness-plan.md) first. Follow the baseline -> Sprint 0 -> Sprint 1 -> Sprint 2 -> Sprint 3 sequence. Do not start with virtualization (R1): the current blockers are characterization, measurement, computation isolation, and data payload proof.

Also review the landing page and estimate list quick-wins in [10-landing-page-audit.md](./10-landing-page-audit.md) and [11-estimate-list-audit.md](./11-estimate-list-audit.md). Before any package, cache, image, migration, or wide source edit, use [16-dependency-cache-image-decision-matrix.md](./16-dependency-cache-image-decision-matrix.md) and [17-blast-radius-and-impact-analysis-plan.md](./17-blast-radius-and-impact-analysis-plan.md).

## Related Plans

- `.ai/03_plans/route-transition-performance-optimization/` — Route transition performance
- `.ai/03_plans/database-indexing-and-query-performance/` — Database indexing strategy
- `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/` — UI component decomposition
