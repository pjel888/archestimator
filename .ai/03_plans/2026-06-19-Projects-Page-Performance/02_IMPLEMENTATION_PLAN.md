# Implementation Plan — `/workshop/projects` performance

Phased by **confidence x impact x risk**. This file began as the implementation
plan; after the 2026-06-19 passes it is now the implemented phase record plus the
remaining gate list. Do not re-run Phase 1-3 from scratch. Use `LOOP_LEDGER.md`
for exact changes and `03_METRICS.md` for proof.

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

## Phase 2 — Client render cost (IMPLEMENTED 2026-06-19)

Bigger and coupled, so it was done as one unit and locked with a render-count
proof.

- **P2.1 Stabilized card props** with identity-stable callbacks and primitive
  group-menu inputs where needed.
- **P2.2 `React.memo(LiveProjectCard)` shipped.**
- **P2.3 `useDeferredValue(searchQuery)` shipped** without test churn; jsdom
  `act()` flushed the deferred value for existing synchronous assertions.
- **P2.4 client split rejected for now**: later bundle audit found most of the
  client is genuinely interactive; code-splitting modal/popover leaves produced
  a better risk/reward ratio.
- **Proof:** `tests/vitest/perf/projects-page-render-baseline.test.tsx` now shows
  search typing and sort toggles cause zero card-body re-renders in the 10-card
  fixture; see `03_METRICS.md` section 1.

## Phase 3 — Scale hardening (PARTLY IMPLEMENTED; remainder evidence-gated)

- **P3.1 Real large-data fixture** (100+ projects) remains open — resolve
  `2026-06-17-Performance-Refactor` RISK-15 first. Without it, virtualization is
  speculative.
- **P3.2 Heavy virtualization deferred**; lightweight `content-visibility:auto`
  shipped for cards/list rows because it keeps layout semantics and avoids a new
  virtualization dependency.
- **P3.3 `select(...)` column trim remains deferred** after a column-usage audit
  showed poor risk/reward. Image work shipped through 512px thumbnails and
  verified proxy-rendered WebP output; see `03_METRICS.md`.
- **P3.4 DB index candidates rejected for now**: existing indexes cover the
  primary query and speculative indexes violate the prove-before-apply rule.

## Measurement protocol (adopt for before/after proof)
- **Server waterfall:** `PERF_TRACE=1` + `withPerfTraceRequest("workshop.projects", …)`
  around the data fetch → count Supabase round-trips (expect the serial tail to
  drop from 4 to ≤2 sequential).
- **Route transition:** `SCENARIO_FILTER="workshop to projects" RUNS=5
  bun run scripts/measure-route-transitions.ts` against a dev server.
- **LCP / Slow-3G:** production-representative authed Lighthouse is now captured
  once with a real Supabase session (`03_METRICS.md` section 7). Slow-3G remains
  uncaptured and should be measured only if it will drive the next implementation
  lever.
- **Image bytes:** Playwright `performance.getEntriesByType("resource")` filter to
  images — confirm first-paint image bytes drop with lazy loading.

## Explicit non-goals
Shared-favorites data model · settings Slow-3G · charts-buckets hosted apply ·
repo-wide `auth.uid()` initplan wrap · estimates-list RPC (already shipped).
