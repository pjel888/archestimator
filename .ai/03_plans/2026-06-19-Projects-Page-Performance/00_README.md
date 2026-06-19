# Projects Page Performance — Plan Pack

**Route:** `/workshop/projects` (the project list, NOT the `[projectId]` detail subtree)
**Opened:** 2026-06-19
**Owner:** Philip (lead) · Claude (planning + implementation)
**Status:** Phase 1 IMPLEMENTED + verifying · Phases 2–3 PLANNED (gated)
**Blast radius:** Medium-High — touches the shared data layer
(`workspace-repository.ts`) and shared workshop UI (`LiveProjectCard.tsx`).
Treated as a dated pack with `LOOP_LEDGER.md` per the HIGH-BLAST-RADIUS rule.

## Why this pack exists

Navigating to `/workshop/projects` felt slow. Four parallel read-only analyst
agents mapped the route from independent angles (render path, data fetching,
prior-art, measurement). They converged on **four concrete, evidence-backed
causes** — see `01_DIAGNOSIS.md`. This pack fixes the two highest-confidence,
load-path causes now and plans the rest as gated follow-ups.

## Scope discipline (what this pack does NOT do)

This page is **not owned by a single plan**. Before adding anything, we
reconciled against the prior packs so we extend rather than duplicate:

- **Do NOT** re-touch the shipped `project_estimate_list_summaries` RPC or the
  access-tabs work (both merged/on-prod).
- **Do NOT** touch the intentionally-suppressed *shared* favorites
  (`decisions.md` 2026-06-03 — pending a shared-favorite data model).
- **Absorb** the projects-page slice of Phase 6 of
  `2026-06-17-Performance-Refactor` (LiveProjectCard memoization) — that phase
  was planned but never started; this pack owns that slice and gates it on a
  render-count proof (see Phase 2).
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
| `02_IMPLEMENTATION_PLAN.md` | Phased plan, the implement-now vs gated split, measurement protocol |
| `LOOP_LEDGER.md` | Execution ledger — what changed, what was verified, evidence |

## Concurrency note (multi-agent safety)

Assume other coding agents may touch this tree. File ownership for Phase 1:
`workspace-repository.ts` (data layer) and `LiveProjectCard.tsx` (image) are the
only mutated source files; `projects-page-client.tsx` was read but **not**
modified (search-deferral was deferred to avoid churning 5 test files). If a
concurrent agent edits these files, re-run the Phase-1 verification gate before
claiming done.
