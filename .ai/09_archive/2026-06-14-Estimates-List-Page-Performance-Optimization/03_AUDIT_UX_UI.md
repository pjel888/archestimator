# Audit 03 — UX/UI & Perceived Performance

The user's words: "extremely slow and full of loading screens even with basic CRUD operations." This audit pins that complaint to specific code.

---

## Headline: the "loading screen" on CRUD is a global overlay, not the route skeleton

There are **two** distinct loaders, and conflating them hides the real bug.

- `loading.tsx` skeleton (`ProjectRouteContentFallback`) renders only on **hard/initial navigation** (Next Suspense fallback).
- The flicker on CRUD comes from a **separate global spinner overlay** — `RouteLoadingOverlay` — driven by a Zustand store.

**Mechanism (verified at source):**
- `useNavigationRouter.refresh()` calls `show("refresh")` on **every** `router.refresh()` — `src/hooks/use-navigation-router.ts:26-29`.
- `show()` sets `isNavigating: true` and starts a `MIN_DISPLAY_MS = 250` floor + `SAFETY_TIMEOUT_MS = 10_000` fallback — `src/stores/navigation-ui-store.ts:12-13,33-41`.
- That mounts a full-viewport blurred backdrop + spinner — `src/components/ui/route-loading-overlay.tsx:33-54` (`bg-white/25 backdrop-blur-md`, `z-[150]`).
- The overlay is hidden only when `pathname` changes — `src/components/navigation-listener.tsx:22-24` (`hide()` in a `usePathname` effect).
- **`router.refresh()` does NOT change the pathname.** So on every CRUD op the overlay is dismissed only by the **250 ms floor timer** (`navigation-ui-store.ts:42-56`), or worst-case the 10 s safety fallback.

**→ Every create / duplicate / delete / inline rename / budget edit / auto-code / even "reset column widths" blurs the whole screen with a spinner for ≥250 ms + the server round-trip.** That is the "full of loading screens" complaint, confirmed in code. (F1)

---

## (a) Loading-state inventory

| # | State | Trigger | File:line | Matches final layout? |
|---|-------|---------|-----------|----------------------|
| 1 | `ProjectRouteContentFallback` route skeleton | Hard nav / first load (Suspense) | `loading.tsx:1-5`; `ProjectRouteContentFallback.tsx:3-41` | **No — generic & wrong shape.** Renders left sidebar (184px) + 10px header w/ 2 buttons + a **2-column grid with a right panel** (`grid-cols-[minmax(0,1fr)_minmax(160px,240px)]`, lines 23-35). The estimates page is a search box + `HeaderIconToolbar` + a wide single-column data table, no right rail. Guaranteed wrong-shape flash → CLS. (F4) |
| 2 | Global `RouteLoadingOverlay` (blur + spinner) | **Every** `router.refresh()` and every `push` | `route-loading-overlay.tsx:33-54`; fired from `use-navigation-router.ts:26-29` | N/A — full-screen, ≥250 ms |
| 3 | Per-cell "Saving"/"Saved" text | inline rename/notes/budget commit | `ProjectEstimatesTable.tsx:385-386,505-506` | Inline, low-jank |
| 4 | Create button "Creating" label | create | `ProjectEstimatesClient.tsx:75,114` | Inline |
| 5 | Duplicate button disabled state | duplicate | `ProjectEstimatesTable.tsx:241-243` | Inline |
| 6 | Delete modal `loading`/`executing` | delete preview + execute | `ProjectEstimatesTable.tsx:997-998` | In-modal |

A user who navigates in and does one create hits **three** distinct loaders: route skeleton on entry → then on create the button label + the full-screen blur overlay + a full server re-render that re-mounts the table. The route skeleton (#1) is the worst for perceived quality because it doesn't resemble the page.

---

## (b) Per-operation CRUD UX

| Operation | Handler (file:line) | Optimistic? | Global overlay? | Full server round-trip + `router.refresh()`? |
|-----------|--------------------|-------------|-----------------|-----------------------|
| **Create** | `ProjectEstimatesClient.tsx:41-55` | **No** | **Yes** | Yes — action does 4+ sequential DB calls (`actions.ts:1441-1457`) then revalidates 3 paths |
| **Rename / Notes / Sheet-code** | `ProjectEstimateEditableTextCell.commitDraft` `ProjectEstimatesTable.tsx:301-334` | Partial (local `draft`) but **`router.refresh()` on success (327)** | **Yes** | Yes — every committed inline edit triggers full re-render + overlay |
| **Budget edit** | `ProjectEstimateBudgetCell.commitDraft` `:415-450` (refresh 443) | Partial | **Yes** | Yes |
| **Auto-generate code** | `handleAutoGenerate` `:529-538` (refresh 534) | No | **Yes** | Yes |
| **Duplicate** | `handleDuplicate` `:203-217` (refresh 211) | **No** | **Yes** | Yes — large multi-step copy then refresh |
| **Delete (single/bulk)** | `executeDeleteEstimatePreview` `:724-760` (refresh 753) | Partial — removes from TanStack cache + selection (`:743-751`) but **still `router.refresh()` (753)** | **Yes** | Yes |
| **Open / navigate** | `<Link>` `:247-258` | N/A | **Yes** (via doc click listener `navigation-listener.tsx:27-39`) | Navigates; prefetched on hover |
| **Reset column widths** | `:983-986` | No | **Yes** — `router.refresh()` purely to reset (unnecessary) | Yes |

**Confirmed: every CRUD mutation re-triggers the full-screen blur overlay and a full server re-render — even inline edits that already hold the new value locally.** (F3)

---

## (c) Navigation feel

- Opening an estimate uses `<Link prefetch={false}>` with hover/focus prefetch of route + 3 TanStack queries (`ProjectEstimatesTable.tsx:635-663`, `usePrefetchOnHover` debounced 150 ms). Warm navigation is genuinely fast. ✅
- But the clicked row gives **no local feedback** — no per-row pending/active state, no `useTransition`, no row highlight. The click fires the global blur via the document click listener (`navigation-listener.tsx:27-39`) and the row just freezes.
- The overlay correctly hides on real navigation (pathname change). The pain is `router.refresh()` (no pathname change) holding the overlay for the floor.

---

## (d) Optimistic-update opportunities (prioritized)

1. **Stop `router.refresh()` on inline edits (highest impact, lowest risk).** Rename/notes/budget/auto-code already update local `draft` state AND the action returns the updated row (`updateEstimateDetails` returns `updatedEstimate`, consumed at `:325,:441`). The `router.refresh()` at `:327,:443,:534` is what flashes the whole screen. Reconcile from the action's return value into client state instead.
2. **Optimistic create** (`ProjectEstimatesClient.tsx:48-49`): insert a placeholder "Creating…" row immediately, then reconcile with the canonical `{ row: ProjectEstimateListRow }` action payload required by `06` P-1.2. Do not fabricate the settled row from partial ids in the client.
3. **Optimistic delete**: cache/selection removal already done (`:743-751`); drop `router.refresh()` (753), remove rows from a client list.
4. **Optimistic duplicate** (`:210-211`): a placeholder `"${name} Copy"` row.
5. **Remove gratuitous `router.refresh()` in Reset Column Widths** (`:985`) — pure client/localStorage state.

**Root blocker:** the page passes `estimates` as an immutable server prop (`page.tsx:17-29` → `ProjectEstimatesClient` → `ProjectEstimatesTable` `data: estimates` at `:892`). No client estimates store / `useOptimistic`, so every mutation must round-trip + refresh to reflect. **Introducing a client list state seeded from the prop is the architectural unlock** for all of 1–4. (F2)

---

## (e) CLS / jank

- **Skeleton mismatch (worst CLS):** `ProjectRouteContentFallback` (sidebar + 2-col grid + right rail) vs the table page. `loading.tsx:1-5`. (F4)
- **Backdrop blur on every CRUD** (`route-loading-overlay.tsx:40`, `backdrop-blur-md`) — full-viewport blur is GPU-expensive and visually heavy for a 250 ms inline save; reads as "loading screen."
- **Filler rows mitigate row-count CLS well:** the table always renders to `EMPTY_TABLE_ROW_COUNT = 60` rows (`:54,:908,:972-974`); table height is stable regardless of row count. ✅
- Per-cell status text ("Saving"/"Saved"/error) is `shrink-0` in a flex row — may nudge input width slightly when toggling; minor.
- Totals/remaining-budget arrive with the row (`page.tsx:24-26`), not lazily — no late-badge CLS. ✅

---

## (f) Empty / error / search / a11y

**Empty/error:**
- EmptyState well-formed and recoverable: distinct "no estimates" vs "no matching" copy (`ProjectEstimatesClient.tsx:97-117`) + inline create CTA.
- `createError` (`:81-85`), `duplicateError` (`ProjectEstimatesTable.tsx:913-917`), inline-edit errors (`:387-391`) render in place, recoverable without reload. ✅
- **No `error.tsx` boundary on the list route** (obs 4879; confirmed). An uncaught server-action/render throw has no graceful UI — page hard-crashes to nearest ancestor boundary. (F13 — see `04`.)

**Search:** pure client-side `filterEstimateSheets` via `useMemo` (`ProjectEstimatesClient.tsx:20-28,36`). Instant, no network, no debounce needed (synchronous in-memory over a small list). ✅

**Accessibility:**
- Strong labels: action buttons/inputs have `aria-label` (`:222,231,240,255,262`); error inputs use `aria-invalid` + `aria-describedby` (`:365-366,483-484`); resize handle is a keyboard-operable `separator` (`:600-616`). ✅
- **Live-region gaps:** "Saving"/"Saved" status (`:385-386`) is NOT in an `aria-live` region — SR users get no async-result announcement on inline saves; success is silent. (`createError`/`duplicateError` use `role="alert"` ✅.)
- **Focus loss:** after create/duplicate/delete + `router.refresh()`, the table re-mounts and focus is lost (no restoration to the affected row or trigger).
- Overlay sets `aria-hidden="true"` on main content while navigating and is `role="status" aria-live="polite"` (`route-loading-overlay.tsx:20-44`) — but because it fires on every `router.refresh()`, SR users hear "Loading page" on every inline edit too.

---

## One-line synthesis

The dominant perceived-perf defect is architectural: **`useNavigationRouter.refresh()` fires a global blur+spinner (≥250 ms) on every CRUD, and the page has no client data store so every mutation forces a full server re-render** — compounded by a route skeleton whose layout doesn't match the page. Highest-leverage fixes: (1) remove `router.refresh()` from inline edits (actions already return updated rows), (2) seed a client estimates list to enable optimistic create/delete, (3) replace the mismatched skeleton with a table-shaped one.
