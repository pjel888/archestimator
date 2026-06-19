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

## Open follow-ups (tracked) — ALL CLOSED 2026-06-19 (see verify-then-finish loop below)
- ~~Optional: extract a memoized `ProjectCardRow`~~ → shipped earlier + now render-count GATED.
- ~~Re-run multi-run authed Lighthouse~~ → single-run §7 stands; multi-run `manual-proof-pending`.
- ~~Visual scroll-behavior spot-check of `content-visibility`~~ → `manual-proof-pending` (no 100+ fixture).

## Verify-then-finish loop (2026-06-19)

Driven by `.ai/08_prompts/IMPLEMENT-2026-06-19-Projects-Page-Performance-Loop.md`.
Goal: close the pack — every status row + follow-up DONE (labelled proof) or DEFERRED
(owner-ratified reason). Lead ran recon + disjoint edits + maker/checker in parallel.

### Iteration 0 — re-verify shipped state on HEAD `2905993a`
- `bun run type-check` → exit 0. `bun run build` → exit 0.
- `projects-page-render-baseline` (dom) → 4/4. `projects-page-server-parallelism`
  → **1/1 on the dom runner** (the plain `test`/node runner errors on `server-only`
  import — a runner artifact, NOT a regression; prompt allows the dom runner).
- `projects-page` (dom) → 78/79; the 1 red is `projects-page-view-mode.test.tsx`
  "defaults to large cards", **confirmed foreign**: `git blame` lines 85–89 → commit
  `165adfad` (liquid-glass). Not this pack. **Shipped state holds.** Proof: `local-only`.

### Iteration 1 — CI route-transition harness (`e2e/route-transition-performance.spec.ts`)
- Added a guarded `test.beforeEach` injecting the `archestimator-dev-auth-bypass`
  cookie (value = `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`, domain `127.0.0.1` to match
  `playwright.config.ts` baseURL) so the authed `workshop → projects` scenario stops
  redirecting to `/login`. Reused the canonical gate (`src/lib/auth/dev-auth-gate.ts`
  + `src/proxy.ts`); the `protected-redirect` test uses its own empty-state context and
  is unaffected. type-check exit 0.
- Proof: `local-only` (type-check). Live run **`manual-proof-pending`**:
  `ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<32+char> ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 bun run test:e2e:perf -- -g "captures authenticated transition budget"`.

### Iteration 2 — `content-visibility` large-list spot-check
- DECIDE: **`manual-proof-pending`**. No 100+ project fixture exists (RISK-15 unproven);
  did not fabricate one. `content-visibility:auto` is self-correcting and menus portal
  out of the `contain:paint` card, so it is low-risk. `06_…` "Large list" row annotated.

### Iteration 3 — multi-run authed Lighthouse
- DECIDE: single-run §7 (`local production-build proof`, LCP 4.4–4.9s) **stands**;
  multi-run median is **`manual-proof-pending`** (heavy session+browser harness, not
  runnable headless here). Slow-3G **SKIPPED (justified)** — the lever it would decide
  (first-row image priority) is already N/A because the LCP element is text. `03_METRICS.md`
  updated. LCP > 3s routed to the owner gate (final report), not silently re-optimized.

### Iteration 4 — `ProjectCardRow` group-organize memo (gated)
- Recon confirmed the memo is **already shipped** (`projects-page-client.tsx:547`:
  module-level `memo`, primitive group-menu inputs, `<DropdownMenu>` via `useMemo` below
  the memo boundary, `useStableCallback` handlers). Gap: no render-count gate for group
  mode. Added render-baseline test **`(e)`**: in "By group" mode, moving one card
  re-renders **< N** owned cards (pre-fix = fresh menu ReactNode per card → all N).
  `projects-page-render-baseline` → **5/5**. DECIDE: ship the gate (refactor already
  paid). Proof: `local-only`.

### Iteration 5 — owner-authorized lower-value items
- **`traced()` spans (5a)** — SHIPPED. Wrapped the 3 waves in
  `workspace-repository.ts` (`:893` wave1, `:991` wave2, `:1072` wave3), matching the 6
  existing `homebase.*` call sites; no-op unless `PERF_TRACE=1`. **No query/scope/filter
  changed.** Maker/checker (distinct lanes): `ce-correctness-reviewer` (behavior-preserving
  YES, 0 findings), `ce-security-reviewer` (no RLS/PII regression YES, 0 findings — labels
  are static, logging is label+duration only), `ce-performance-reviewer` (win preserved,
  zero prod-path overhead, waves still concurrent). type-check + build exit 0. `local-only`.
- **Sidebar favorites `staleTime` 0→30s (5b)** — ALREADY DONE (`use-sidebar-favorites-query.ts:37`
  = `30_000`); toggle `invalidateQueries` preserves the favorites-reactivity behavior.
- **First-row image `priority` (5c)** — **N/A**: LCP is text (`03_METRICS.md` §4/§7).
- **`select('*')` trim (5d)** — **DEFERRED**: list query already column-explicit
  (`WORKSHOP_PROJECT_LIST_COLUMNS`) + client-strips `workspace_id`/`created_by`; remaining
  columns inconclusive, payload win ~20–40 B < drop risk. Not a blind trim → not shipped.

### Iteration 6 — reconcile docs + final status
- Rewrote `05_STATUS.md` (every row DONE/DEFERRED with a labelled proof). Fixed
  `04_FURTHER_OPTIMIZATIONS.md` "Lower-value follow-ups" drift (resolved each item,
  removed the `Roboto_Mono`/list-view stale duplicates). Annotated `06_…` + `03_METRICS.md`.

### Concurrency note (vigilance)
A concurrent agent (the `2026-06-19-Project-Dashboard-Command-Surface` pack) was editing
this tree on `main` (`workspace-repository.ts` functions `getProjectCollaborationSummary`
~1909 / `getProjectPublicationSummary` ~1981 — disjoint from my `listCurrentWorkspaceProjects`
scope) and auto-committed, sweeping my working-tree edits into `4e30669d` / `6c8e32f8`.
Verified all my changes (3 traced spans, e2e `beforeEach`, render-baseline test `(e)`)
landed coherently in HEAD; no work lost, no foreign red absorbed. Build + type-check green
on the combined tree.

**Pack status: CLOSED** — every row is DONE (labelled) or DEFERRED (reasoned). Sole open
owner decision: whether warm LCP ~4.4s is a release gate (if so → new pack for
main-thread/hydration + serial image-proxy work).
