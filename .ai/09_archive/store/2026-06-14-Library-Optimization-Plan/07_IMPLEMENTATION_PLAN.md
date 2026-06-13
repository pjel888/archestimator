# Workshop Library Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Run `gitnexus_impact` / `get_impact_radius` before editing any shared symbol** (per `CLAUDE.md`) — the navigation store and `ensureDefaultWorkspace` are HIGH-blast-radius.

**Goal:** Make `/workshop/library` feel like a SPA — instant tab switches, no full-screen blur on in-app navigation or mutations, skeletons that match content and appear only on genuine cold loads — then close the DB scaling cliff and the security gaps, each proven by a measured delta.

**Architecture:** Three moves, in order of felt-impact. (P0a) Convert the navigation overlay from "always-blur-with-250ms-floor" to "show-only-if-nav-exceeds-a-delay", stop it firing on `router.refresh()`, and reshape the Overview skeleton. (P0b) Make the Library tab architecture actually capable of no-skeleton warm revisits: either route pages return an immediate client shell that reads a warmed Query cache, or the Library becomes client-panel tabs with URL sync. Do not claim `initialData` alone solves route-level `loading.tsx`; it cannot if the server route still awaits the data before mounting the client. (P1) Remove the editor double-fetch, `cache()`-wrap workspace resolution, make insert-into-estimate optimistic, replace native dialogs. (P2) Replace the 11-query overview and 4-hop components waterfall with two aggregation RPCs, add the missing index, cache the taxonomy, paginate, apply RLS initplan caching — all gated on the PG17 prove-harness. (P3) Close the viewer-write authZ gaps across templates and component child tables, add app-layer mutation guards, add `/workshop` security headers, rate-limit creation, sanitize action errors, wire tab a11y.

**Tech Stack:** Next.js App Router, Bun, Supabase/Postgres, TanStack Query, Zustand, Vitest + Playwright. Node via nvm v25.8.0.

**Sequencing rule:** P0 is felt-impact (do first). P2 DB changes are **gated** on `08 Q4` + the prove-harness (`06 §G`). P3 RLS/headers carry the highest blast radius — ship behind Report-Only first.

---

## Pre-flight (do once, before any task)

- [ ] **Capture baseline** per `06 §A–F`. Write `BASELINE.md` into this plan dir with: skeleton-flash count, overlay count, tab-switch ms (cold + warm revisit), Overview CLS, Supabase round-trips for Overview & Components, RSC payload bytes per tab. **No fix may be marked done without an `AFTER` number to compare.**
- [ ] **Close the `09` readiness gates** before editing product code. In particular: record the P0b architecture choice in `BASELINE.md` (route client shells vs client-panel tabs, exact query keys, loader ownership, invalidation surface), prove the folder-seeding strategy cannot discard customized folder state, define the viewer/editor principal fixtures, and write the rollback/checkpoint plan for each phase.
- [ ] **Create the adversarial matrix from `06 §I`** in `BASELINE.md`. Every implementation task must append its row-level outcome to the corresponding `AFTER_Pn.md`; unit tests alone are supporting evidence, not done evidence.
- [ ] Confirm dev server is reachable (user's Chrome session; dev-auth bypass disabled — project memory).
- [ ] `nvm use 25.8.0` for all `bun`/`vitest`/`tsc`/`playwright` commands.
- [ ] Capture dirty-worktree evidence and keep unrelated changes out of scope. Current branch already has unrelated `.ai` and adapter changes; do not stage, rewrite, or normalize them while implementing Library work.

---

# P0 — Kill the loading-screen feel

Split P0 into two gates:

- **P0a safe fixes:** overlay timing/refresh behavior and Overview skeleton shape. No route restructure.
- **P0b SPA-feel architecture:** no route-level skeleton on warm revisits. This requires a proof-backed architecture choice; `initialData` is useful only after the client manager mounts.

## Task 1: Overlay shows only on slow navigations; never on refresh

**Why:** F1/F2/F7 — the global blur fires immediately on every internal `<a>` click and every `router.refresh()`, held ≥250 ms. Convert to a "delay-before-show" model so prefetched/cached tab switches (which complete in <150 ms) never blur, and remove the refresh trigger entirely. **Do NOT add a `suppressOverlay` flag (removed as flawed, obs 4623).**

**Files:**
- Modify: `src/stores/navigation-ui-store.ts`
- Modify: `src/hooks/use-navigation-router.ts:26-29`
- Test: `tests/vitest/navigation-ui-store.test.ts` (create)

- [ ] **Step 1: Write the failing test** — `tests/vitest/navigation-ui-store.test.ts`. Include the quick/slow cases below plus race cases: overlapping tab clicks, slow nav followed by fast nav, popstate, bfcache restore, and timer cleanup. The store needs a navigation token or target match so `hide()` from an older navigation cannot cancel a newer slow navigation.

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

afterEach(() => {
  vi.useRealTimers();
  useNavigationUiStore.getState().bfcacheRestore(); // reset
});

describe("navigation-ui-store delay-before-show", () => {
  it("does NOT show the overlay if navigation completes before the show delay", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/workshop/library/components");
    // navigation completes quickly (pathname effect calls hide before 150ms)
    vi.advanceTimersByTime(100);
    s.hide();
    vi.advanceTimersByTime(500);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
  });

  it("DOES show the overlay if navigation exceeds the show delay", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/somewhere/slow");
    vi.advanceTimersByTime(200); // past SHOW_DELAY_MS
    expect(useNavigationUiStore.getState().isNavigating).toBe(true);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (overlay shows immediately today, so test 1 fails).

```bash
nvm use 25.8.0 && bunx vitest run tests/vitest/navigation-ui-store.test.ts
```
Expected: test 1 FAILS (`isNavigating` is true after the quick nav because `show` sets it immediately).

- [ ] **Step 3: Implement delay-before-show** in `src/stores/navigation-ui-store.ts`. Replace the immediate `set({ isNavigating: true })` in `show` with a deferred timer; keep a short min-visible once shown to avoid flicker:

```ts
const SHOW_DELAY_MS = 150;   // only blur if nav takes longer than this
const MIN_VISIBLE_MS = 250;  // once shown, keep it at least this long
const SAFETY_TIMEOUT_MS = 10_000;

let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
let shownAt = 0;
let activeNavId = 0;

function clearTimers() {
  for (const t of [showTimer, hideTimer, safetyTimer]) if (t) clearTimeout(t);
  showTimer = hideTimer = safetyTimer = null;
}

export const useNavigationUiStore = create<NavigationUiState>((set, get) => ({
  isNavigating: false,
  startTime: 0,
  targetHref: null,
  show: (targetHref = null) => {
    const navId = activeNavId + 1;
    activeNavId = navId;
    clearTimers();
    set({ targetHref, startTime: Date.now() });
    showTimer = setTimeout(() => {
      if (activeNavId !== navId) return;
      showTimer = null;
      shownAt = Date.now();
      set({ isNavigating: true });
      safetyTimer = setTimeout(() => {
        if (activeNavId === navId) set({ isNavigating: false, targetHref: null });
      }, SAFETY_TIMEOUT_MS);
    }, SHOW_DELAY_MS);
    return navId;
  },
  hide: (completedHref = null, navId = null) => {
    const state = get();
    if (navId !== null && navId !== activeNavId) return;
    if (completedHref && state.targetHref && completedHref !== state.targetHref) return;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; } // never shown → no flash
    if (!get().isNavigating) { clearTimers(); set({ isNavigating: false, targetHref: null }); return; }
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
    hideTimer = setTimeout(() => {
      if (navId === null || navId === activeNavId) {
        clearTimers();
        set({ isNavigating: false, targetHref: null });
      }
    }, remaining);
  },
  bfcacheRestore: () => { activeNavId += 1; clearTimers(); set({ isNavigating: false, startTime: 0, targetHref: null }); },
}));
```

Update the store type for the new return value / `hide` arguments. The pathname/listener integration must pass a completion target or navigation id into `hide`; otherwise an older completion can still clear a newer slow navigation.

- [ ] **Step 4: Stop the overlay firing on `router.refresh()`** in `src/hooks/use-navigation-router.ts:26-29` — drop the `show("refresh")` call so mutation refetches never blur:

```ts
    refresh: () => {
      return router.refresh(); // no overlay: mutations are optimistic; refetch is silent
    },
```

- [ ] **Step 5: Run tests — expect PASS.**

```bash
nvm use 25.8.0 && bunx vitest run tests/vitest/navigation-ui-store.test.ts
```
Expected: both PASS.

- [ ] **Step 6: Manual check** — run the standard session (`06 §B`). Tab switches should no longer blur (prefetched, <150 ms). Confirm overlay count for intra-Library nav drops to 0. Record in `AFTER_P0.md`.

- [ ] **Step 7: Commit.**

```bash
git add src/stores/navigation-ui-store.ts src/hooks/use-navigation-router.ts tests/vitest/navigation-ui-store.test.ts
git commit -m "perf(nav): show route overlay only on slow nav; never on refresh"
```

---

## Task 2: Reshape the Overview skeleton to match `LibraryOverview`

**Why:** F4 — `library/loading.tsx` renders a grid + 312px right rail; `LibraryOverview` is a single scrolling column with no right rail → wrong-shape flash + CLS on every cold load.

**Files:**
- Modify: `src/app/workshop/library/loading.tsx`
- Reference (read first, do not modify): `src/components/workshop/library/overview/LibraryOverview.tsx:230-298`
- Test: `tests/vitest/library-overview-skeleton.test.tsx` (create)

- [ ] **Step 1: Read `LibraryOverview.tsx:230-298`** to capture the real layout regions: a search row, a "Components" section header + card grid, a "Templates" section, a health line — **single column, no right rail.**

- [ ] **Step 2: Write the failing test** — assert the skeleton has no right-rail element and is a single column.

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/workshop/library/loading";

describe("Library Overview skeleton shape", () => {
  it("renders a single column with no right rail", () => {
    const { container } = render(<Loading />);
    // Baseline skeleton had a `w-[312px] ... border-l` right rail; it must be gone.
    expect(container.querySelector(".border-l")).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run — expect FAIL** (right rail present today).

```bash
nvm use 25.8.0 && bunx vitest run tests/vitest/library-overview-skeleton.test.tsx
```

- [ ] **Step 4: Rewrite `src/app/workshop/library/loading.tsx`** as a single column matching Overview: a search-row skeleton, a section header + a card grid (6 cards), a second section header + a few stacked rows, a thin health line. Remove the `border-l` right rail. Keep `role="status"` + `aria-label` + `sr-only`.

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white p-2" role="status" aria-label="Loading library">
      <Skeleton className="h-9 w-full max-w-xl" aria-hidden="true" />          {/* search row */}
      <Skeleton className="mt-4 h-5 w-40" aria-hidden="true" />                 {/* "Components" */}
      <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[200px] w-full" />)}
      </div>
      <Skeleton className="mt-6 h-5 w-32" aria-hidden="true" />                 {/* "Templates" */}
      <div className="mt-2 space-y-2" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
      <Skeleton className="mt-6 h-4 w-64" aria-hidden="true" />                 {/* health line */}
      <span className="sr-only">Loading library</span>
    </div>
  );
}
```
(Adjust card height / counts to match `LibraryOverview`'s real card dimensions read in Step 1.)

- [ ] **Step 5: Run — expect PASS.** Then manually cold-load `/workshop/library` and confirm CLS ~0 (`06 §D`). Record before/after CLS in `AFTER_P0.md`.

- [ ] **Step 6: Commit.**

```bash
git add src/app/workshop/library/loading.tsx tests/vitest/library-overview-skeleton.test.tsx
git commit -m "fix(library): reshape Overview skeleton to match single-column content (CLS)"
```

---

## Task 3: Put the browse tabs on the TanStack Query cache (instant revisits)

**Why:** F6 — TanStack Query is wired (`providers.tsx:13-27`, 5-min `staleTime`) but only the editor dock uses it. Browse tabs re-fetch + re-skeleton on every revisit. **Correction:** passing the server fetch as `initialData` is not sufficient if the route still awaits the server fetch before rendering; the client cache cannot render while `components/page.tsx` is still suspended behind `loading.tsx`. Do Components first (highest-traffic), then Templates, but use one of the two provable P0b paths below.

**Required P0b architecture choice before coding:**

1. **Immediate client shell route:** each route segment returns a thin client shell immediately and the shell reads from TanStack Query. The server may prefetch/dehydrate or pass `initialData` only when available, but warm revisits must not suspend the route behind `loading.tsx`.
2. **Client-panel tabs with URL sync:** keep `/workshop/library/...` URLs and back/forward semantics, but the persistent Library shell owns the panels and switches visible content from warmed client state instead of remounting server segments for normal tab clicks.

If neither path is implemented, downgrade the P0b target: delayed overlay can pass, but "no skeleton on warm revisit" cannot.

**Files:**
- Reference: `src/lib/component-library/query-keys.ts` (existing keys), `TemplateEditorClient.tsx:121-125` (the proven pattern), `LibraryComponentsRoute.tsx`, `LibraryPageClient.tsx`
- Modify: `src/app/workshop/library/components/page.tsx` and `src/components/workshop/library/LibraryComponentsRoute.tsx` only after choosing the P0b path. If the route-shell path is chosen, these must return a client shell without awaiting the heavy dataset on warm navigations.
- Modify: `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (consume via `useQuery` from the chosen whole-dataset key, drop the source-prop reconciliation)
- Add or reuse a real client-callable loader. The existing `loadCurrentWorkspaceComponentLibrary` may be the wrong shape for the management tab; if so, add `loadCurrentWorkspaceComponentRowsLibraryClient` alongside it and type it as `ComponentRowsLibraryDataset`.
- Test: `tests/vitest/library-components-cache.test.tsx`

- [ ] **Step 1: Read and decide the data-shape contract before coding.** `query-keys.ts` currently defines `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` as the **full dataset** key (`src/lib/component-library/query-keys.ts:5-7`), but `LibraryComponentsRoute` currently splits `getCurrentWorkspaceComponentRowsLibrary()` into `categoryTree`, `suppliers`, `brands`, `libraryFolders`, and `libraryItems` props (`src/components/workshop/library/LibraryComponentsRoute.tsx:9-19`), while the manager locally reconciles only `libraryItems` (`src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1091-1109`). Before coding, record whether the Components tab will use the existing full key, a new `componentRows` key, or a normalized aggregate object. The chosen key must be reused by T4 invalidation and T5 editor seeding.

- [ ] **Step 2: Write the failing unit test** — mount the manager twice with a shared `QueryClient`; assert the second mount renders from cache without calling the `queryFn` again.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
// import the manager + a way to inject a spy queryFn

it("renders the components tab from cache on the second mount (no refetch)", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
  const queryFn = vi.fn().mockResolvedValue(/* fixture library */);
  // first mount seeds the cache via initialData
  // second mount must not call queryFn
  // assert queryFn call count === 0 (initialData) and content visible
  expect(queryFn).toHaveBeenCalledTimes(0);
});
```

- [ ] **Step 3: Run — expect FAIL** (no `useQuery` in the manager yet).

- [ ] **Step 4: Wire `useQuery` with `initialData`.** In the client manager, replace the source-prop `useState` reconciliation with a whole-dataset cache read, not a partial item-only cache. Folder, supplier, brand, category-tree, and item updates must all flow through the same chosen dataset or through explicitly paired query keys. A stale `localFolders`/fresh `libraryItems` split is a bug.

```ts
const { data: library } = useQuery({
  // Reuse ["workspace-component-library"] ONLY if the management shape == the editor-dock shape.
  // The Components tab's getCurrentWorkspaceComponentRowsLibrary returns rows+tree+suppliers+brands+folders,
  // which is richer than the editor dock's loadCurrentWorkspaceComponentLibrary — so use a distinct
  // namespaced key here and let the dock keep its own, UNLESS Step 1 confirms the shapes are identical.
  queryKey: chosenLibraryKeys.componentRows(workspaceId), // add this real key in Step 1
  queryFn: () => getCurrentWorkspaceComponentRowsLibraryClient(), // the existing server fetch, called client-side
  initialData: props.library,                       // server fetch becomes the cache seed
  staleTime: 5 * 60_000,
});
```
If the chosen P0b path still uses a server seed, that seed is only an optimization for cold/first paint. Warm revisits must render from cache before the route suspends. **Remove** the `if (state.source !== props) setState(props)` block (`ComponentLibraryManager.tsx:1105-1109`) only after the cache owns the whole dataset.

- [ ] **Step 5: Run — expect PASS.** Then run the Playwright standard session. Components revisit must show **no route `loading.tsx`, no manager fallback skeleton, no overlay, instant content**. Record warm tab-switch ms in `AFTER_P0.md` (target <100 ms). If route `loading.tsx` appears, the implementation failed P0b even if the manager-level unit cache test passed.

- [ ] **Step 6: Repeat for Templates** — same pattern in `TemplatesBrowsePageClient.tsx`/`TemplatesBrowseManager.tsx` with `libraryKeys.templates(workspaceId)` and `initialData: props.templates`. Add an equivalent cache test.
- [ ] **Step 6b: Cross-tab cache coherence proof** — after a component create/edit/archive/folder move, revisit Overview, Components, Templates, and the template editor. Verify visible data converges without a full `router.refresh()` and without serving a stale pre-mutation cached snapshot.

- [ ] **Step 7: Commit** (two commits, one per tab).

```bash
git add -A && git commit -m "perf(library): make Components tab render warm cache without route skeleton"
```

> **Note:** server-route tabs are acceptable only if they return an immediate client shell on warm revisits. A traditional awaited server route plus `initialData` does not meet the no-skeleton target.

---

## Task 4: Replace `router.refresh()` mutation tails with cache invalidation

**Why:** F7/F29 — every mutation does optimistic local patch **then** `router.refresh()`, re-running the whole server segment (and, pre-Task-1, flashing the overlay). With the data in the cache (Task 3), mutations should `setQueryData`/`invalidateQueries` instead.

**Files:**
- Modify: `ComponentLibraryManager.tsx` (handlers at `:1166,1197,1206,1305,1343-1417`), `TemplatesBrowseManager.tsx` (`:598-759`), `use-template-editor.ts:64-88`
- Test: extend the cache test from Task 3

- [ ] **Step 1:** For each mutation handler, after the server action resolves, replace `router.refresh()` with `queryClient.setQueryData(key, next)` (apply the same patch already computed for the optimistic update) and an `onError` rollback (already present). Where a full reconcile is safer, use `queryClient.invalidateQueries({ queryKey })` (silent refetch — no overlay) instead of `router.refresh()`. Include all current Library tails: `ComponentLibraryManager.tsx:1175,1203,1334,1409`, `TemplatesBrowseManager.tsx:603,617,651,673,710,747`, and `use-template-editor.ts:76`.

- [ ] **Step 2: Write a failing test** asserting a create/edit updates the cache and does **not** call `router.refresh`.
- [ ] **Step 2b: Write a rollback test** for at least one component mutation and one template mutation where the server action rejects. The optimistic row/list change must revert, the status must show a generic user-safe failure, and no overlay or refresh can fire.

- [ ] **Step 3: Implement; run — expect PASS.**

- [ ] **Step 4: Manual** — run standard session step 7 (edit a component): change is instant, no overlay flash afterward, list stays consistent. Record "mutation → visible & settled" in `AFTER_P0.md`.

- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "perf(library): invalidate query cache on mutation instead of router.refresh"
```

**P0 exit gate:** P0a passes when overlay count is 0 for fast intra-Library nav/mutations and Overview CLS is ~0. P0b passes only when the Playwright standard session proves skeleton-flash count ≤1 (cold load only), no route `loading.tsx` on warm Components/Templates revisits, and Components revisit <100 ms. Append the numbers and trace links to `AFTER_P0.md`.

---

# P1 — Remove residual waterfalls & rough edges

## Task 5: Remove the template-editor double-fetch + lazy-load heavy editor pieces

**Why:** F17 — editor server-fetches the template then client-`useQuery`s the entire library (second loading phase), and eagerly imports `TemplateStructureTree`/`TemplateEditorSheet`/`EstimateRightSidebar`.

**Files:**
- Modify: `src/app/workshop/library/templates/[templateId]/page.tsx` only if measurement proves server-side cache hydration does not delay first editor paint
- Modify: `src/components/workshop/library/template-editor/TemplateEditorClient.tsx:16-24` (`dynamic()` the heavy pieces), `:121-125` (seed `useQuery` from cache/`initialData` only when it improves total perceived load)
- Test: `tests/vitest/template-editor-no-double-fetch.test.tsx`

- [ ] **Step 1:** Write a failing test asserting the editor's component-library `useQuery` is seeded (`queryFn` not called on first mount because `initialData`/cache present).
- [ ] **Step 2:** Decide with measurement before moving the full library load onto the critical server render. Today's template editor route blocks only on `getEstimateTemplateById`; the dock's full library query happens after mount. Capture editor TTFB/FCP before and after. Prefer cache hydration/prefetch only if it does not delay first editor paint; otherwise keep the dock lazy while warming the cache on route prefetch/hover. If server-side initial data is used, fetch the component library alongside the template (reuse the same loader; ideally read from the shared cache key Task 3 introduced) and pass as a prop. In `TemplateEditorClient`, pass it as `initialData` to the existing `useQuery(["workspace-component-library"])` — unifying the key with Task 3 so the editor and Components tab share one cache entry.
- [ ] **Step 3:** Convert the three eager imports to `dynamic()` with skeleton fallbacks (mirror `LibraryPageClient.tsx:11-17`).
- [ ] **Step 4:** Run tests; `ANALYZE=true bun run build` to confirm the editor chunk shrank (`06 §F`).
- [ ] **Step 5: Commit.**

## Task 6: `cache()`-wrap `ensureDefaultWorkspace`

**Why:** F18 — re-runs its DB queries on every navigation; not request-deduped.

**Files:** Modify `src/lib/repositories/workspace-repository.ts:725-738`. Test: `tests/vitest/ensure-default-workspace-cache.test.ts`.

- [ ] **Step 1:** Run `gitnexus_impact({target: "ensureDefaultWorkspace", direction: "upstream"})` and record the blast radius (it is called by many actions — verify `cache()` semantics are safe: it must be a pure per-request read, no side-effects depending on call count).
- [ ] **Step 2:** Write a failing test: two calls in one request issue one DB round-trip.
- [ ] **Step 3:** Wrap the read in `React.cache()` (same pattern as `getCurrentUserContext`, `session.ts:31`). If the function has a write side-effect (auto-provisioning a default workspace), split it: `cache()` the read, keep the provision path uncached.
- [ ] **Step 4:** Run tests; manual round-trip count per tab drops by the workspace prefix (`06 §E`).
- [ ] **Step 5: Commit.**

## Task 7: Optimistic insert-into-estimate

**Why:** F21 — three sequential server resolves, no optimistic feedback. **Files:** `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx:72-143`.

- [ ] Collapse the redundant `resolveEstimateTemplateInsertTarget` pre-check + re-resolve into a single resolve on submit; show optimistic "Inserted" state and reconcile on settle. Test the resolve is called once. Commit.

## Task 8: Replace native `prompt`/`confirm`; Overview CTA opens the add modal

**Why:** F22, F23. **Files:** `TemplateEditorClient.tsx:90,101,112` (→ DS `ConfirmDialog`/`ControlInput` text-prompt, mirror `TemplatesBrowseManager.tsx:856-883`); `LibraryOverview.tsx:210,240-243` (open the add-component modal instead of `router.push`).

- [ ] Swap dialogs; wire the modal; test the editor add/rename uses the DS dialog (no `window.prompt`). Add visual/DOM acceptance for Add Component modal alignment at mobile and desktop widths: paired labels/inputs/helper rows remain aligned, dropdown affordances and clear buttons do not crowd text, focus returns to the invoking control. Commit.

**P1 exit gate:** editor shows one loading phase (not two); round-trips per tab reduced by the workspace prefix; no native OS dialogs in the editor.

---

# P2 — Database / RPC / scaling cliff (GATED on `08 Q4` + PG17 prove-harness, `06 §G`)

> **Gate:** before any task here, restore DB access, run `get_advisors`, and capture `EXPLAIN (ANALYZE, BUFFERS)` baselines on the prove-harness. The RLS rewrite (Task 15) additionally requires a before/after **access-decision proof**.

**Migration checklist for every P2/P3 migration:** record pre/post row counts, null/FK checks, old-vs-new golden-master output, grants/revokes, advisor results, EXPLAIN where relevant, hosted-apply boundary, and rollback/forward-fix path. RPC replacement tasks must include dual-read parity before cutover and a `drop function`/revert plan if not yet applied to hosted.

## Task 9: Add `(workspace_id, updated_at)` index (F12)
- [ ] Migration `add index if not exists cost_library_items_workspace_updated_idx on cost_library_items (workspace_id, updated_at desc)`. Prove with EXPLAIN that the Overview recents query switches from filter+sort to index scan. Apply via the relax-only migration discipline. Commit + record plan delta.

## Task 10: `get_library_overview` RPC (F13, F14)
- [ ] Create the RPC from `02 §D` (`security definer set search_path = public`, `is_workspace_member` re-check inside — `05` cross-check). The response must match the full `LibraryOverview` contract: component/category/supplier/brand counts, template counts/categories, recent components, recent templates with summarized group/area/row/total fields, and nested health including `discontinuedInUseCount`. Add a server-side wrapper in the repository; replace the 11-query `getLibraryOverview` body with one `rpc()` call. TDD: a golden-master parity test asserting RPC output equals the old `getLibraryOverview()` output for the seed workspace, plus a repository test asserting one RPC call replaces the multi-select path; EXPLAIN the RPC. Commit.

## Task 11: `get_component_library_graph` RPC (F8)
- [ ] Create an RPC returning items + nested `json_agg` of price options/cost entries in one round-trip; wire `loadCurrentWorkspaceComponentRowsLibrary` to call it (keep the `includeDetailGraph` split — lite path stays). TDD round-trip count drops from ~10 to ~2. Commit.

## Task 12: Explicit columns, drop over-fetch (F9 / 05 F9)
- [ ] Replace `select("*")` at repo `:546,591,597-640,739-744,1073-1078` with explicit column lists matching the DTOs; stop selecting `metadata`/`variant_metadata`/`image_metadata`/`source_snapshot`/`labor_cost`/`supplementary_cost`/`created_by` where unrendered. TDD: snapshot the client DTO is unchanged; measure RSC payload shrink (`06 §F`). Commit.

## Task 13: Cache taxonomy + seed folders out-of-band (F11, F10)
- [ ] Cache the global category tree (`unstable_cache` keyed by `componentCategoryTaxonomyVersion`); move `ensureWorkspaceLibraryFolders` off the read path. **Do not default to virtual folders until proven safe.** Current code lets users create/rename/delete/reorder per-workspace folders (`ComponentLibraryManager.tsx:1343-1395`) and persists taxonomy-backed folder rows with `source_category_node_id` (`component-library-repository.ts:315-378`), so a virtual-folder rewrite can erase customized folder state unless it is designed as a hybrid. Invariant: `library_folders` remains the canonical persisted source of truth for every item-addressable `library_folder_id` and every customized folder row; any taxonomy virtualization is view-layer only for unchanged taxonomy nodes. TDD: Components load no longer fetches 685 taxonomy rows + builds the tree per request; no INSERT on the read path; customized folder order/name rows and item folder references survive. Commit.

## Task 14: Paginate / virtualize the components list (F16)
- [ ] Server-side `range`/cursor on the items query; virtualize the grid; load per-item history/version graph lazily per inspection (reuse the `includeDetailGraph:false` lite path). TDD with a synthetic large dataset on the prove-harness. Commit.

## Task 15: RLS initplan caching (F15) — HIGHEST BLAST RADIUS
- [ ] Rewrite `is_workspace_member`/`is_workspace_admin` bodies `auth.uid()` → `(select auth.uid())`. **Before/after access-decision proof on the prove-harness** (same principal sees the same rows; advisors `auth_rls_initplan` count drops). EXPLAIN a multi-row library scan before/after. Apply to hosted only after proof. Commit with the proof artifact linked.

## Task 16: Denormalize `workspace_id` onto template nodes/rows (F28)
- [ ] Add `workspace_id` columns (backfill from parent template), switch the node/row RLS policies to direct `is_workspace_member(workspace_id)`. Prove the per-row correlated EXISTS is gone via EXPLAIN. Commit.

**P2 exit gate:** Overview → 1 round-trip, Components → ~2; explicit-column payload shrink measured; all advisors clean; RLS proof artifacts saved.

---

# P3 — Security & a11y hardening

## Task 17: Gate template/component mutations on `is_workspace_editor` (F19)
- [ ] First run a current-policy inventory. Component item RLS is already split to editor writes in `20260526142913_project_sheet_collaboration_access.sql:756-762`, but component child tables still have confirmed member-write exposure (`cost_library_item_versions`, `cost_library_item_variant_cost_entries`, `cost_library_item_variant_attachments`). Template RLS is still member-wide in `20260522091621_component_library_templates.sql:583-620`. Add `assertCanManageLibrary(workspace.id)` (mirror `assertCanManageLibraryFolders`, `actions.ts:175-182`) to each mutating template/component action, including template editor node/row actions in `template-editor-actions.ts`. Add missing template RLS splits into `SELECT using is_workspace_member` + `INSERT/UPDATE/DELETE using/with check is_workspace_editor`, and harden component child-table policies/grants so viewers cannot write versions, cost entries, attachments, price options, history, or items while editors/admins can. TDD with a viewer principal denied and an editor/admin principal allowed on the prove-harness across component items, price options, versions, cost entries, attachments, history, templates, nodes, and rows. Commit.

## Task 18: `/workshop` security headers (F20)
- [ ] Add a `/workshop/:path*` block in `next.config.ts:60-117`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin` (ship immediately — zero-risk), plus a **Report-Only** CSP reusing the share/landing shape. Monitor reports before enforcing (nonce pipeline deferred, as for share). Test the headers via a Playwright response-header assertion. Commit.

## Task 19: Creation rate-limit / quota (F24)
- [ ] Add a per-user/per-workspace creation limit (or per-workspace row-count quota in the create RPC) for templates/components/duplicates. Test the limit triggers. Commit.

## Task 20: Sanitize action errors (F25)
- [ ] Replace `throw new Error(\`…: ${error.message}\`)` in `actions.ts`/`template-editor-actions.ts` with a generic user-facing message + server-side `console.error(error)` (mirror the boundary). Test no raw `error.message` reaches the returned rejection. Commit.

## Task 21: Tab/panel a11y wiring (F27)
- [ ] Pass `idBase` from `LibraryTabsLayoutClient.tsx:50` and mark the route content region as the labeled `role="tabpanel"` with `aria-controls`. Test the relationship via testing-library roles. Commit.

**P3 exit gate:** viewer cannot mutate (test proves); workshop responds with the three headers + CSP-Report-Only; no raw DB text in action errors; tabs expose `aria-controls`.

---

# Final QA and review gate

- [ ] Run the full `06 §I` adversarial scenario matrix and save the evidence rows in the final `AFTER_*.md`.
- [ ] Run targeted changed-file tests plus `bun run type-check`, focused ESLint, `bun run lint:design-system`, and the relevant Playwright/DB prove-harness checks. Run full `bun run validate` only if the final diff touches shared navigation, auth/RLS, generated types, or cross-route cache contracts broadly enough to justify the time.
- [ ] Run a two-lane review before implementation handoff: a code-review lane for correctness/security/performance and an architect/critic lane for plan compliance and hidden coupling. Non-clean review returns to this plan, not ad-hoc patching.
- [ ] Record rollback per phase: P0 navigation/store rollback commit; P1 editor/cache rollback; P2 migration down/forward-fix and hosted-apply boundary; P3 headers/RLS/rate-limit rollback.

---

## Self-review (run after the plan, before execution)

- **Spec coverage:** F1–F29 each map to a task — F1/F2/F7→T1+T4, F3/F6→T3, F4→T2, F5→T2/T3, F17→T5, F18→T6, F21→T7, F22/F23→T8, F8/F13/F14→T10/T11, F9→T12, F10/F11→T13, F16→T14, F12→T9, F15→T15, F28→T16, F19→T17, F20→T18, F24→T19, F25→T20, F26→T1 (overlay rarely shows now), F27→T21. ✅ No finding unaddressed.
- **No placeholders:** mechanical tasks (T1, T2, T6, T9, T18) carry full code; large refactors (T3, T4, T10, T11) carry the transformation pattern + the exact files/lines + the test, and instruct the implementer to read the current handler first (honest — the full manager bodies were not transcribed during planning).
- **Type consistency:** T3 Step 1 must define the missing query-key/data-shape contract before code edits. Current code only has full/lite workspace component keys; if Components management needs a richer `componentRows` dataset, add that key and reuse it verbatim in T4 invalidation and any T5 editor bridge. Shapes are NOT assumed identical (see D4).
- **Ordering:** felt-impact (P0) before scaling-cliff (P2); RLS/headers (P3) last and gated. ✅
