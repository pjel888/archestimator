# Estimates List Page — Performance & Quality Optimization — Implementation Ledger

**Date:** 2026-06-14
**Plan:** `.ai/03_plans/2026-06-14-Estimates-List-Page-Performance-Optimization/` (now archived to `.ai/09_archive/`)
**Branch:** `2026-06-14-Estimates-List-Page-Performance-Optimization` (worktree `nervous-davinci-2c7b9c`)
**Route:** `/workshop/projects/[projectId]/estimates`

## Outcome

Fully implemented across phases P-1 → P3. The page felt slow not because of data
volume (the audited project had ~1 estimate) but because of three architectural
defects: a global blur+spinner overlay firing on every `router.refresh()`, no
client store (so every CRUD round-tripped + re-rendered the whole layout before
anything was visible), and a wrong-shaped loading skeleton. All three are fixed,
plus the latent DB scaling-cliff + security over-fetch.

## What shipped (by phase)

- **P-1 (entry gate):** canonical `ProjectEstimateListRow` DTO (no `Tables<"estimates">`
  in the client row — `metadata`/`created_by` can't leak, contract-tested);
  create/duplicate return `{ row }`, update/regenerate return `{ estimate }` scalar
  projections; per-mount Zustand optimistic store with a full conflict policy
  (reseed-vs-pending, concurrent rename+duplicate, multi-create, position-restoring
  delete rollback); stale `router.refresh` test assertions inverted (captured RED in
  `metrics/p-1-evidence.md`, turned green by P0).
- **P0 (felt latency):** client store wired into `ProjectEstimatesClient`/`Table`
  behind an `OPTIMISTIC_ESTIMATE_LIST_ENABLED` cutover gate. Optimistic create
  ("Creating…" placeholder → reconcile/rollback), inline rename/notes/budget/auto-code
  (store patch, no refresh), delete (synchronous removal + rollback), duplicate
  ("<name> Copy" placeholder → reconcile). Reset-column-widths is local-only. Overlay
  no longer fires on in-place mutations. Table-shaped `ProjectEstimatesListSkeleton`
  replaces the node-route `ProjectRouteContentFallback` (kills the wrong-shape flash).
  `silentRefresh` added for the rare overlay-free reconciliation. e2e CRUD-latency +
  shell-streaming specs added (session-gated). Measurement scaffolding (`traced()`,
  `WebVitalsProbe`) dormant behind `PERF_TRACE`/`NEXT_PUBLIC_PERF_TRACE`.
- **P1 (server waterfall):** `ensureDefaultWorkspace` memoized with `cache()` (F6);
  header chrome (publication + teamspace + sheets fan-out) streamed via
  `ProjectChromeAsync` behind Suspense so the shell + table skeleton paint first (F5);
  the Teamspace project cursor layer moved into `ProjectChromeAsync` (reuses the
  resolved collaboration identity, stays a fixed overlay). F7 (redundant projects
  re-query) is solved by Teamspace's cached `getCurrentWorkspaceProject` reuse — our
  resolved-project param was superseded and removed during the merge.
- **P2 (DB scaling + over-fetch):** `project_estimate_list_summaries(target_project_id)`
  — one `security invoker` aggregate RPC replaces the all-nodes+all-rows JS fold (F8),
  Path A keeps the depth-first/area-first `firstNodeId` JS oracle; `estimates.select('*')`
  → explicit `ESTIMATE_LIST_COLUMNS` (F9, no metadata/created_by to client);
  `is_workspace_member` `auth.uid()` → `(select auth.uid())` initplan caching (F10 —
  the one estimate-access helper Teamspace's 20260614120100 left uncovered).
- **P3 (hardening):** list-route `error.tsx` → `WorkshopRouteErrorState` (F13);
  `/workshop/:path*` security headers (F14 — satisfied by Teamspace's broader
  `appAndInviteHardening` block); edit-authZ on sheet actions — `can_edit_project`
  for create, `can_edit_estimate` for duplicate/update/regenerate (F15, clean denial
  before any write). F16 (rate-limit) explicitly deferred.

## Proof

- `bun run type-check` 0 errors; `bun run lint` 0 errors (15 pre-existing warnings in
  unrelated files); bun unit 9/9; **DOM Vitest 287 files passed / 1 skipped / 0 failed
  (2155 tests)** under Node v25.8.0, integrated with the merged Teamspace + Charts work.
- **RPC parity (PG17 prove-harness):** `scripts/prove-estimate-list-summaries-postgres.mjs`
  PASS 5 cases (zero-row, contingency=0, contingency=null, misc-only, multi-row) byte-identical to the JS oracle.
- **RLS parity:** `scripts/prove-rls-initplan-postgres.mjs` PASS 9 decisions identical
  (owner/collaborator/non-member) with before/after `(select auth.uid())` guards.
- **EXPLAIN evidence:** `metrics/p2-explain-{before,after}.txt` — at 5,000 row-items the
  RPC returns 1 row/estimate vs 5,000 rows scanned+shipped (the O(estimates) win).
  Honest correction recorded: single-estimate DB-side buffer reads stay flat (~134);
  the win is result-set / network / JS-fold size, not buffer count.
- **Hosted (`ebxxqidacheyapmmzavr`):** both migrations applied via MCP (RPC +
  `is_workspace_member`); RPC verified byte-identical to the raw fold on REAL data
  (node/row/total match for both estimates in project `22222222…`);
  `get_advisors(security)` adds **0 new findings** (the RPC is clean; `is_workspace_member`'s
  2 security-definer-executable warnings are pre-existing, not introduced).

## Concurrent-agent reconciliation (merge of origin/main: Teamspace + Charts)

origin/main advanced 7 commits while this work was in flight. Conflicts resolved
preserving BOTH sides with 0 data loss:
- `layout.tsx` / `ProjectChromeAsync`: kept streaming AND the Teamspace cursor layer
  (moved into the streamed chrome).
- `next.config.ts`: took Teamspace's broader `appAndInviteHardening` (covers /workshop
  + /invite + HSTS) which supersedes our standalone workshop headers.
- `workspace-repository.ts` summaries: adopted Teamspace's cached-project F7 fix; our
  resolved-project param dropped.
- **P2-3 RLS:** trimmed to only `is_workspace_member` (Teamspace already wrapped
  `can_access_estimate` + `current_project_access_rank` byte-identically).
- **Cross-plan fix:** Charts' `get_project_chart_buckets` migration used `with` for a
  recursive CTE (`node_climb` self-reference) — a clean-apply deploy-breaker, and it had
  not been applied to hosted. Changed to `with recursive`. Surfaced because the local
  prove-harnesses apply every migration.

## Deferred / not done (explicit)

- F16 create/duplicate rate-limiting (insert-retry already prevents code collisions).
- Pagination / server-side search (decision point after P2; baseline showed row-count
  is not the dominant cost at current volume).
- Live browser RUM (Web Vitals / HAR / create→visible stopwatch) requires the user's
  authenticated Chrome session (dev-auth disabled); scaffolding + e2e specs ship ready.
- Charts' `get_project_chart_buckets` RPC is now correct but still not applied to hosted
  (that is the Charts plan's call, not this one).

## Pre-existing / out-of-scope reds (not introduced here)

- `lint:design-system` violations in `ProposalExportPreviewDialog.tsx` (Spreadsheet
  Export plan's file) — present on origin/main, untouched here.
