# 08 — Solutions & Optimizations (Improvement Plan)

**What this is:** A prioritized, phased plan to take the Templates feature from "browse-only and partially broken" to a robust top feature. Decisions and boundaries only — no implementation code. File paths are repo-relative; each unit carries blast radius and test scenarios so an implementer can start confidently. U-IDs are stable.

**Sequencing principle:** stop the bleeding (P0/P1 live defects) → complete the core capability → harden security → optimize performance → fix data coherence → polish UX → close the test gaps. Provider-gated steps (migration apply) are isolated so local work never blocks on them.

**Owner decisions required (provider-gated, surfaced — not assumed):**
- **D-A — Apply `estimate_tabs` migration to live?** Applying `supabase/migrations/20260612094734_estimate_tabs_foundation.sql` (+ regen `src/lib/supabase/types.ts`) flips many coupled surfaces (AI read-context, publication snapshots, node-route, export) from the legacy fallback to real tabs. High value, high blast radius ([06](06_BLAST_RADIUS_ANALYSIS.md)). **Recommendation:** ship U1(a) fallback first (no apply needed), then schedule the apply with the full regression set.
- **D-B — Build vs cut the project-source insert path (U2).** The feature's headline is non-functional ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-2). Either build it (U2) or explicitly scope project sources to "browse + save-as-template only" and remove the dead UI/drag seams. **Recommendation:** build it — it's the point of the feature. (Scope: the in-estimate panel only — see D-C.)
- **D-C — DECIDED (2026-06-13):** project-derived sources appear **only** in the in-estimate Templates panel; the templates **library** route (`/workshop/library/templates`) shows **custom templates only (+ future supplier templates)**. Implemented by removal in **U3**. This is settled, not open.

---

## Phase 0 — Stabilize live defects (P0/P1)

### U1. Make the reusable-source outline path survive the missing `estimate_tabs` schema
**Goal:** Eliminate the live 500 ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-1) so browsing a project source's outline works in prod regardless of whether `estimate_tabs` is applied.
**Requirements:** DEF-1, DB-1, UX-6.
**Dependencies:** none (U1a is fully local).
**Files:** `src/lib/repositories/workspace-repository.ts` (`getEstimateTabs:1691`, `getDefaultEstimateTab:1717`, `getEstimateTabTree:1731`); optionally a new `getEstimateTabsLegacy`/`getEstimateTabTreeLegacy` mirroring `getProjectEstimateTreeByEstimateLegacy`.
**Approach:**
- (a) Wrap the `estimate_tabs` reads in `getEstimateTabs`/`getDefaultEstimateTab`/`getEstimateTabTree` so that when `isEstimateTabsSchemaMissing(error)` is true (`:1588`) they fall back to a synthetic single-"Main"-tab derived from the existing estimate tree — exactly the pattern the sibling loaders use (`:1824, :1846, :1866, :1917`). Net: the reusable path returns a valid single-tab outline instead of throwing.
- (b) **Decision D-A** — if/when the owner authorizes the apply, the fallback becomes dormant and the `asEstimateTabsReadClient` casts can later be removed (`:1573-1577`).
**Blast radius:** contained to `workspace-repository.ts`; `getEstimateTabTree` is also used by export and node-route, but adding a *fallback* only changes behaviour in the already-broken missing-schema case ([06](06_BLAST_RADIUS_ANALYSIS.md)).
**Test scenarios:** outline action returns a single "Main" tab when `estimate_tabs` is absent (mock the missing-relation error); returns real tabs when present; `getEstimateTabs` no longer throws on `42P01`; export single-tab path unchanged. Add an **integration test that exercises the unmocked outline path** against a migration-applied ephemeral DB (closes the DEF-6 blind spot).
**Verification:** in the live app, expanding a project source's estimate shows tabs/groups instead of the error banner; `bun run test:dom` green.
**Execution note:** characterization-first — add a failing test reproducing the throw before adding the fallback.

### U1b. Centralized, user-safe error handling via the existing toast system
**Goal:** Never leak `{code, details, hint, message}` to users (UX-6 / the live *"Couldn't load estimate outline. {code…}"* bug), and stop transient errors from **shifting the layout** — route them through the app's existing toast instead of inline banners.
**Requirements:** UX-6, DEF-1; owner request (proper error handler + non-layout-shifting toasts).
**Reuse, don't build:** the app already ships a first-party toast — `useToast()` / `ToastProvider` in `src/components/ui/toast.tsx` (mounted in `app/providers.tsx`; already used by `EstimateTabStrip.tsx:85` and `EstimateSheetTree.tsx:233`). The Templates panel is the outlier still using inline banners.
**Files:** `src/components/workshop/component-library/index.tsx` — the 5 raw-`error.message` sites (`:808, :982, :1747, :1776`) and the inline error banners (`:1075, :1094, :1110, :1128`); plus the mutation-error fallbacks in `TemplateGallery.tsx`/`TemplatesBrowseManager.tsx` (`:769` etc.).
**Approach:** add a single `toUserError(scope)` mapper (scopes: project-sources / estimates / outline / search / mutation) returning a fixed safe string; at every catch, surface only that string via **`toast.error(message)`** (the existing hook) — **not** an inline banner; **never** interpolate `error.code/details/hint/message`; log the raw error server-side only. Remove the layout-shifting inline error banners; keep one `role="status"` live region for a11y. (Pairs with U23 — together they stop the panel from jumping on load/error.)
**Test scenarios:** a forced outline/source/search failure → a toast with the safe copy (no `{code…}` substring), **no inline banner, no layout shift**; raw error absent from the DOM; success path unaffected.
**Verification:** trigger each failure mode → toast appears, layout stable, DOM has no DB-error shape.

---

## Phase 1 — Complete the core capability

### U2. Build the project-source → estimate insert path
**Goal:** Make "insert a project tab / group / area into the current estimate" actually work ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-2). **Gated by D-B.**
**Requirements:** DEF-2, DATA-4/5, SEC-1.
**Dependencies:** U4 (the RPC must use the hardened `can_edit` gate); benefits from D-A (real tabs).
**Files:** new migration `supabase/migrations/<ts>_insert_estimate_subtree_rpc.sql` (RPC `insert_estimate_subtree_into_estimate_with_history`); `src/lib/reusable-sources/actions.ts` (new `insertProjectSourceIntoEstimate`); `src/components/workshop/component-library/index.tsx` (supply `onInsertProjectSource`); a tree drop handler that consumes `readProjectSourceDragPayload`; `src/lib/supabase/types.ts` (regen).
**Approach:** SECURITY DEFINER RPC that checks **in order**: source `can_access_estimate` → target `can_edit_estimate` → same workspace → target parent is a group → post-copy `validate_estimate_node_tree`; stamps provenance metadata; emits a `project_source_inserted` event. The action must **re-read the source server-side by id** (never trust the cached preview — DATA-4). Wire `onInsertProjectSource` and a drop handler so the existing drag payload and menu item become live. Respect the DB trigger that forces inserted subtrees to inherit the parent's tab ([06](06_BLAST_RADIUS_ANALYSIS.md)).
**Blast radius:** additive (new symbols); must NOT disturb the template RPC shared with AI package-builder (`ai/package-builder/apply.ts:1061`).
**Test scenarios:** whole-tab insert = all root groups, order preserved; insert into an area target triggers wrap-group; **denial 4** (viewer-on-target → error, nothing written, no event); **denial 5** (unreadable source → error); **denial 6** (cross-workspace → error); **denial 7** (source deleted between browse and insert → typed error); stale-preview vs re-read-at-insert; bulk mixed selection partial-failure reported per unit.
**Verification:** drag/click a project source into a group → subtree appears; RLS harness proves denials 4–7; `project_source_inserted` event recorded.

### U3. Remove project-derived sources from the templates library route
**Goal:** Per **D-C** (owner decision, 2026-06-13), project-derived sources appear **only** in the in-estimate Templates panel — never in the standalone templates library (`/workshop/library/templates`). The library route shows **only template-class sources**: custom user templates now, supplier templates later. This resolves DEF-3 / UX-1 / UX-2 by **removal** rather than by making inert sources interactive.
**Requirements:** D-C, DEF-3, UX-1, UX-2.
**Dependencies:** **none** — independent of D-A/D-B; pure removal on the library route. Does **not** touch the in-estimate panel (projects stay there) and does **not** fix the in-estimate outline 500 (U1 is still required for the panel). Low-risk; can ship as early as Phase 0/1.
**Files (mostly deletion):**
- `src/app/workshop/library/templates/page.tsx` — drop the `listReusableProjectSources()` import + fetch (`:3, :13-16`); pass only `templates` (`:18`).
- `templates-browse/TemplatesBrowsePageClient.tsx` — drop the `projectSources` prop (`:50, :53-54`).
- `templates-browse/TemplatesBrowseManager.tsx` — remove the reusable-source imports (`:43-56`), the `...buildProjectSourceBrowseTreeNodes(projectSources)` merge in `buildBrowseTreeNodes` (`:95, :130`), the `projectSources` prop + lazy handlers (`:157, :165-166, :183, :191-192`), the unloaded-node memos (`:219-224`), the `handleRowClick` project branches (`:279-283`), the now-dead `project-section`/`project-source` context-menu & drag guards (`:343, :463`), the project-source state + lazy loaders (`:581, :589, :602-704`), and simplify the empty-state to `templates.length === 0` (`:502`); pass nothing project-related to the tree panel (`:894, :902-903`).
- `templates-browse/project-source-browse-tree.tsx` — **delete** (only `TemplatesBrowseManager` imports it).
**Approach:** the library tree's source model becomes template-class only. Keep the section-header pattern so a future **"Suppliers"** section slots in beside "Custom Templates". Remove the reusable-source lazy-load plumbing from this route only — the in-estimate panel keeps its own copy (`tree/TemplatesTree.tsx`).
**Blast radius:** LOW — `project-source-browse-tree.tsx` has a single importer; the in-estimate panel is untouched ([06](06_BLAST_RADIUS_ANALYSIS.md)). Net deletion also removes the library route's `listReusableProjectSources()` query at load.
**Test scenarios:** library route renders only custom templates (no "Projects" section); empty state when zero templates; in-estimate panel still shows projects (regression); update/remove `tests/vitest/template-browse-project-sources.test.tsx` **and `tests/vitest/template-gallery.test.tsx:169-170`** (both pass the now-removed `projectSources` prop — [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U3-1) while keeping the in-estimate project-source tests intact.
**Verification:** live `/workshop/library/templates` shows no Projects section, only Custom Templates; in-estimate panel unchanged.

---

## Phase 2 — Harden security

### U4. Harden the insert RPC to require `can_edit_estimate` + app-layer assertion
**Goal:** Close the privilege gap ([05](05_DATABASE_RLS_SECURITY_AUDIT.md) SEC-1/SEC-2; DEF-4).
**Requirements:** SEC-1, SEC-2.
**Files:** the live `insert_estimate_template_into_estimate_with_history` (port `assert_can_edit_estimate_for_history` from `20260612094734:1002,180-206` into a standalone migration so it lands independent of the full tabs apply); `src/lib/estimates/actions.ts` (`insertEstimateTemplateIntoEstimate:2157`, `wrapEstimateAreaAndInsertTemplate:2389`) — add `assertCanEditEstimate(supabase, estimateId)`.
**Blast radius:** 3 RPC call sites incl. AI package-builder; 2 tests in `tests/vitest/estimate-node-reorder-action.test.ts`; `types.ts`.
**Test scenarios:** member-viewer on a restricted estimate is denied insert (RPC + action); editor allowed; AI package-builder apply still works.
**Verification:** RLS harness denial scenario; package-builder regression green.
**Execution note:** can ship **independent of** the tabs apply — it's the highest-value security fix.

---

## Phase 3 — Performance

### U5. Server-side reusable-source search
**Goal:** Kill the per-keystroke workspace-wide tree fan-out ([03](03_PERFORMANCE_AUDIT.md) PERF-1/DATA-6).
**Files:** `src/lib/reusable-sources/actions.ts:94` (`searchReusableProjectSources`); new SQL/RPC over `estimates`/`estimate_nodes`/`estimate_tabs` name columns; consider a trigram index.
**Approach:** push matching into one indexed query returning matched ids/labels; never materialize trees for search; keep client debounce.
**Blast radius:** single caller (`index.tsx:977`).
**Test scenarios:** search returns expected matches; query count is O(1) round-trips, not O(projects×tabs); pending-invite projects excluded.
**Verification:** measured query count drops to a small constant; `reusable-sources-actions.test.ts` updated.

### U6. Cache project-source outlines so re-expand is instant (no spinner)
**Goal:** Stop refetch-on-re-expand (PERF-3) — the direct cause of the "Loading…" state on every project-node expand. **Post-D-C this lives only in the in-estimate panel** (the library-route copy is deleted by U3).
**Files:** `src/components/workshop/component-library/index.tsx` (the lazy loaders at `:1735`/`:1769` + their local merge state); adopt a `["reusable-sources", projectId|estimateId]` TanStack key (`staleTime 60s`, mutation-invalidated).
**Approach:** key each lazy level by id; on re-expand serve from cache (0 round-trips, 0 spinner); invalidate on estimate mutation. Foundation for U23's no-spinner UX.
**Test scenarios:** collapse + re-expand within the window → 0 refetch, 0 loading state; mutation invalidates.
**Verification:** network shows one outline fetch per estimate per window; re-expand is instant.

### U7. Bound the project list + thread editor load limits
**Goal:** Remove unbounded reads (PERF-2/PERF-4).
**Files:** `workspace-repository.ts:707-711` (`listCurrentWorkspaceProjects` — add limit/pagination), `component-library-repository.ts:716-750` (lazy node/row detail), editor route `app/.../estimates/[nodeId]/page.tsx:35` + `fetchEstimateTabTree` (`estimates/actions.ts:1138`) to pass `maxNodeCount`/`maxRowItemCount`.
**Approach:** paginate the project list; surface `loadLimitState` in the editor (plumbing exists in `getEstimateTabTree`). Watch "expand all" / `getTemplatesTreeAllNodeIds` which assumes the full list ([06](06_BLAST_RADIUS_ANALYSIS.md)).
**Test scenarios:** large-workspace fixture loads a bounded page; >3000-row tab surfaces a limit state instead of unbounded render.
**Verification:** payload size bounded; perf suites green.

### U8. Scope insert-RPC validation to the subtree/tab (PERF-6)
**Goal:** Avoid O(estimate) re-validation + tab-wide lock on every small insert.
**Files:** the template/subtree insert RPC migrations (`validate_estimate_node_tree`).
**Approach:** validate only the inserted subtree / target tab where correctness allows; keep the set-based copy.
**Test scenarios:** insert into a large estimate validates in bounded time; tree-integrity assertions still hold.
**Verification:** benchmark insert latency on a large fixture.

### U9. Add `estimate_id` to the outline row predicate (PERF-7)
**Goal:** Hit the composite index leading column.
**Files:** `workspace-repository.ts:1779-1784` — add `.eq("estimate_id", estimate.id)` alongside `.in("node_id", nodeIds)`.
**Verification:** EXPLAIN shows the composite index used. **manual-proof-pending** (needs EXPLAIN).

---

## Phase 4 — Data coherence

### U10. Sync the in-estimate `templateList` to its prop
**Goal:** Fix the stale-templates bug (DATA-1).
**Files:** `src/components/workshop/component-library/index.tsx:704`.
**Approach:** add a render-time source-value reconciliation (the pattern used in `TemplatesBrowseManager`/`use-template-editor`) that absorbs prop updates while preserving local optimistic appends.
**Test scenarios:** rename/delete/create a template elsewhere → the open estimate panel reflects it without remount; optimistic appends survive a prop refresh.
**Verification:** two-surface coherence test.

### U11. Broaden template-mutation invalidation
**Goal:** Fix cross-surface staleness (DATA-2/DATA-3).
**Files:** `src/lib/component-library/actions.ts` (browse CRUD + save-from-estimate), `template-editor-actions.ts`.
**Approach:** a shared `revalidateTemplateSurfaces()` (browse + editor + overview) and route save-from-estimate through `onLibraryDataChanged` → `invalidateQueries(["workspace-component-library"])`.
**Test scenarios:** save-as-template from estimate A → estimate B's panel and the editor dock see it after invalidation; overview counts update.
**Verification:** invalidation fires on each mutation path.

---

## Phase 3b — Perceived performance: the in-estimate panel cold load (3rd pass)

Root-causes the live 3–6s skeleton ([03](03_PERFORMANCE_AUDIT.md) PERF-9/PERF-10). U18/U19 are the **biggest user-facing perf win** and low-risk (single-caller).

### U18. Lite in-estimate library loader
**Goal:** Stop the panel over-fetching the 6-table cost-library detail graph it never uses (PERF-9).
**Files:** `src/lib/repositories/component-library-repository.ts` (`getCurrentWorkspaceComponentLibrary:522-616`); consumer `EstimateSheetContent.tsx:722`.
**Approach:** add a **lite** loader variant for the in-estimate surface — items (slim columns) + suppliers/brands/categories + templates only; **skip** price options/versions/price history/state history/variant costs/attachments (`:573-616`). Keep the full loader for the Library management route.
**Blast radius:** LOW — single consumer; Library route keeps the full loader.
**Test scenarios:** panel renders identical `EstimateRowItem[]` from the lite loader; query count drops from ~12 to a small constant; Library route unaffected.
**Verification:** measured round-trip count + panel-interactive time (the §4 metric in [10](10_STRATEGY_AND_SUCCESS_METRICS.md)).

### U19. Prefetch + cache-tune the workspace library
**Goal:** Warm the cache so the skeleton disappears on the common path (PERF-9).
**Files:** estimate-row hover config (`ProjectEstimatesTable.tsx:653` / `use-prefetch-on-hover.ts`), `providers.tsx:14-26`.
**Approach:** `prefetchQuery(["workspace-component-library"], …)` on estimate-row hover / workshop entry; give the key a longer `gcTime`/`staleTime` (workspace-global, mutation-invalidated) so navigate-away-and-back doesn't re-run the waterfall.
**Test scenarios:** hover → query warms; revisit within window → 0 refetch.
**Verification:** network shows the panel hydrating from cache on the common path.

### U20. (Optional) Stream the library via RSC/Suspense
**Goal:** Start the (lite) library fetch at request time, overlapping the route's work, instead of after hydration (PERF-9).
**Files:** `app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:31-37`, `EstimateSheetContent.tsx:1856-1881`.
**Approach:** move the lite library load into a streamed server component / `<Suspense>` boundary around the sidebar. Pairs with U18.
**Verification:** library fetch begins server-side in parallel with the tree, not post-hydration.

### U21. Collapse the node-route tabs waterfall
**Goal:** Remove the duplicate `getCurrentWorkspaceProject` + estimate lookup serialized after the route resolve (PERF-10).
**Files:** `app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:34-62`, `workspace-repository.ts:1691-1715`.
**Approach:** return tabs from `resolveEstimateTabRouteContext` (it already resolves the same project+estimate), or fold the tabs query into the same `Promise.all`.
**Verification:** one fewer serial round-trip per estimate page load.

### U22. Supplier-templates data-model spike (sequence BEFORE U2/U4)
**Goal:** Decide the supplier-templates model before the insert RPC bakes in a workspace-equality assumption ([10](10_STRATEGY_AND_SUCCESS_METRICS.md) §2b / S-1/S-2/S-3).
**Scope (decisions, no code):** owning-scope (global vs licensed-per-workspace); RLS read (global/licensed) + write (admin-only) split; the RPC cross-workspace-copy exception; price-provenance/freshness policy; workspace-scoping the `["workspace-component-library"]` cache key.
**Why before U2/U4:** the insert RPC (U2) and the gate (U4) currently assume `source_workspace_id = target_workspace_id`; a global supplier catalogue breaks that — decide the model first so U2/U4 aren't reworked.
**Verification:** a decision doc; no code.

### U23. No-spinner project-source exploration (prefetch + skeleton-in-place + optimistic) + toast feedback
**Goal:** When a user expands project tree nodes while exploring multiple projects, **never show a loading screen or spinner**, and **never shift the layout** — make exploration feel instant. (Owner request: "proper loading UX… optimize so we don't have to use a loading screen or loading spinner" + "toasts so it doesn't shift the layout".)
**Store-vs-DB — the root cause (owner question answered):** today project sources are fetched **directly from the database via server actions** (`listReusableProjectSources` / `listReusableProjectEstimateSources` / `getReusableEstimateOutline`) into **local React state — there is NO client cache/store and no loaded-id tracking**. (Only the component-library dataset is TanStack-cached; the project-source lazy loads are bare server-action promises.) So every expand re-hits the DB and shows "Loading…". That is what makes the spinner appear.
**Files:** `src/components/workshop/component-library/index.tsx` (lazy loaders + tree render), `tree/TemplatesTree.tsx`, `src/hooks/use-prefetch-on-hover.ts`, `src/components/ui/toast.tsx` (reuse).
**Approach (layered, no spinner):**
1. **Cache** (U6) — keyed TanStack cache so re-expanded levels are instant.
2. **Prefetch on hover/focus** — when a project (or estimate) row is hovered/focused, prefetch its next level (estimates → outline) via the same query key, so by the time the user expands, the data is already resident → no loading state on the common path (mirrors the route-prefetch at `ProjectEstimatesTable.tsx:653`).
3. **Optimistic disclosure** — expand the node immediately; if data isn't yet resident, render **skeleton rows in place** sized to the expected child count (not a spinner, not a centered loading screen) → **zero layout shift** when real rows arrive.
4. **150ms gate** — never flash a skeleton if data resolves <150ms (warm/prefetched path shows nothing transient).
5. **Errors → toast** (U1b) — never an inline banner that pushes the tree down.
**Blast radius:** LOW — in-estimate panel only; the library route no longer has project sources (D-C).
**Test scenarios:** hovering a project row prefetches its estimates (network); expanding a prefetched/cached node shows children with **no loading indicator**; a cold expand shows in-place skeleton rows (no spinner, no layout shift) that swap to content; an outline failure raises a **toast**, not an inline banner, and the tree doesn't move.
**Verification:** observe an expand on the common (prefetched/cached) path → instant, spinner-free, layout-stable; cold path → skeleton-in-place only.

---

## Phase 5 — UX & design-system polish

### U12–U15 (from [02](02_UX_UI_AUDIT.md); full build spec in [17](17_FRONTEND_BUILD_SPEC.md))
- **U12** — keyboard reorder + a11y drop announcements in the editor structure tree (UX-4/UX-5): add "Move up/down"/"Move to group…" calling `onMoveNode`; add a polite live region. Files: `template-editor/TemplateStructureTree.tsx`, `ui/tree.tsx`.
- **U13** — design-system fixes (UX DS table): replace the off-palette `tone="info"` badge with a neutral chip (or define an approved `info` token), use `bg-surfaceMuted` for the preview well, swap Unicode `⋯`/`×` for Phosphor `DotsThree`/`X`. Files: `component-library/index.tsx:416,437`, `ui/badge.tsx`, `TemplateGallery.tsx:138`, `TemplatePreviewDock.tsx:111`.
- **U14** — cleanups (UX-7/8/9/10): drop the misleading `CaretDown` on Insert buttons; reuse `formatCount` in `NewTemplateModal.tsx:177`; delete dead `buildTemplateNavigationTree`/`getTemplatesForTreeNode` (`templates.ts:184,205`); relabel modal "Group" → "Category".
- **U15** — insert-picker pre-validation (UX-11): surface group availability on estimate selection (`InsertIntoEstimatePicker.tsx:103`).

**Test scenarios (Phase 5):** keyboard reorder moves a node and announces it; `impeccable detect --strict` (`bun run lint:design-system`) passes; modal shows singular/plural correctly; no dead exports remain.

---

## Phase 6 — Test, verification & tooling

### U16. Close the test gaps ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-6)
**Files:** new `tests/vitest/project-source-insert-action.test.ts`, `tests/vitest/reusable-outline-denial.test.ts`; extend `scripts/prove-estimate-tabs-postgres.mjs` for denials 4–7; un-skip and complete `e2e/estimate-tabs.spec.ts` scenarios; an integration test for the unmocked outline path (pairs with U1).
**Test scenarios:** denials 1–8 each have a test; the outline path is exercised without mocking the DB; e2e covers create/rename/duplicate/reorder, drag template, drag project source, multi-tab export.
**Verification:** `bun run validate` + `node scripts/prove-estimate-tabs-postgres.mjs` green; e2e run un-skipped at least once with seeded fixtures.

### U17. Re-index the code-intelligence graph
**Goal:** Fix the stale `code-review-graph` so CLAUDE.md's "run impact analysis before editing" rule is meaningful for this feature ([06](06_BLAST_RADIUS_ANALYSIS.md)).
**Approach:** `npx gitnexus analyze` / `build_or_update_graph`; confirm `reusable-sources/` and `getEstimateTabTree` resolve.
**Verification:** `get_impact_radius` returns non-empty for `getReusableEstimateOutline`.

---

## Recommended first slice (safest, highest value)

**U1 (a) + U1b + U4.** Together they (1) fix the live 500 with a fully-local change, (2) stop leaking raw errors, and (3) close the security privilege gap — all without a provider apply and without depending on the unbuilt insert path. Then decide D-A (apply tabs) and D-B (build U2) deliberately, with U16 + U17 underpinning the work. **Before building any unit, read [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md)'s must-fix list** — it corrects real design bugs in U1/U2/U4 (incl. a P0 in U2's source-read authorization and a P0-test in U4's reorder mocks). For UX/visual units, [17](17_FRONTEND_BUILD_SPEC.md) is the build spec. **U18/U19** (the 3–6s skeleton fix) are also high-value and independent — fold them in early.

## Prioritized backlog

| Priority | Units | Theme |
|---|---|---|
| P0/P1 now | U1, U1b, U4 | stop the bleeding + security (**read [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) first**) |
| P1 user-facing | U18, U19, U6, U23 | no-spinner UX: kill the 3–6s skeleton + instant project-source exploration (lite loader + cache + prefetch + skeleton-in-place + toasts) |
| P1 next | U2 (gated by D-B); U3 (D-C — independent, low-risk) | complete capability / scope library route |
| before U2/U4 | U22 | supplier-templates data-model spike |
| P2 | U5, U7, U10, U11, U20, U21 | performance + coherence |
| P2/P3 | U8, U9, U12–U15 | optimization + polish ([17](17_FRONTEND_BUILD_SPEC.md)) |
| always | U16, U17 | tests + tooling |

## Evidence used

All findings trace to [02](02_UX_UI_AUDIT.md)–[07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md). Key files as cited per unit.

## Truth & integrity

- **VERIFIED:** every unit targets a finding backed by code/live evidence in docs 02–07; no unit assumes a capability that exists.
- **ASSUMPTION / decision-gated:** D-A (apply) and D-B (build insert) are owner calls; U8/U9 benefits are **manual-proof-pending** on benchmarks/EXPLAIN; this plan defines decisions and tests, not implementation code (per the no-code constraint).
