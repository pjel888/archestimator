# Diagnosis — `/workshop/projects` performance

Synthesized from four parallel read-only analysts (render-path, data-fetch,
prior-art, measurement) on 2026-06-19. Every finding carries file:line evidence.

## Observed baseline (from `2026-06-14-Overall-Site-Performance` speed matrix)

- **LCP 3865ms** vs ≤3000ms target → **~865ms gap** (Tier C).
- **Slow-3G 6941ms** vs 5000ms ceiling → **~1941ms gap**.
- TTFB 630ms (good), CLS 0 (excellent), TBT 124ms (good).
- Caveat: single Lighthouse run, post-payload-trim, 2026-06-01. Needs a fresh
  multi-run authed re-measure to confirm the gap and the fix (see plan §Measurement).

The good TTFB but poor LCP points away from "slow server connection" and toward
**(a) a server data waterfall that delays the document** and **(b) heavy
client/image work after the document arrives** — exactly what the analysts found.

## The four root causes

### 1. [SERVER] Serial data tail in `listCurrentWorkspaceProjects` — HIGH
`src/lib/repositories/workspace-repository.ts`

Wave 1 is already optimal: **8 queries in parallel** (`Promise.all`, ~line 867).
But after it, up to **4 independent queries ran serially**:
- `sharedProjects` (was ~938) — depends only on wave-1 `sharedProjectIds`.
- `favoriteEstimateSheets` (was ~955) — depends only on wave-1 `favoriteEstimateIds`.
- `readOptionalProjectPublications` (was ~1019) — depends only on `projectItems`.
- `readPendingCollaborationVisibilitySummary` (was ~1029) — depends only on `projectItems`.

`sharedProjects`/`favorites` are independent of each other; `publications`/
`pendingInvites` are independent of each other. Run serially they add up to ~4
round-trips of latency to the document a user is waiting on.
**Fix (Phase 1): two concurrent waves → 2 round-trips instead of 4.**

Secondary, same function:
- `select('*')` on `projects` (and shared `projects`) over-fetches columns the
  list doesn't render. **Deferred** — the whole `project` object flows to the
  client (`page.tsx` → `ProjectsPageClient`), so trimming needs a column-usage
  audit. (Big columns `snapshot_json` / `selected_estimate_ids` were already
  trimmed on 2026-06-01.)
- Not React-`cache()`d (siblings `ensureDefaultWorkspace` /
  `listMainSidebarFavoriteProjects` are). **Fix (Phase 1): wrap in `cache()`**
  as request-scoped insurance against accidental double execution.

### 2. [BUNDLE/HYDRATION] One 1,481-line `"use client"` component — HIGH (deferred)
`src/components/workshop/projects-page-client.tsx:1` is entirely client, and
each `LiveProjectCard` (724 lines, `"use client"`) hydrates fully and is **not
memoized**, so any parent state change (sort, search, favorite toggle) re-renders
every card. Cheap icon cost is already mitigated (`optimizePackageImports` for
`@phosphor-icons` in `next.config`).

**Why deferred, not faked now:** a naïve `React.memo(LiveProjectCard)` **will not
bind** — the parent passes `groupAssignMenu={renderProjectGroupMenu(item)}`
(`projects-page-client.tsx:1060`), a **fresh ReactNode every render**, which
breaks shallow-prop equality. Making memo effective requires restructuring how
the group menu + callbacks are passed (stabilize `onToggleFavorite`,
`onExpand`, and the menu) and proving the win with a render-count test. That is
Phase 2, gated — shipping a memo that doesn't bind is false confidence.

### 3. [RENDER] No virtualization + un-deferred search — HIGH at scale (deferred)
`projects-page-client.tsx:595-609` recomputes + re-sorts **all** filtered cards on
**every search keystroke** (`searchQuery` in the `useMemo` deps), and the grid
renders every project to the DOM (no virtualization, `:1349-1404`).

**Why deferred:**
- *Search-deferral* (`useDeferredValue`) is a real interaction win but is
  **secondary** to the load-time complaint, and the projects-page tests assert
  search results **synchronously** after `fireEvent.change`
  (`tests/vitest/projects-page-access-tabs.test.tsx:273-275`), so it would force
  churning sync→async assertions across 5 test files (two already uncommitted).
  Phase 2, bundled with the memo work + test updates.
- *Virtualization* only pays off at ~100+ projects and is high-risk against the
  grouped + responsive auto-fill grid. The real large-data fixture that would
  justify it is **feasibility-unproven** (`2026-06-17-Performance-Refactor`
  RISK-15). Phase 3, conditional on a real fixture.

### 4. [IMAGE] Eager-loaded `<img>` thumbnails — HIGH on bandwidth/LCP
`LiveProjectCard.tsx:446-459` renders a plain `<img>` with **no `loading="lazy"`**,
so all 50–100 project thumbnails fetch on first paint regardless of viewport.
**Fix (Phase 1): `loading="lazy"` + `decoding="async"`.** Later proof kept the
plain `<img>` intentionally because the private image proxy is auth-gated and must
carry the browser session cookie; `next/image` server-side optimizer fetches cannot
prove that session. The safe win is the 512px thumbnail path plus browser-loaded
WebP output, not an optimizer migration.

## Measurement infrastructure that already exists (reuse, don't rebuild)
- Route-transition harness: `scripts/measure-route-transitions.ts` (has a
  "Workshop to Projects" scenario) + budgets in
  `e2e/route-transition-performance-budgets.json`.
- Server timing: `src/lib/perf/server-timing.ts` (`traced` / `withPerfTraceRequest`,
  gated by `PERF_TRACE=1`) — already imported in `workspace-repository.ts`.
- Render-count probe pattern: `src/components/workshop/estimate-sheet-render-probe.ts`
  + `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx` — the template for
  a future projects-page render-count gate (Phase 2).
- Bundle analyzer: `ANALYZE=true next build --webpack` → `.next/analyze/client.html`.
