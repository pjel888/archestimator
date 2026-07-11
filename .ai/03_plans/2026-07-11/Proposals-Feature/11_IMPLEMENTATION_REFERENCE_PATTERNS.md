# 11 — Implementation Reference Patterns

> Improve-stage artifact. Extracts the EXACT reusable patterns from the projects
> page that the proposals executor needs, with file:line references. This avoids
> broad rediscovery during implementation.

---

## 1. Grid CSS Classes Per View Mode

**Source:** `src/components/workshop/project-grid-layout.ts`

```typescript
// Reuse directly: import { getProjectGridClassName } from "@/components/workshop/project-grid-layout";
// Or replicate for proposals with proposal-specific class names.

// list mode:
"flex flex-col divide-y divide-hairline overflow-hidden rounded-xs border border-hairline"
// small mode:
"grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2"
// medium mode:
"grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3"
// large (default):
"grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3"
```

**Sibling helpers also available:**
- `getProjectDateFlagLayoutClassName(viewMode)` — tracks card column width for group flag headers.
- `getProjectStatusTabsLayoutClassName(viewMode)` — overrides tablist grid to match card grid.

**Note:** These strings are asserted byte-for-byte by test suites. Do not modify them.

---

## 2. `useSyncExternalStore` Cross-Tab View-Mode Sync

**Source:** `src/components/workshop/projects-page-client.tsx` lines 165-185, 652-694, 1651-1655

This is a four-piece pattern: module-level fallback, read/subscribe/write helpers, and a `useSyncExternalStore` call.

```typescript
// Constants
const PROPOSALS_VIEW_MODE_STORAGE_KEY = "archestimator_proposals_view_mode_v1";
const PROPOSALS_VIEW_MODE_CHANGE_EVENT = "archestimator:proposals-view-mode-change";

// Fallback (module-level mutable — required for getSnapshot stability)
let fallbackProposalsViewMode: ProposalCardViewMode = "cards"; // or "large" to match projects

// Type guard
function isProposalsViewMode(value: string | null): value is ProposalCardViewMode {
  return PROPOSALS_VIEW_MODE_OPTIONS.some((option) => option.value === value);
}

// Read (guards SSR)
function readProposalsViewModePreference(): ProposalCardViewMode {
  if (typeof window === "undefined") return fallbackProposalsViewMode;
  try {
    const stored = window.localStorage.getItem(PROPOSALS_VIEW_MODE_STORAGE_KEY);
    return isProposalsViewMode(stored) ? stored : fallbackProposalsViewMode;
  } catch {
    return fallbackProposalsViewMode;
  }
}

// Write (updates fallback, writes localStorage, dispatches custom event)
function writeProposalsViewModePreference(viewMode: ProposalCardViewMode) {
  fallbackProposalsViewMode = viewMode;
  try {
    window.localStorage.setItem(PROPOSALS_VIEW_MODE_STORAGE_KEY, viewMode);
  } catch {}
  window.dispatchEvent(new Event(PROPOSALS_VIEW_MODE_CHANGE_EVENT));
}

// Subscribe (listens to BOTH custom event for same-tab AND storage event for cross-tab)
function subscribeProposalsViewModePreference(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === PROPOSALS_VIEW_MODE_STORAGE_KEY) onStoreChange();
  }
  window.addEventListener(PROPOSALS_VIEW_MODE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PROPOSALS_VIEW_MODE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

// Server snapshot (returns default — prevents hydration mismatch)
function getProposalsViewModeServerSnapshot(): ProposalCardViewMode {
  return "cards"; // must match fallback default
}

// Hook call
const proposalsViewMode = useSyncExternalStore(
  subscribeProposalsViewModePreference,
  readProposalsViewModePreference,
  getProposalsViewModeServerSnapshot,
);
```

**Critical:** The server snapshot MUST return the same value as the fallback default. This is what prevents hydration mismatches. The stored value is only applied after hydration.

**Group-by uses the identical pattern** with its own key/event/fallback.

---

## 3. Reducer Structure (StateUpdater Pattern)

**Source:** `src/components/workshop/projects-page-client.tsx` lines 350-604

The projects page uses a `useReducer` with 26 state slices. The proposals page needs ~5 slices. The key pattern is `StateUpdater<T>`:

```typescript
type StateUpdater<T> = T | ((current: T) => T);

function resolveStateUpdater<T>(current: T, value: StateUpdater<T>): T {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

// State type
type ProposalsPageClientState = {
  searchQuery: string;
  activeStatusTab: ProposalStatusTab;
  sortField: ProposalSortField;
  sortDirection: ProposalSortDirection;
  groupBy: ProposalGroupBy;
};

// Action union
type ProposalsPageClientAction =
  | { type: "setSearchQuery"; value: string }
  | { type: "setActiveStatusTab"; value: ProposalStatusTab }
  | { type: "setSortField"; value: ProposalSortField }
  | { type: "setSortDirection"; value: ProposalSortDirection }
  | { type: "setGroupBy"; value: ProposalGroupBy };

// Reducer
function proposalsPageClientReducer(
  state: ProposalsPageClientState,
  action: ProposalsPageClientAction,
): ProposalsPageClientState {
  switch (action.type) {
    case "setSearchQuery": return { ...state, searchQuery: action.value };
    case "setActiveStatusTab": return { ...state, activeStatusTab: action.value };
    case "setSortField": return { ...state, sortField: action.value };
    case "setSortDirection": return { ...state, sortDirection: action.value };
    case "setGroupBy": return { ...state, groupBy: action.value };
    default: return state;
  }
}

// Hook
const [pageState, dispatchPageState] = useReducer(
  proposalsPageClientReducer,
  undefined,
  createProposalsPageClientState,
);
```

**Setter memo pattern** (lines 1464-1563): wrap each dispatch in a named function for stable identity:
```typescript
const pageStateSetters = useMemo(() => ({
  setSearchQuery: (value: string) => dispatchPageState({ type: "setSearchQuery", value }),
  setActiveStatusTab: (value: ProposalStatusTab) => dispatchPageState({ type: "setActiveStatusTab", value }),
  // ...
}), []);
```

---

## 4. Status Tabs Component

**Source:** `src/components/workshop/projects-page-client.tsx` lines 319-348

```tsx
function ProposalStatusTabs({
  activeTab,
  tabs,
  viewMode,
  onTabChange,
}: {
  activeTab: ProposalStatusTab;
  tabs: readonly TabItem[];
  viewMode: ProposalCardViewMode;
  onTabChange: (tab: ProposalStatusTab) => void;
}) {
  return (
    <Tabs
      tabs={tabs}
      activeId={activeTab}
      onChange={(tab) => onTabChange(tab as ProposalStatusTab)}
      variant="underline"
      ariaLabel="Proposal status tabs"
      idBase="proposal-status"
      data-proposal-view-mode={viewMode}
      className={cn(
        "bg-transparent px-2 [&_[role=tablist]]:h-[41px] [&_[role=tablist]]:border-0",
        getProjectStatusTabsLayoutClassName(viewMode),
      )}
      getTabButtonProps={() => ({
        className: "h-full !min-h-[41px] min-w-0 w-full max-w-full justify-start px-2.5",
      })}
    />
  );
}
```

**Count badges:** The `TabItem` type supports `badge?: ReactNode` (rendered as a pill). The projects page does NOT currently pass badges, but the `Tabs` primitive renders them automatically at `tabs.tsx:219-223`:
```tsx
<span className="ml-1 inline-flex ... rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] ...">{tab.badge}</span>
```

---

## 5. Empty State Shell Classes

**Source:** `src/components/workshop/projects-page-client.tsx` lines 3264-3334

**Search empty state:**
```tsx
<div className="grid h-full min-h-[420px] place-items-center px-4 py-10">
  <section
    aria-live="polite"
    aria-label={"No search results for " + query}
    data-proposal-search-empty-state=""
    className="flex w-full max-w-[420px] flex-col items-center rounded-[12px] border border-white/80 bg-white px-5 py-6 text-center shadow-[0_10px_24px_rgba(30,35,50,0.075),0_2px_7px_rgba(30,35,50,0.045),inset_0_1px_0_rgba(255,255,255,0.88)]"
  >
    <div className="grid size-9 place-items-center rounded-full border border-divider bg-surfaceMuted/60 text-secondary">
      <MagnifyingGlass size={16} />
    </div>
    <p className="mt-3 max-w-full text-[12px] font-medium leading-5 text-ink">
      No search results for <span className="break-words text-secondary">"{query}"</span>
    </p>
    <p className="mt-1 max-w-[300px] text-[10px] leading-4 text-tertiary">
      Try a project name, workspace, or project code.
    </p>
    <Button variant="secondary" size="xs" className="mt-4 min-w-[104px] border-white/70 bg-white/75 hover:bg-white/90" onClick={() => setSearchQuery("")}>
      Clear search
    </Button>
  </section>
</div>
```

**Status empty state:** identical structure, swap icon (`FolderSimple`), heading, sub-text, and action (`setActiveStatusTab("all")`).

**Gating logic:**
```typescript
const isSearching = normalizedSearchQuery.length > 0;
const hasNoSearchResults = isSearching && normalizedDeferredSearchQuery.length > 0 && displayRows.length === 0;
const hasNoStatusResults = !isSearching && activeStatusTab !== "all" && displayRows.length === 0;
const hasEmptyState = hasNoSearchResults || hasNoStatusResults;
```

---

## 6. WorkshopCollectionLayout Usage

**Source:** `src/components/workshop/projects-page-client.tsx` lines 3157-3228

```tsx
<WorkshopCollectionLayout
  searchLabel="Search proposals"
  searchPlaceholder="Search proposals"
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  toolbarLabel="Proposal tools"
  toolbarPrefix="proposals"
  filterSlot={
    <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
      {/* View dropdown */}
      <DropdownSelect
        aria-label="View"
        options={VIEW_SELECT_OPTIONS}
        value={proposalsViewMode}
        onValueChange={(next) => writeProposalsViewModePreference(next as ProposalCardViewMode)}
        variant="boxed"
        triggerDisplay="icon"
        triggerTitlePrefix="View"
        className={PROPOSALS_TOOLBAR_SELECT_TRIGGER_CLASS}
      />
      <span className="h-4 w-px shrink-0 bg-hairline" data-proposal-toolbar-view-divider />
      {/* Group-by dropdown */}
      <DropdownSelect
        aria-label="Group by"
        options={PROPOSALS_GROUP_BY_OPTIONS}
        value={groupBy}
        onValueChange={handleGroupByChange}
        variant="boxed"
        triggerDisplay="icon"
        triggerTitlePrefix="Group by"
        className={PROPOSALS_TOOLBAR_SELECT_TRIGGER_CLASS}
      />
      {/* Sort field dropdown */}
      <DropdownSelect
        aria-label="Sort field"
        options={PROPOSALS_SORT_FIELD_OPTIONS}
        value={sortField}
        onValueChange={handleSortFieldChange}
        variant="boxed"
        triggerDisplay="icon"
        triggerTitlePrefix="Sort"
        className={PROPOSALS_TOOLBAR_SELECT_TRIGGER_CLASS}
      />
      {/* Sort direction dropdown */}
      <DropdownSelect
        aria-label="Sort direction"
        options={sortDirectionOptions}
        value={sortDirection}
        onValueChange={handleSortDirectionChange}
        variant="boxed"
        triggerDisplay="icon"
        triggerTitlePrefix="Direction"
        className={PROPOSALS_TOOLBAR_SELECT_TRIGGER_CLASS}
      />
    </div>
  }
  toolbarPanel={
    <ProposalStatusTabs
      activeTab={activeStatusTab}
      tabs={proposalStatusTabs}
      viewMode={proposalsViewMode}
      onTabChange={setActiveStatusTab}
    />
  }
>
  {/* children: the content section */}
</WorkshopCollectionLayout>
```

**Trigger class:** `"h-7 w-auto gap-1.5 border-0 border-transparent bg-transparent px-1.5 text-[10px] hover:border-transparent hover:bg-surfaceMuted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-focus"`

---

## 7. TanStack Query + RSC Cache Interaction

**Source:** `src/components/workshop/proposals-page-client.tsx` lines 53-61; `src/lib/publication/actions.ts` lines 739-749

**Current state:** `revalidatePath("/workshop/proposals")` purges the RSC data cache but does NOT invalidate the TanStack Query client cache (`["recipient-proposals", userEmail]`). Publication mutations from the publisher page won't reflect in the inbox until the 30s staleTime expires or the user clicks Refresh.

**Options (DEC-AUTO-008):**
1. **Accept the gap** — the 30s staleTime + window-focus refetch is sufficient for beta. The inbox is not real-time-critical.
2. **Add a `queryClient.invalidateQueries` bridge** — wire publication mutations to invalidate the proposals query. Requires importing `queryClient` in server actions (not possible directly — needs a client-side effect).
3. **Switch to `router.refresh()` pattern** — like the projects page. Would require replacing TanStack Query with RSC-only + optimistic state. Significant refactor.

**Recommended (DEC-AUTO-008):** Option 1 (accept the gap). The 30s staleTime + `refetchOnWindowFocus: true` + manual Refresh button is sufficient for the recipient inbox. The inbox is not a real-time collaboration surface. Document the gap in `current-state.md`.

---

## 8. View Mode Type

The proposals page should use a simpler view mode than projects:

```typescript
// Proposals uses "cards" | "list" (2 modes, not 4)
// This is sufficient — proposals don't need small/medium density options
type ProposalCardViewMode = "cards" | "list";
```

**Grid classes for proposals:**
- `cards`: `grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3` (same as projects "large")
- `list`: `flex flex-col divide-y divide-hairline overflow-hidden rounded-xs border border-hairline` (same as projects "list")

---

## 9. Search with `useDeferredValue`

**Source:** `src/components/workshop/projects-page-client.tsx`

```typescript
const normalizedSearchQuery = searchQuery.trim().toLowerCase();
const deferredSearchQuery = useDeferredValue(searchQuery);
const normalizedDeferredSearchQuery = deferredSearchQuery.trim().toLowerCase();

// Filter uses deferred value
const filteredRows = useMemo(() => {
  if (!normalizedDeferredSearchQuery) return rows;
  return rows.filter((row) =>
    row.projectName.toLowerCase().includes(normalizedDeferredSearchQuery) ||
    row.workspaceName.toLowerCase().includes(normalizedDeferredSearchQuery) ||
    (row.projectCode?.toLowerCase().includes(normalizedDeferredSearchQuery) ?? false) ||
    (row.senderDisplayName?.toLowerCase().includes(normalizedDeferredSearchQuery) ?? false)
  );
}, [rows, normalizedDeferredSearchQuery]);
```

---

## 10. Existing Test Files (Compatibility)

**Files that will be affected by adding `clientName` to `RecipientProposalRow`:**

| File | Impact | Mitigation |
|---|---|---|
| `tests/vitest/recipient-proposals-repository.test.ts:91-112` | Strict `toEqual` will fail if `clientName` is added to the result | Make `clientName` optional (`clientName?: string \| null`) — `toEqual` with optional fields still passes if the field is absent |
| `tests/vitest/recipient-proposals-repository.test.ts:117` | Regex assertion `not.toMatch(/\b(token_hash\|recipient_token_hash\|encrypted_token\|password_hash)\b/i)` — `clientName` does NOT match this pattern | No issue — `clientName` is safe |
| `tests/vitest/recipient-proposals-repository.test.ts:119` | Regex assertion `not.toMatch(/token\|hash\|encrypted\|password/i)` — `clientName` does NOT match | No issue — `clientName` is safe |
| `tests/vitest/recipient-proposals-page.test.tsx:40-59` | `proposal()` factory returns a full `RecipientProposalRow` — will fail type-check if `clientName` is required | Make `clientName` optional — factory still type-checks |

**Decision (DEC-AUTO-007):** Make `clientName` optional (`clientName?: string | null`) on `RecipientProposalRow`. This avoids breaking both test files. The `toEqual` matcher in the repository test will still pass because optional fields that are absent from the actual value are also absent from the expected value.

**Revised test decision for UNIT-005:** Change from `TARGETED` / `MVP_CRITICAL_INVARIANT` / `CHEAPEST_DECISIVE_EXISTING_TEST` to `NOT_REQUIRED` / `NONE`. Source inspection of the SELECT clause diff is the cheapest decisive proof that no sensitive columns were added. The existing credential-free test's regex assertions are still valid evidence but running them requires a test edit (updating the `toEqual` expectation), which the `CHEAPEST_DECISIVE_EXISTING_TEST` trigger forbids.
