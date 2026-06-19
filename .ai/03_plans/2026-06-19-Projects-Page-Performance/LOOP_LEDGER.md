# LOOP LEDGER — Projects Page Performance

Append-only. Newest at the bottom of each section.

## Goal
Make `/workshop/projects` load fast, with an evidence-backed plan and verified
implementation of the high-confidence wins.

## Decisions
- **D-01** Scope Phase 1 to the two load-path causes (data-tail serialization,
  eager images). Memo / virtualization / search-deferral deferred with gates —
  faking them would reduce quality (memo can't bind without prop restructuring;
  search-deferral churns 5 test files for a secondary win). Rationale in
  `01_DIAGNOSIS.md`.
- **D-02** Wrap `listCurrentWorkspaceProjects` in `cache()` (matches sibling
  helpers) rather than leaving it uncached.
- **D-03** Did NOT trim `select('*')` — the full `project` object flows to the
  client; needs a column-usage audit (Phase 3).
- **D-04** Absorbed the projects-page slice of `2026-06-17-Performance-Refactor`
  Phase 6 (LiveProjectCard memo) into this pack's Phase 2 — that phase never
  started.

## Phase 1 — execution log

### Changes
- `src/lib/repositories/workspace-repository.ts`
  - `listCurrentWorkspaceProjects` → `cache(async () => …)`.
  - Wave 2: `sharedProjects` ∥ `favoriteEstimateSheets` via `Promise.all`
    (`null` query skips the round-trip for empty inputs).
  - Wave 3: `readOptionalProjectPublications` ∥
    `readPendingCollaborationVisibilitySummary` via `Promise.all`.
  - Return shape, error semantics, ordering unchanged.
- `src/components/workshop/LiveProjectCard.tsx`
  - Thumbnail `<img>` gains `loading="lazy"` + `decoding="async"`.

### Verification
- [x] `bun run type-check` → exit 0 (2026-06-19).
- [x] `bun run build` → exit 0 (real gate for the data-layer change).
- [x] Targeted Vitest: `workshop-favorites-schema` + `workshop-project-groups-repository`
  → 8/8 PASS after test-anchor fix; `projects-page-*` + `ensure-default-workspace-cache`
  → 83 pass. (1 unrelated red, see below.)
- [x] Adversarial review (performance + correctness). Both confirm runtime behavior
  is byte-for-byte equivalent: each `Promise.all` wave is genuinely independent,
  error semantics preserved, `null`-query short-circuit reproduces old empty behavior,
  `cache()` is request-scoped and matches sibling helpers. One low-confidence note:
  `loading="lazy"` *could* deprioritize an above-the-fold LCP image — mitigated (small
  tiles, optional images, header chrome is likely LCP); flagged for the Lighthouse
  re-measure rather than over-engineering per-index `fetchpriority` now.
- [x] `git diff --check` clean on touched files.

### Required follow-up edit (caused by the `cache()` rename)
Two brittle **source-string** tests anchored on the old `export async function`
declaration and had to be updated to `export const listCurrentWorkspaceProjects = cache(`:
`tests/vitest/workshop-favorites-schema.test.ts` and
`tests/vitest/workshop-project-groups-repository.test.ts`. Both green after the fix.
(These two edits are in the working tree; the perf changes themselves are already committed.)

### Multi-agent commit note (vigilance)
A concurrent agent auto-committed during this session and swept my working-tree edits
into real commits: `f54754a4` (data-layer parallelize+cache), `165adfad` (carries the
lazy `<img>`), `d2a23887` (this plan pack). Verified HEAD contains my changes coherently
(cache wrap, wave-2 `sharedProjectsQuery`, wave-3 markers). No work lost; no orphaned stashes.

### Known unrelated red (NOT this pack)
`tests/vitest/projects-page-view-mode.test.tsx` "defaults to large cards…" fails on
`toHaveClass("workshop-project-card-glass")` — owned by the concurrent liquid-glass
commit `165adfad`, unrelated to the perf changes (image attrs don't affect that class).
Also pre-existing: `tests/vitest/workspace-repository-project-list.test.ts` (asserts
symbols that don't exist in the file; fails with the perf changes stashed too).

## Phase 2 — execution log (IMPLEMENTED 2026-06-19)

### Changes (`projects-page-client.tsx` + `LiveProjectCard.tsx`)
- `useDeferredValue(searchQuery)` now feeds the `displayProjects` filter and
  `filteredSamples`; the input stays bound to `searchQuery` for responsiveness, so
  keystrokes no longer block a full re-filter + re-sort of every card.
- `stableToggleProjectFavorite` / `stableToggleProjectSelection` via the existing
  `useStableCallback` (identity-stable, always-latest-closure → no stale-closure risk);
  passed to the cards in place of the inline handlers.
- `LiveProjectCard` is now `memo(LiveProjectCardImpl)`. It **binds in the default
  (non-group) view**, where `groupAssignMenu` is `undefined` (a stable primitive) and the
  toggle handlers are identity-stable — so unaffected cards skip re-render when an unrelated
  parent slice changes. Owned cards in group-organize mode still re-render correctly (their
  per-card group props change), which is desired.

### Verification
- [x] `bun run type-check` → clean.
- [x] `bun run build` → exit 0.
- [x] Vitest `projects-page` + `LiveProjectCard` → 73 pass (1 unrelated concurrent-glass red).
- [x] Notable: `useDeferredValue` did **not** break the 5 tests that assert search
  synchronously — jsdom's `act()` flushes the deferred value in-tick, so no test churn
  was needed (the original concern in `02_IMPLEMENTATION_PLAN.md` did not materialize).

## Phase 3 — execution log + evidence-based decisions (2026-06-19)

### Implemented
- **Off-screen virtualization via `content-visibility:auto`** on the card root, with a
  self-correcting `contain-intrinsic-size: auto <len>` seeded per view mode (large 360 /
  medium 300 / else 190, matching the card `min-h`). The browser skips layout+paint for
  off-screen cards; the `auto` keyword remembers each card's real height after first render
  (no lasting scroll drift). **Safe vs menus:** the card is already `overflow-hidden` and the
  menus still work → they portal out, so `contain: paint` adds no new clipping. Verified:
  type-check + build + tests green.

### Investigated → NOT shipped (evidence, not hand-wave)
- **`next/image`**: kept rejected. The current private-image route returns a same-origin
  `/api/projects/images?path=...` URL, but it is auth-gated and must carry the
  browser's session cookie. `next/image` would fetch through the optimizer from the
  server side without that cookie, so it breaks private project covers. Kept the
  `<img>` and validated the 512px thumbnail path instead.
- **`select('*')` column trim**: the big columns (`snapshot_json`, `selected_estimate_ids`)
  were already trimmed (2026-06-01). The whole `project` object flows to many client
  consumers (card, details modal, access resolver), so trimming the remainder risks dropping
  a needed column for marginal payload — poor risk/reward; not done.
- **DB index candidates**: the primary list query
  (`projects WHERE workspace_id ORDER BY updated_at DESC`) is **already covered** by
  `projects_workspace_updated_at_idx` (migration `20260520051908`), and `project_members(user_id)`
  is indexed. No EXPLAIN-justified gap → no new migration (honoring the indexing plan's
  prove-before-apply rule). Adding speculative indexes was explicitly avoided.

## Metrics + skeleton pass (2026-06-19)

### Metrics captured → `03_METRICS.md` (real numbers, two new proof tests)
- **Render-count proof** (`tests/vitest/perf/projects-page-render-baseline.test.tsx`):
  typing 7 chars → **0** card re-renders (naive ~70); sort toggle → **0** (naive ≥10);
  mount → 10; view-mode change → 10 (control). Proves Phase 2; fails if memo/defer removed.
- **Server-parallelism proof** (`tests/vitest/perf/projects-page-server-parallelism.test.ts`,
  stable ×3): latency-injected Supabase mock shows wave-2 overlap **52ms**, wave-3 overlap
  **50ms**, total **208ms vs ~300ms serial floor** — the 4→2 round-trip collapse is real.
- **Image lazy-load proof (LIVE, authed browser)**: **0 image bytes above-the-fold** on
  first paint; **~483 KB** (incl. 414 KB hero) deferred to scroll.
- **Live authed nav (DEV server, caveated)**: TTFB 711ms / FCP+LCP 812ms cold; Lighthouse
  perf 56 / LCP 10.6s / CLS 0 — **dev-mode only** (unminified + Turbopack JIT), not prod.
- **Bundle** (webpack analyzer): projects entry **21.2 KB gzip**; shared baseline 123.3 KB;
  est. First Load ≈165 KB gzip. Runtime is the win, not bundle (A/B delta <0.5 KB).
- **Resolved:** production-representative authed Lighthouse was later captured with a
  real Supabase session against `next build` -> `next start`; see `03_METRICS.md`
  section 7. This is local production-build proof, not hosted Vercel proof.
- **Remaining harness gap:** `e2e/route-transition-performance.spec.ts` never injects
  the bypass cookie, so its authed scenario redirects to `/login` (worth patching for CI).

### Skeleton loading
- `src/app/workshop/projects/loading.tsx`: added the **access-tabs bar** placeholder
  (glass `bg-white/45` pill row) above the card grid — the one structural gap vs the real
  page (the card-grid skeleton already matched the default "large" view). Modeled on the
  dashboard's `StaticWorkshopLoadingShell` + `Skeleton` (`animate-pulse … motion-reduce:animate-none`).

### Verification
- [x] `bun run build` (turbopack) → passed.
- [x] `bun run test:dom -- projects-page-render-baseline` → 4/4 pass.
- [x] type-check: my files (loading.tsx, LiveProjectCard.tsx, render test) clean.

### Concurrent-agent red (NOT this pack)
After a clean rebuild, `tsc` reports ONE error at `workspace-repository.ts:1198`
(`assertEstimateNodeRecord` — `kind` typed `string` vs the node-kind enum). This is a
**concurrent agent's uncommitted in-flight refactor** of the `workspace_homebase_summary`
RPC payload parsing (confirmed via `git diff`), unrelated to the projects-page perf work.
Left untouched to avoid clobbering their active edits.

## Open follow-ups (tracked)
- Optional: extract a memoized `ProjectCardRow` so owned cards in *group-organize* mode also
  bind memo (currently they re-render by design) — only if a render-count gate shows it pays.
- Re-run multi-run authed Lighthouse to confirm LCP/Slow-3G gaps close.
- Visual scroll-behavior spot-check of `content-visibility` on a large list (self-correcting,
  but worth a one-time confirm).
