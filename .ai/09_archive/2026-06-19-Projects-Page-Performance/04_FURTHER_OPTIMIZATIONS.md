# Further optimizations — exhaustive audit + what shipped

2026-06-19. Four parallel adversarial auditors (bundle, image, data/network,
render) hunted for every remaining `/workshop/projects` optimization that does
**not** sacrifice UX/UI. This is the honest "have we exhausted it?" ledger:
what shipped this round, what's left, and why.

## Shipped this round (load-speed wins)

### IMG — the 414 KB image bug + auth-carrying `<img>` (biggest single win)
The upload pipeline (`src/app/api/projects/images/route.ts`) already generates a
**512 px thumbnail** (`metadata.projectImageThumbnailUrl`) alongside the 1600 px
full image, but the card read the **full** image into a ~248–320 px box (the
414 KB the live capture found).
- `LiveProjectCard.tsx` `getProjectImageUrl` now prefers
  `projectImageThumbnailUrl ?? projectImageUrl` (fallback keeps pre-thumbnail
  projects working). **~85–90% fewer image bytes per card.**
- Kept a browser-rendered `<img>` intentionally. The auth-gated image proxy needs
  the browser session cookie; `next/image` would fetch server-side through the
  optimizer without that cookie and break private covers. The shipped fix is the
  512px thumbnail path plus `loading="lazy"` / `decoding="async"` on the plain
  image.

### STREAM — Suspense boundary so the shell flushes immediately
`page.tsx` previously `await`ed the whole data fetch before returning any JSX. The
fetch now lives in an async `ProjectsData` child inside `<Suspense fallback=…>`, so
the shell chrome streams to the browser instantly and the grid streams in. Fallback
reuses the exact `loading.tsx` skeleton (extracted to `ProjectsListSkeleton`) → no
double-flash.

### BUNDLE — code-split interaction-only components
`BulkDestructivePreviewModal` was statically imported (mounted always), which
dragged the whole dialog stack into the entry chunk and defeated the other modals'
lazy split. Now: `BulkDestructivePreviewModal` + `ManageGroupsPopover` are
`next/dynamic({ ssr:false })`; `NewProjectModal`/`ProjectDetailsModal` gained
`{ ssr:false }`. The bulk-delete modal is gated behind a `bulkDeleteModalMounted`
flag (deferred to first delete, then kept mounted so its open/close animation stays
intact). Est. **~8–12 KB gzip** off the 21.2 KB entry chunk, all behind deliberate
user actions → no UX change.

**Verification:** type-check clean for all touched files; projects-page +
LiveProjectCard suites pass (the lone failure was the pre-existing concurrent
liquid-glass test). The earlier "full `next build` blocked by concurrent refactor"
note is historical and superseded by `LOOP_LEDGER.md` + `03_METRICS.md`, which record
a later successful build and local production-start Lighthouse proof.

## Also shipped (render + micro-wins)

### RENDER — group-mode memo gap FIXED (O(N) → O(1))
In group-organize mode, every owned card used to re-render on any parent state change
because `groupAssignMenu={renderProjectGroupMenu(item)}` passed a fresh ReactNode,
defeating `memo`. **Fixed:** extracted a module-level memoized `ProjectCardRow` that
receives the menu's *primitive* inputs (`effectiveGroupId`, `groupBusy`, `projectGroups`,
showGroupMenu) + stable callbacks (`assignProjectToGroup` now wrapped in
`useStableCallback`) and builds the `<DropdownMenu>` via `useMemo` **below** the memo
boundary. Now only the card whose effective-group/busy state changed re-renders. The
LD-10 override-aware checkmark + `aria-busy` are preserved (passed as derived props).
Verified: type-check clean + projects-page group-mode/card-layout/organize tests pass.

### Micro-wins
- **`Roboto_Mono` now `display:"swap"`** (`layout.tsx`) — removes a FOIT window.
- **List-view rows gained `content-visibility:auto`** (`contain-intrinsic-size: auto 52px`)
  so off-screen list rows skip layout/paint too (off-screen borders aren't visible).

## Confirmed already-optimal (no action — closing the adversarial loop)
- **Phosphor icons** tree-shaken via `optimizePackageImports`; no date-lib/barrel bloat.
- **Server waves** parallel + `cache()` (proven: 208ms vs 300ms serial). RSC data
  **correctly not** cached with `revalidate`/`unstable_cache` (per-user auth data).
- **Server/Client split** of the 1500-line client isn't worth it — ~95% is genuinely
  interactive; the hydration win came from code-splitting the modal subtrees instead.
- **Prefetch-on-hover** is fine; warming TanStack queries would prefetch the wrong
  route's data.
- **content-visibility** sized correctly per view mode; no forced reflow.
- Heavy deps (`@firecms/neat`, lenis) are landing-only, not on this route.

## Lower-value follow-ups — RESOLVED 2026-06-19 (verify-then-finish loop)
- Sidebar favorites `staleTime: 0` → **DONE**: now `30_000` in
  `src/hooks/use-sidebar-favorites-query.ts:37` (the toggle's `invalidateQueries`
  keeps favorite/unfavorite instant; cross-tab reflection reconciles within ≤30s).
- Add `traced()` spans to the 3 query waves → **DONE**:
  `workspace-repository.ts:893/991/1072`, gated by `PERF_TRACE=1`, no-op otherwise.
  Maker/checker (correctness + security + performance) all clean.
- Patch `e2e/route-transition-performance.spec.ts` → **DONE**: a guarded `beforeEach`
  now injects the `archestimator-dev-auth-bypass` cookie so the authed
  `workshop → projects` scenario stops redirecting to `/login`. Live CI run is
  `manual-proof-pending` (needs a dev server + the real 32+char secret).
- First-row image `priority`/`fetchpriority` → **N/A**: the LCP element is text, not an
  image (`03_METRICS.md` §4/§7); forcing priority would risk deprioritizing the real
  LCP element.
- `select('*')` client-payload trim → **DEFERRED**: the list query already uses the
  explicit `WORKSHOP_PROJECT_LIST_COLUMNS` and strips `workspace_id`/`created_by`
  client-side (`toClientProjectRow`); the remaining columns' client usage is
  inconclusive and the payload win (~20–40 B) is below the drop-risk. Owner can revisit
  with a narrowed client type if payload ever matters.
- (`Roboto_Mono` `display:"swap"` and list-view `content-visibility` were stale
  duplicates of the "Also shipped" section above — already shipped; removed here.)

## Resolved / remaining

- **Production-representative authed Lighthouse — resolved locally.** `03_METRICS.md`
  section 7 captured a real Supabase session against `next build` -> `next start`.
  This is local production-build proof, not hosted Vercel proof.
- **Slow-3G remains uncaptured.** Measure it only if the next implementation lever
  depends on throttled proof.
