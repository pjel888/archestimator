# 04 — Projects-Page Parity Gap Analysis

> The owner directive (preserved in the archived 2026-07-11 predecessor and
> carried by this pack)
> is: **"the proposals page should look like the projects page."** This document
> is the concrete feature-by-feature gap between `/workshop/projects` (gold
> standard) and `/workshop/proposals` (current), grounded in current source.
>
> It complements this pack's target design and DAG by naming the
> **exact** primitives, files, and patterns to reuse — so an executor doesn't
> reinvent or guess.

## 1. Capability comparison

| Capability | Projects page | Proposals page (current) | Gap | Reuse from |
|---|---|---|---|---|
| **Shell / layout** | `WorkshopCollectionLayout` (`projects-page-client.tsx:3157-3228`) — search + toolbar + tabs + content slots | Inline `div` + manual header bar (`proposals-page-client.tsx:114-128`) | **Large** — no shared shell | `WorkshopCollectionLayout` (`src/components/workshop/WorkshopCollectionLayout.tsx`) |
| **Search** | Instant, multi-field, `useDeferredValue` (`:1803,1836-1865`) across name/client/code/location/role | **None** | **Large** | `WorkshopCollectionLayout` `searchValue`/`onSearchChange` props (delegate to `TreePanelHeader`) |
| **Status tabs** | `ProjectStatusTabs` (`:319-348`) wrapping `Tabs variant="underline"` with count-driven tab set | **None** | **Large** | `Tabs` + `TabItem` (`src/components/ui/tabs.tsx`); mirror `ProjectStatusTabs` shape |
| **View modes** | 4 modes (list/small/medium/large), persisted to localStorage + `useSyncExternalStore` cross-tab sync (`:165-200,651-694`) | **None** (flat table only) | **Large** | `DropdownSelect` (`src/components/ui/dropdown-select.tsx`) + the `useSyncExternalStore`+custom-event+storage-event pattern at `:651-694` |
| **Sort** | Field dropdown (updated/created/client/name) + direction dropdown + smart labels (`:239-295,972-989`) | **None** (server-fixed `ORDER BY`) | **Large** | `DropdownSelect` + the sort helpers at `:991-1032` |
| **Grouping** | Group-by dropdown (none/manual-group/updated/created/client), `ProjectGroupSection` collapsible sections, DnD reorder (`:172-194,1103-1196`) | **None** | **Medium** (V1 may defer grouping; optional per target design §4.6) | `DropdownSelect` + `groupProjects` pattern (`:1103-1120`) |
| **Cards** | `LiveProjectCard` (`:1265-1412`, memoized `ProjectCardRow`) — glass card, view-mode-aware, hover controls | `ProposalRow` flat `<article>` row (`proposals-page/ProposalRow.tsx`) | **Large** | New `ProposalCard` reusing glass-card classes + `Card` primitive concepts |
| **Bulk actions** | `BulkActionToolbar` + selection set + bulk delete preview (`:58,374-376`) | **None** | **N/A** — recipient inbox is read-only with one action (Review). **Do NOT add bulk actions.** (Target design §1) |
| **Create / edit** | `NewProjectModal`, `ProjectDetailsModal`, status change, favorites, DnD | **None** | **N/A** — read-only inbox. **Do NOT add.** |
| **Empty state** | Inline glass-card empty sections (`:3264-3334`) | Dashed-border card (`ProposalsEmptyState.tsx`) | **Medium** | Glass-card pattern + secondary "wrong email" line (target design §4.8) |
| **Loading** | (projects uses SSR; skeleton shape varies) | `ProposalsListSkeleton` (6 rows) | **Small** — needs card-grid skeleton variant | `Skeleton` (`src/components/ui/skeleton.tsx`) |
| **Refresh** | (implicit via RSC revalidation) | Manual Refresh button + TanStack window-focus refetch | **Keep** — appropriate for recipient inbox (target design keeps it) |
| **Optimistic UI** | Optimistic creates, status overrides, favorites, group assignments (`:1564-1643`) | **None** | **N/A** — no client mutations except Review (server action). Keep simple. |
| **Toasts** | `useToast` for action feedback | **None** (inline error `<p>`) | **Small** — optional for refresh/error feedback | `useToast` (`src/components/ui/toast.tsx`) |

## 2. What to reuse directly (confirmed exists, single-source)

These primitives are confirmed present and are the right reuse targets. An
executor should **not** build alternatives.

| Primitive | File | Used by projects page at |
|---|---|---|
| `WorkshopCollectionLayout` | `src/components/workshop/WorkshopCollectionLayout.tsx` | `:3157` (only consumer today) |
| `Tabs`, `TabItem` | `src/components/ui/tabs.tsx` | `ProjectStatusTabs` `:331` |
| `DropdownSelect`, `DropdownSelectOption` | `src/components/ui/dropdown-select.tsx` | `filterSlot` `:3169-3190` |
| `Button` | `src/components/ui/button.tsx` | `ProposalRow.tsx:147` (already used) |
| `Skeleton` | `src/components/ui/skeleton.tsx` | `ProposalsListSkeleton` (already used) |
| `Card` | `src/components/ui/card.tsx` | (not used by projects; available) |
| `Chip` | `src/components/ui/chip.tsx` | (available for status/decision chips) |
| `useToast` | `src/components/ui/toast.tsx` | `projects-page-client.tsx:1424` |
| `HEADER_ICON_TOOLBAR_DIVIDER_CLASSNAME` | `src/components/ui/header-icon-toolbar.tsx` | `:61` import; toolbar separators |

## 3. Patterns to port (copy the mechanism, not the file)

These are **mechanisms** in `projects-page-client.tsx` that a proposals redesign
should replicate structurally. They are not importable components — they're
state-management patterns.

### 3.1 `useReducer` for collection state
Projects uses a typed `ProjectsPageClientState` + `projectsPageClientReducer`
(`:350-604`) instead of many `useState` calls. A proposals redesign should use
the same shape for: `searchQuery`, `activeStatusTab`, `sortField`,
`sortDirection`, `viewMode`, `groupBy`. This keeps re-renders predictable and
the state snapshot serializable.

### 3.2 Persisted view-mode via `useSyncExternalStore`
The full pattern (`:651-694`): `readPreference`/`writePreference`/`subscribe`/
`getServerSnapshot`, with a custom event + `storage` event for cross-tab sync.
Proposals needs the same for `archestimator_proposals_view_mode_v1` and
`archestimator_proposals_group_by_v1`. Copy the four functions, rename the
storage keys and event names.

### 3.3 Deferred search filtering
`useDeferredValue(searchQuery)` (`:1803`) so each keystroke doesn't block a full
re-filter+re-sort. Proposals should do the same on its filtered+sorted
derivation.

### 3.4 Memoized row rendering
`memo(ProjectCardRow)` (`:1265`) with primitive-only props so an unrelated parent
re-render (search keystroke) doesn't re-render every card. Proposals should
`memo(ProposalCard)` and pass primitives, not closures.

### 3.5 Identity-stable handlers
`useStableCallback` (`:1827-1834`) wraps handlers so memoized cards skip
re-renders. Reuse the same `useStableCallback` hook (`src/hooks/use-stable-callback`).

## 4. What NOT to port (read-only inbox boundary)

The target design (`03_TARGET_UX_UI_DESIGN.md` §1, §9) is explicit: the
recipient inbox is **read-only with a single action (Review)**. Do NOT port:

- Bulk select / `BulkActionToolbar` / bulk delete preview.
- Create / edit modals (`NewProjectModal`, `ProjectDetailsModal`).
- Status change actions (no owner-side status mutation).
- Favorites / `useToggleProjectFavorite`.
- Drag-and-drop (group reorder, card reorder).
- Project groups CRUD (`createProjectGroup`, `reorderProjectGroups`, etc.).
- Optimistic creates / status overrides.

Porting these would be scope creep and would confuse the recipient (who has no
owner authority over these proposals).

## 5. Scope decision: grouping in V1?

The target design marks grouping as **Optional** (§4.6). This pack's
DEC-AUTO-003 chose client-side filtering/sorting for V1 assuming ≤50 rows. With
≤50 rows, grouping adds UI complexity for limited value.

**Recommendation:** defer grouping to V2. Ship V1 with: search + status tabs +
sort + view modes (list/card). Grouping is a clean additive follow-up that
reuses the same `DropdownSelect` + `groupProjects` pattern when justified by
real usage. This keeps V1 closer to the "smallest coherent change" ethos.

## 6. Effort sizing (rough, for planning only)

| Unit | Complexity | Risk |
|---|---|---|
| Data-layer hardening (P1-1/2/3, P2-2) | Low | Low — repo + d1-store, existing tests |
| `WorkshopCollectionLayout` adoption + state reducer | Medium | Low — reuse existing shell |
| `ProposalStatusTabs` + counts | Low | Low — mirror `ProjectStatusTabs` |
| Search (deferred, multi-field) | Low-Medium | Low — port projects pattern |
| Sort (field + direction) | Low | Low |
| View modes (list/card + persistence) | Medium | Low — port persistence pattern |
| `ProposalCard` (card mode) | Medium | Medium — new visual component, needs design eye |
| `ProposalListRow` (list mode) | Low | Low — refactor existing `ProposalRow` |
| Glass-card empty states (genuine + search + status) | Low | Low |
| Card-grid skeleton | Low | Low |

The data-layer hardening (P1s) is a **safe standalone slice** that does not
depend on the redesign and should ship first. The redesign is a coherent
medium-large unit of work that reuses ~80% existing primitives.
