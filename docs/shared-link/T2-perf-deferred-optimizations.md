# Shared Link — Track T2 Performance: shipped vs. design-ready-deferred

Branch: `claude/2026-06-13-Shared-Link-Improvement-Plan`. Spec: `.ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/04_PERFORMANCE_AUDIT.md`.

## Shipped (P-Perf-1, commit `perf(share): defer telemetry ... (T2 P-Perf-1)`)
- **OPT-1** — both `/share` telemetry writes deferred off the response path with `after()` (AC-PERF-02: zero blocking writes before `return`).
- **OPT-2** — token→publication-row lookup de-duplicated per request with `React.cache` (AC-PERF-03: 1 access read + 1 snapshot read; the access-state gate stays uncached and re-evaluated every visit).
- **OPT-3** — single service-role client per request via `React.cache`.
- **OPT-4** — independent recipient-identity + snapshot reads run with `Promise.all`.
- **OPT-9** — hero cover image marked `priority` for LCP (CLS protected by the explicit aspect ratio).

All verified by `bun run build` (Next 16 production build), `bun run type-check`, ESLint (0 errors), the share/publication test suites, and the design-system lint.

## Deferred — design-ready (NOT shipped), pending a live runtime to measure + validate

These are perf **TARGETS** in the audit, not correctness gates. They were deliberately not shipped because their benefit is unmeasurable without a live environment and their failure modes (stale content, Next 16 cache-invalidation semantics, broken scroll-to-node nav) cannot be verified here — shipping them blind conflicts with the zero-bug bar. The within-request `React.cache` dedup (OPT-2, shipped) already removes the redundant per-request reads.

### OPT-5 — cross-request, version-keyed snapshot-bytes cache (AC-PERF-08)
**Goal:** cache the immutable `snapshot_json` bytes keyed by `token_hash + snapshot_version` so warm traffic skips the JSONB read.

**Safe design (verified on paper):**
1. Resolve the active-state gate UNCACHED and FIRST in `resolveProjectPublicationSnapshotByToken` (via `getCachedPublicationAccessRowByToken`, which is per-request only). A revoked/expired publication returns `null` here, *before* any cached bytes are read — so a warm cache can never serve a revoked proposal.
2. Only for a known-active publication, read the bytes through a cross-request cache keyed by `[token_hash, snapshot_version]`. A republish/rotate bumps `snapshot_version`, so the key changes and fresh bytes are read (self-invalidating). Revoke is handled by step 1's gate.
3. Invalidation hooks on `createProjectPublication` / `republishProjectPublication` / `rotateProjectPublicationLink` / `revokeProjectPublication` purge the tag for the affected `token_hash`(es) — belt-and-suspenders cleanup of lingering unused entries.

**Why deferred — the Next 16 caching-API fork (confirmed against `next@16.2.6`):**
- The legacy data cache is `unstable_cache(fn, keyParts, { tags })` from `next/cache`.
- The new Cache Components API is `"use cache"` + `cacheTag()` + `cacheLife()`, invalidated by `updateTag(tag)` (immediate) or `revalidateTag(tag, profile)` (now a **2-arg** signature in 16.2.6).
- Whether the new `updateTag`/`revalidateTag` reliably purge **`unstable_cache`** entries (vs only `"use cache"` entries) is exactly the runtime behavior that cannot be confirmed without a live server. Note the correctness/security of the design above does NOT depend on the invalidation hooks firing (the version-key + uncached gate fully cover it) — but shipping an invalidation call that may be a silent no-op is not acceptable polish.

**Recommended implementation when picked up (live env available):** use the Cache Components path end-to-end — a `"use cache"` snapshot-bytes reader tagged with `cacheTag(\`publication-snapshot:${token_hash}:${snapshot_version}\`)` + `cacheLife("max")`, invalidated via `updateTag(...)` in the four lifecycle actions — and add a Playwright/integration check that a revoke is reflected immediately (and that a warm hit skips the JSONB SELECT). Keep the uncached active-state gate first regardless.

### OPT-6 — stream a static shell with Suspense / PPR (AC-PERF-04/05)
Defer until live. The page currently resolves all data server-side before render; introducing a Suspense boundary requires splitting the snapshot fetch into a suspended segment with a skeleton whose dimensions match the content (to protect CLS, AC-PERF-05). The benefit (streaming TTFB / perceived load) and the CLS risk are only measurable in a browser. Implement with Next 16 PPR/Cache Components, skeleton sizing verified against the P-UI-0 visual baseline.

### OPT-8 (virtualization half) — virtualize long Grid/Tree row lists (AC-PERF-06)
The chart geometry / tree reconstruction is already memoized (`useMemo` on `donutBuckets`, `treeNodes`, `filteredRows` in `SharePageTabs.tsx`). List **virtualization** is deferred: it interacts with the scroll-to-node nav (`SharePageTabs` `handleTreeNavigate`) and the per-node `data-share-tree-node-id` lookups — virtualized nodes must stay observable/scrollable. Without a live browser to verify the nav still works and to confirm the row-count threshold is worth the complexity, shipping it risks a nav regression. Implement behind a high row-count threshold with the nav preserved, validated in a browser.

### OPT-7 / OPT-10 — `[DB]` (deferred with Track T4)
Snapshot row de-dup + `snapshot_hash` (OPT-7) and the owner activity-feed unified RPC (OPT-10) are DB-channel units — design-ready, execution-deferred under the no-DB-channel constraint (see `05_DATABASE_AUDIT.md` and the T4 pending-review SQL pack).
