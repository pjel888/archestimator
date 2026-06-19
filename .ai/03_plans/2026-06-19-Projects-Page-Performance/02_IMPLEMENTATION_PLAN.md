# Implementation Plan — `/workshop/projects` performance

Phased by **confidence × impact × risk**. Phase 1 is implemented in this pass;
Phases 2–3 are specified with explicit prerequisites and gates so they can be
picked up safely (by a human or an agent) without re-discovery.

## Phase 1 — Load-path wins (IMPLEMENTED 2026-06-19)

High-confidence, low-risk, directly on the "slow when I navigate there" path.

### P1.1 — Parallelize the data tail + `cache()` · `workspace-repository.ts`
- Collapse the 4 serial awaits into **two concurrent waves**:
  - Wave 2: `sharedProjects` ∥ `favoriteEstimateSheets` (empty inputs skip the
    round-trip via `null` query → `null` response).
  - Wave 3: `readOptionalProjectPublications` ∥ `readPendingCollaborationVisibilitySummary`.
- Wrap `listCurrentWorkspaceProjects` in React `cache()`.
- **Invariants preserved:** identical return shape; identical error semantics
  (each response's `.error` still throws; favorite-error only throws when there
  are favorite ids); identical ordering (`updated_at desc`, favorite 5-cap,
  pending-invite dedup). Concurrent reads on one Supabase client are already the
  established pattern (wave-1 runs 8).
- **Expected effect:** removes ~2 serial round-trips from server render →
  reduces the LCP-blocking waterfall.

### P1.2 — Lazy-load card thumbnails · `LiveProjectCard.tsx`
- Add `loading="lazy"` + `decoding="async"` to the thumbnail `<img>`.
- **Expected effect:** below-the-fold thumbnails no longer fetch on first paint;
  cuts initial image bytes from O(all projects) to O(viewport).

### Phase 1 verification gate (proportional)
1. `bun run type-check` — **PASS** (exit 0, captured in ledger).
2. Targeted Vitest: all 7 `tests/vitest/projects-page-*.test.tsx` + any
   `workspace-repository` repo tests.
3. `bun run build` — the real gate for server/data-layer changes.
4. Adversarial review: parallel `ce-performance-reviewer` +
   `ce-correctness-reviewer` on the diff; adopt valid findings.
5. `git diff --check` (whitespace) on touched files.

## Phase 2 — Client render cost (PLANNED, gated)

Bigger, coupled, needs a render-count proof. Do as one unit so the memo actually
binds and the test churn happens once.

- **P2.1 Stabilize card props** so memo can bind: wrap `onToggleFavorite` /
  `onExpand` in `useCallback`; restructure `groupAssignMenu` so it is not a fresh
  ReactNode every parent render (e.g., pass primitive props + build the menu
  inside the card, or memoize per-item).
- **P2.2 `React.memo(LiveProjectCard)`** — only after P2.1.
- **P2.3 `useDeferredValue(searchQuery)`** feeding the `displayProjects` filter;
  update the 5 projects-page tests that assert search synchronously to
  `await waitFor`/`findBy`.
- **P2.4 (optional) Split the 1,481-line client** — push static card chrome to a
  server component, keep only interactive leaves client. Highest risk; only if
  P2.1–P2.3 don't close the hydration cost.
- **Gate:** a new `tests/vitest/perf/projects-page-render-baseline.test.tsx`
  (cloned from `estimate-sheet-render-baseline`) must show a measured drop in
  re-render count for sort/favorite/search with **no behavior change** in the 7
  existing tests.

## Phase 3 — Scale hardening (PLANNED, conditional)

- **P3.1 Real large-data fixture** (100+ projects) — resolve
  `2026-06-17-Performance-Refactor` RISK-15 first. Without it, virtualization is
  speculative.
- **P3.2 Grid virtualization** — only if P3.1 shows DOM-node cost is real at
  scale; must preserve grouping + responsive auto-fill + SSR.
- **P3.3 `select(...)` column trim + `next/image`** — after a column-usage audit
  (whole `project` object currently flows to the client) and image-`sizes` tuning.
- **P3.4 DB index candidates** — coordinate with
  `database-indexing-and-query-performance`; prove with `EXPLAIN` before/after.

## Measurement protocol (adopt for before/after proof)
- **Server waterfall:** `PERF_TRACE=1` + `withPerfTraceRequest("workshop.projects", …)`
  around the data fetch → count Supabase round-trips (expect the serial tail to
  drop from 4 to ≤2 sequential).
- **Route transition:** `SCENARIO_FILTER="workshop to projects" RUNS=5
  bun run scripts/measure-route-transitions.ts` against a dev server.
- **LCP / Slow-3G:** fresh **multi-run** authed Lighthouse (the 2026-06-01 number
  was single-run) — confirm the 865ms / 1941ms gaps close.
- **Image bytes:** Playwright `performance.getEntriesByType("resource")` filter to
  images — confirm first-paint image bytes drop with lazy loading.

## Explicit non-goals
Shared-favorites data model · settings Slow-3G · charts-buckets hosted apply ·
repo-wide `auth.uid()` initplan wrap · estimates-list RPC (already shipped).
