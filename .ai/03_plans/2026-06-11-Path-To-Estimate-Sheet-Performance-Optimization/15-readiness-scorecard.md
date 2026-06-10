# 15 - Readiness Scorecard

**Date**: 2026-06-11
**Purpose**: State what this plan pack is ready for and what remains blocked.

---

## Implementation Status — 2026-06-11 run (branch `perf/path-to-estimate-sheet`)

| Unit | Status | Evidence |
|------|--------|----------|
| U0 baseline + characterization | DONE (jsdom + static; browser channel blocked, recorded) | store `baseline/` + `environment-status.md` |
| U0A blast-radius + decision receipts | DONE | store `decisions/u0a-decision-receipts.md` |
| U1 safe render relief | DONE — 200-row keystroke 82.0→8.4ms avg; non-edited table renders 90→0 | commit 96563ca, `baseline/jsdom-render-baseline-*.json` |
| U2 explicit columns (sheet tree) | DONE — corrected scope: source_snapshot is consumed; dropped only unused columns | commit aa7c10d |
| U3 estimate-list SQL aggregate | DEFERRED with ready design (no DB channel) | `decisions/u3-u5-database-deferral.md` |
| U4 library lazy load | DONE — page render no longer gated on library queries; skeleton/error/retry/cached | commit 959f9d9 |
| U5 index EXPLAIN proof | DEFERRED (no DB channel; provider authority absent) | `decisions/u3-u5-database-deferral.md` |
| U6 landing CSS/auth | DONE — anonymous `/` TTFB median ~0.60s→~0.057s; CSS scoped; hero preload | commit c978527 |
| U7 scheduling | DEFERRED with evidence (budget met post-U1) | `decisions/u7-scheduling-deferral.md` |
| U8 cursor isolation | DONE — cursor frames render only the cursor layer | commit b7f4d34 |
| U9 component split | First boundary (activity/row-details modals) extracted | see implementation commits |
| U10 virtualization | SKIPPED with evidence — measurements met budgets without the dependency | `decisions/u10-virtualization-decision.md` |
| QA matrix | Executed; per-row results | store `qa/qa-matrix-results.md` |

---

## Readiness Summary

| Area | Score | Status |
|------|-------|--------|
| Source audit coverage | 90/100 | Strong coverage of route, component, repository, auth, CSS, and database surfaces. Needs re-check on future code branch. |
| Measurement protocol | 75/100 | Protocol exists, but baseline values are still blank. |
| Implementation sequencing | 92/100 | Sequencing now includes baseline, characterization, data, computation, structure, and virtualization gates. |
| Behavior preservation plan | 88/100 | QA matrix covers major user flows, but tests are future implementation work. |
| Package/cache/image decision coverage | 86/100 | Redis/remote-cache, `next/image`, package, and bundle gates now exist; runtime proof is future implementation work. |
| Blast-radius planning | 90/100 | Unit-by-unit impact matrix now exists; future code branch must rerun graph/GitNexus/manual impact checks. |
| Database/provider proof | 65/100 | Good candidates identified; EXPLAIN, local migration, linked-provider, and Vercel evidence remain pending. |
| Overall planning handoff | 91/100 | Ready for a future implementation branch after baseline, impact, and package/cache/image gates. Not ready to claim performance wins. |

---

## What Can Be Claimed Now

- The plan pack covers the path from `/` to `/workshop/projects/[projectId]/estimates/[nodeId]`.
- Current source confirms major hotspots: non-virtualized sheet, no React 19 concurrency in the sheet component, eager component-library load, many `select("*")` calls, global tree/Lenis CSS, and public landing auth round-trip.
- The estimate-list audit has been corrected: current code no longer fetches row-item `source_snapshot` on the list page; the remaining list issue is row transfer plus JavaScript aggregation.
- Future implementation has a concrete unit plan and adversarial QA matrix.
- Redis/remote cache is now explicitly gated, not assumed.
- Component thumbnail `next/image` opportunities and Next 16 hero image preload guidance are now captured.
- Blast-radius analysis is now a required implementation gate.

---

## What Must Not Be Claimed Yet

- No measured TTFB, FCP, LCP, TBT, payload, query-count, or keystroke-lag improvement.
- No provider Speed Insights or RES completion.
- No database-index benefit until EXPLAIN evidence exists.
- No safe virtualization decision until post-Sprint 0-2 measurements prove DOM count remains limiting.
- No source-code implementation from this docs-only pass.
- No Redis/remote-cache approval for this path yet.
- No `next/image` byte or LCP improvement yet.
- No package/config optimization benefit until bundle analyzer and route metrics prove it.

---

## Blocking Gates Before Implementation

1. Fill baseline measurements for 50/200/500-row sheets.
2. Record exact fixture IDs and whether rows are linked to library items.
3. Add/confirm characterization tests for sheet editing, tree manipulation, cursor behavior, proposal preview, and activity scope.
4. Re-run graph impact analysis on the future code-bearing branch.
5. Complete the package/cache/image decision matrix before any dependency, `next.config.ts`, image, or cache change.
6. Decide package approval for `@tanstack/react-virtual` only if needed.
7. Keep Redis/Upstash/KV out of scope unless measured shared-cache pressure, privacy safety, invalidation, and cost approval are recorded.
8. Decide provider authority for linked Supabase migration proof and hosted Vercel metrics.

---

## Recommended Next Packet

Create a fresh implementation branch/worktree and execute only U0 from `13-implementation-readiness-plan.md`: baseline plus characterization. Do not start Sprint 0 code until U0 produces rerunnable evidence.
