# Templates Page — UX Paths & User Flows

**Date**: 2026-06-11  
**Method**: Code analysis + live browser testing

---

## 0. Second-Pass Scope Correction

The Templates page is currently a browse/discovery surface. Existing template insertion already lives in the estimate editor through the shared component-library sidebar and the `insertEstimateTemplateIntoEstimate()` server action.

Future planning must distinguish two options:

| Option | Description | Default? |
|--------|-------------|----------|
| A | Keep `/workshop/templates` browse-first and add a clear launch/handoff into the existing estimate-editor apply flow | Preferred |
| B | Promote `/workshop/templates` into a full create/edit/delete/apply management hub | Requires separate approval because it expands scope and duplicates mutation surfaces |

## Required Beta Outcome Flows

The Templates page must support at least one complete user outcome before beta:

1. Start from template
   - User selects a template from the sheet or tree.
   - User can inspect its structure and sample rows.
   - User can continue into an estimate-editor insertion flow without confusion.
   - Destination project/estimate/group choice is explicit before insertion.

2. Inspect template
   - Clicking a template card selects it.
   - Selection syncs sheet and tree state.
   - Details appear in a contextual dock/inspector by default, not a modal-first management surface.

3. Manage visible controls
   - Filter and group controls are either functional or removed.
   - No toolbar icon ships without an observable state change.

---

## 1. Entry Points

| Entry | Method | Preconditions |
|-------|--------|---------------|
| **Sidebar click** | Click "Templates" (⌘4) | Authenticated, in any workshop page |
| **Keyboard shortcut** | ⌘4 | Anywhere in app |
| **Direct URL** | Navigate to `/workshop/templates` | Authenticated |
| **Back navigation** | Browser back button | Previously on workshop sub-page |

### Redirect Behavior
- **Unauthenticated** → `/login?next=%2Fworkshop%2Ftemplates`
- **Terms not accepted** → `/terms?next=%2Fworkshop%2Ftemplates`

---

## 2. Core User Flows

### Flow A: Browse All Templates

```
Entry (any method)
  → Page loads with "All Templates" selected (default)
  → Sheet shows ALL templates (3 of 3)
  → Tree shows full hierarchy expanded by default
  → User scrolls through template cards
  → Each card shows: name, summary, description, total, structure, sample rows
```

**Interaction details**:
- Cards are in a vertically scrollable list (`space-y-1`)
- Cards are not clickable — **read-only display**
- No pagination (all templates in one scroll)

### Flow B: Filter by Category via Tree

```
User clicks a category node in the tree (e.g., "Residential Rooms")
  → Tree: category node gets [selected] highlight
  → Sheet: tab changes from "All Templates" → "Residential Rooms"
  → Sheet: result counter updates (e.g., "2 of 2 templates")
  → Sheet: only templates in that category shown
  → User clicks "All Templates" to return to full view
```

**Interaction details**:
- Clicking a category node does NOT expand/collapse — it selects
- Clicking the chevron (⌃/⌄) expands/collapses, does NOT select
- Clicking a template leaf node selects it, showing only that template

### Flow C: Filter by Single Template

```
User clicks a template leaf in the tree (e.g., "Condo Fit-Out Starter")
  → Tree: leaf gets [selected] highlight
  → Sheet: tab changes to template name
  → Sheet: shows only that one template (1 of 1)
  → User clicks "All Templates" or another node to change view
```

### Flow D: Search Templates (Sheet)

```
User types in "Search template sheet" input
  → Client-side filter runs on each keystroke
  → Matches against: template.name, template.description, template.category, node names
  → Counter updates (e.g., "1 of 2 templates")
  → Non-matching templates hidden
  → Clear button (×) appears when text present
  → Clicking × or deleting text restores full list
```

**Search behavior**:
- Case-insensitive
- Normalizes input: `toLowerCase().replace(/[^a-z0-9]+/g, " ")`
- Matches against flattened text from all node names at depth ≤ 1
- No debounce — instant on keystroke

### Flow E: Search Tree

```
User types in "Search template tree" input
  → Uses shared filterTree() utility
  → Filters tree nodes by label match
  → Non-matching branches hidden (not just grayed out)
  → Empty state shown when no matches
  → Clear button restores full tree
```

### Flow F: Expand/Collapse Tree

```
User clicks Expand All button
  → All tree nodes expand → getAllNodeIds(nodes)
  → Button state: all expanded

User clicks Collapse All button  
  → All tree nodes collapse → []
  → Only root "All Templates" visible

User clicks chevron on a category node
  → That node toggles expand/collapse
  → Child nodes appear/hide
  → Does NOT change sheet selection
```

### Flow G: Resize Tree Panel

```
User drags the left edge of the tree panel
  → Width changes (min: 216px, max: 432px, default: 272px)
  → Width persisted to localStorage key "template_library_tree_width"
  → Sheet panel resizes to fill remaining space
  → Cursor changes to col-resize during drag
```

---

## 3. Page States

### State 1: Loading
```
Trigger: Initial page load (RSC streaming)
Display: Skeleton cards in 2-3 column grid, 4 placeholder cards
         Search bar skeleton, toolbar skeleton
```
- `loading.tsx` renders `StaticWorkshopLoadingShell` with `Skeleton` components
- Grid layout: `grid gap-2 md:grid-cols-2 lg:grid-cols-3`
- Cards: border, rounded-xs, 3 text skeleton lines

### State 2: Error
```
Trigger: Data fetch failure (Supabase error)
Display: WorkshopRouteErrorState component
         Shows error message + "Try again" button
```
- `error.tsx` — client component with `WorkshopRouteErrorState`
- Passes `routeLabel="Templates"` for contextual messaging

### State 3: Empty — No Templates
```
Trigger: Workspace has zero templates (no seed data, no DB templates)
Display: EmptyState with SquaresFour icon
         Title: "All Templates"
         Description: "No templates in this workspace yet."
```

### State 4: Empty — Category with No Templates
```
Trigger: Selected category has 0 templates
Display: EmptyState
         Title: category name
         Description: "No templates in this category yet."
```

### State 5: Empty — Search No Results
```
Trigger: Search query returns 0 matches
Display: EmptyState
         Title: category/selection name
         Description: "No templates match "{query}"."
```

### State 6: Empty — Tree Search No Results
```
Trigger: Tree search returns 0 matching nodes
Display: EmptyState
         Icon: FolderSimple
         Title: "No template folders"
         Description: "No templates match "{query}"."
```

### State 7: Data — Templates Present
```
Trigger: Templates loaded successfully
Display: Full two-panel layout with template cards and tree
```

---

## 4. Actions Catalogue (Complete)

| # | Action | Trigger Element | Behavior | State Change |
|---|--------|----------------|----------|--------------|
| 1 | Navigate to Templates | Sidebar link / ⌘4 | Loads page | Page render |
| 2 | Select category in tree | Click category label | Filters sheet to that category | Tab label, counter, card list |
| 3 | Select template in tree | Click template leaf | Filters sheet to that template | Tab label, counter, card list |
| 4 | Select "All Templates" | Click root node | Shows all templates | Tab label, counter, card list |
| 5 | Expand tree node | Click chevron ⌃ | Shows children | Node expanded, children visible |
| 6 | Collapse tree node | Click chevron ⌄ | Hides children | Node collapsed, children hidden |
| 7 | Expand all | Click "Expand all" button | All nodes expanded | All children visible |
| 8 | Collapse all | Click "Collapse all" button | All nodes collapsed | Only root visible |
| 9 | Search sheet | Type in "Search template sheet" | Filters template list | Counter, card list |
| 10 | Clear sheet search | Click × button | Removes filter | Full list restored |
| 11 | Search tree | Type in "Search template tree" | Filters tree nodes | Tree display |
| 12 | Clear tree search | Click × button | Removes filter | Full tree restored |
| 13 | Resize tree panel | Drag panel edge | Resizes panel | Width change, layout reflow |
| 14 | Collapse tree panel | Click collapse button | Hides panel | Sheet fills full width |
| 15 | Feedback | Click "Send beta feedback" | Opens feedback modal | Modal overlay |
| 16 | Settings | Click gear icon | Opens settings modal | Modal overlay |
| 17 | Notifications | Click bell icon | Opens notification panel | Panel overlay |
| 18 | Navigate away | Click other sidebar item | Navigates to other page | Page transition |
| 19 | Browser back/forward | Browser navigation | Standard browser behavior | Page transition |
| 20 | Error retry | Click "Try again" on error state | Re-fetches data | Loading → data or error |

---

## 5. Missing Actions (Notable Gaps)

| Missing Action | Current State | Impact |
|----------------|---------------|--------|
| **Create new template** | No "New Template" or "Add" button | Users cannot create templates from this page |
| **Edit template** | Template cards are read-only, no click action | Cannot modify template name, description, or contents |
| **Delete template** | No delete action | Cannot remove templates |
| **Duplicate template** | No duplicate action | Cannot clone for variants |
| **Use/Apply template handoff** | No "Use this template" or "Open in estimate" action | Users can browse templates here but are not guided to the existing estimate-editor insertion flow |
| **Import/Export template** | No import/export | Cannot share templates outside workspace |
| **Sort templates** | Fixed sort (category alpha → name alpha) | Cannot sort by cost, row count, recency |
| **Group by** | "Group" button exists but no observable effect | Non-functional UI element |
| **Filter** | "Filter" button exists but opens no menu | Non-functional UI element |

---

## 6. Interaction Timings (Observed)

| Interaction | Latency | Method |
|-------------|---------|--------|
| Initial page load | ~300-500ms | RSC streaming + client hydration |
| Category select | Instant (<50ms) | Client-side filter, no server call |
| Template select | Instant (<50ms) | Client-side filter |
| Search filtering | Instant per keystroke | Client-side memoized filter |
| Tree expand/collapse | Instant | Client-side state toggle |
| Panel resize | Instant (CSS) | localStorage write is async |

These interactions appear intended to be client-local, but the performance audit observed subsequent RSC POSTs. Resolve that contradiction with fresh browser evidence before implementation.
