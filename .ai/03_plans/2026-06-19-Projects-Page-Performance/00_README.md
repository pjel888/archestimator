# Projects Page Performance — Plan Pack

**Route:** `/workshop/projects` (the project list, NOT the `[projectId]` detail subtree)
**Opened:** 2026-06-19
**Owner:** Philip (lead) · Claude (planning + implementation)
**Status:** Phase 1-3 IMPLEMENTED locally + measured; remaining work is follow-up hardening, not rediscovery.
**Blast radius:** Medium-High — touches the shared data layer
(`workspace-repository.ts`) and shared workshop UI (`LiveProjectCard.tsx`).
Treated as a dated pack with `LOOP_LEDGER.md` per the HIGH-BLAST-RADIUS rule.

## Why this pack exists

Navigating to `/workshop/projects` felt slow. Four parallel read-only analyst
agents mapped the route from independent angles (render path, data fetching,
prior-art, measurement). They converged on **four concrete, evidence-backed
causes** — see `01_DIAGNOSIS.md`. Phase 1 fixed the two highest-confidence
load-path causes; later passes shipped the Phase 2 render work, Phase 3 browser
hardening, skeleton parity, and production-representative measurement. The only
remaining items are explicitly tracked follow-ups, not prerequisites to understand
or repeat the shipped work.

## Scope discipline (what this pack does NOT do)

This page is **not owned by a single plan**. Before adding anything, we
reconciled against the prior packs so we extend rather than duplicate:

- **Do NOT** re-touch the shipped `project_estimate_list_summaries` RPC or the
  access-tabs work (both merged/on-prod).
- **Do NOT** touch the intentionally-suppressed *shared* favorites
  (`decisions.md` 2026-06-03 — pending a shared-favorite data model).
- **Absorbed** the projects-page slice of Phase 6 of
  `2026-06-17-Performance-Refactor` (LiveProjectCard memoization). That phase
  was planned but never started; this pack shipped the slice and now owns the
  render-count proof in `03_METRICS.md`.
- **Coordinate, don't duplicate**, the `database-indexing-and-query-performance`
  pack (favorite/member index candidates) and the `2026-06-14-Overall-Site-
  Performance` speed-matrix gates (LCP / Slow-3G re-measurement).
- **Out of scope** (different surfaces): `/workshop/settings` Slow-3G outlier,
  `get_project_chart_buckets` hosted apply, repo-wide `auth.uid()` initplan wrap.

## Documents

| File | Purpose |
|------|---------|
| `00_README.md` | This overview + scope boundaries |
| `01_DIAGNOSIS.md` | Synthesized, evidence-backed findings (file:line) |
| `02_IMPLEMENTATION_PLAN.md` | Implemented phase record, remaining gates, and measurement protocol |
| `03_METRICS.md` | Runtime, render-count, image, bundle, and production-representative measurements |
| `04_FURTHER_OPTIMIZATIONS.md` | Exhaustive follow-up ledger and deliberately rejected optimizations |
| `05_STATUS.md` | Canonical current status, stale-claim corrections, and remaining follow-ups |
| `06_PERCEIVED_PERFORMANCE_ACCEPTANCE.md` | UX/perceived-performance acceptance states and authz regression guard |
| `LOOP_LEDGER.md` | Execution ledger — what changed, what was verified, evidence |

## Concurrency note (multi-agent safety)

Assume other coding agents may touch this tree. This pack's shipped source
surface included `workspace-repository.ts`, `LiveProjectCard.tsx`,
`projects-page-client.tsx`, route loading/shell files, and focused perf tests.
If a concurrent agent edits those areas, re-run the matching targeted checks in
`LOOP_LEDGER.md` and re-read `03_METRICS.md` before changing the status.
