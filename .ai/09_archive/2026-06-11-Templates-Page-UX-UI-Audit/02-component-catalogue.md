# Templates Page — Component Catalogue

**Date**: 2026-06-11  
**Components mapped**: 21 distinct components across the page

---

## 0. Component Reuse Gate

Future Templates work must reuse shared primitives before adding local markup:

- Buttons and icon buttons: shared UI button/icon-button primitives.
- Search: existing `SearchInput`.
- Toolbars: existing `HeaderIconToolbar` only when actions are real.
- Tree: existing workshop tree row/panel patterns.
- Panels/docks: existing workshop side panel or inspector patterns.
- Empty/loading/error states: shared `EmptyState`, `Skeleton`, and route error components.

Blocking defects:

- Feature-local raw button/input/card/dropdown implementations where shared primitives exist.
- Repeated controls not extracted to shared UI/workshop components.
- New reusable components without Storybook/review coverage where the shared component library contract requires it.
- Modal-first CRUD for broad template management without a documented reason.

---

## 1. Page-Level Components

### 1.1 TemplatesPage (Server Component)
- **File**: `src/app/workshop/templates/page.tsx`
- **Type**: Async Server Component (RSC)
- **Data**: Fetches `EstimateTemplate[]` from Supabase
- **Children**: `WorkshopPageShell` > `TemplatesPageClient`

### 1.2 TemplatesPageClient
- **File**: `src/components/workshop/TemplatesPageClient.tsx`
- **Type**: Client Component (`"use client"`)
- **Props**: `{ templates?: EstimateTemplate[] }`
- **Children**: `TemplateLibraryManager`

### 1.3 Loading Skeleton
- **File**: `src/app/workshop/templates/loading.tsx`
- **Type**: Client Component
- **Renders**: `StaticWorkshopLoadingShell` + skeleton grid
- **Grid**: 4 skeleton cards in responsive grid (1/2/3 columns)

### 1.4 Error Boundary
- **File**: `src/app/workshop/templates/error.tsx`
- **Type**: Client Component
- **Renders**: `WorkshopRouteErrorState` with routeLabel="Templates"

---

## 2. Layout & Shell Components

### 2.1 WorkshopPageShell
- **File**: `src/components/workshop/WorkshopPageShell.tsx`
- **Type**: Async Server Component
- **Key props**: `title`, `eyebrow`, `showEyebrow`, `description`, `actions`, `breadcrumbs`, `contentClassName`, `projectId`, `sidebarStatus`, `children`
- **Provides**: Sidebar, header, content area with Suspense, footer
- **Shared**: Used by all workshop pages (projects, library, templates, settings, onboarding)

**Sub-components rendered**:
| Component | Condition | Purpose |
|-----------|-----------|---------|
| `MainSidebar` | Always | 64px icon sidebar |
| `WorkshopTitleHeader` | Always | Page title + breadcrumbs |
| `WorkshopNotificationEntry` | Always | Bell icon with unread count |
| `WorkshopSettingsModal` > `WorkshopSettingsModalContent` | Always | Settings gear → modal |
| `WorkshopFeedbackModal` | Always | "Send beta feedback" in footer |
| `ProjectTotalHeader` | If `projectId` provided | Running totals (not used on templates) |
| `AskFlipFooterAssistant` | If feature flag enabled | "Ask Flip" copilot |

**CSS Variables injected**:
- `ESTIMATE_CENTER_COLUMN_CSS_VARIABLES` — center column width variables
- Side panel width variables (from cookies): `--side-panel-*-width`

### 2.2 WorkshopTitleHeader
- **File**: `src/components/workshop/WorkshopTitleHeader.tsx`
- **Renders**: `<h1>` title, eyebrow text, breadcrumbs, action buttons

### 2.3 MainSidebar
- **File**: `src/components/sidebar/MainSidebar.tsx`
- **Nav items**:
  ```
  Workshop  (⌘1) — SquaresFour icon
  Projects  (⌘2) — Folder icon
  Components (⌘3) — Books icon  → /workshop/library
  Templates (⌘4) — Blueprint icon → /workshop/templates
  ```
- **States**: Collapsed (64px, icons only), Expanded (~240px, labels visible)
- **User section**: Avatar, display name, email

---

## 3. Templates Content Components

### 3.1 TemplateLibraryManager
- **File**: `src/components/workshop/component-library-manager/TemplateLibraryManager.tsx` (422 lines)
- **Type**: Client Component
- **Props**: `{ templates?: EstimateTemplate[] }`
- **State management**:
  - `templateTree`: `useMemo` — navigation tree built from templates
  - `selectedTemplateNodeId`: `useState` — currently selected tree node
  - `selectedTemplateNode`: `useMemo` — resolved node object

**Layout**: Two-panel horizontal split
```
┌──────────────────────────┬─────────────────┐
│  TemplateLibrarySheet    │  Tree Panel     │
│  (flex-1, min-w-0)      │  (resizable)    │
│                          │                 │
│  Header row (38px)      │  Search bar     │
│  Search bar              │  Toolbar        │
│  Tab bar (32px)          │  Tabs           │
│  Scrollable card list    │  Tree           │
│                          │                 │
└──────────────────────────┴─────────────────┘
```

### 3.2 TemplateLibrarySheet
- **Internal component** in `TemplateLibraryManager.tsx`
- **Props**: `{ selectedNode, templates }`
- **Local state**: `searchQuery`
- **Derived state**: `sheetTemplates` (filtered by node), `visibleTemplates` (filtered by search)

**Sub-components**:
| Element | Component | Description |
|---------|-----------|-------------|
| Search bar | `SearchInput` | Full-width, placeholder "Search Template Sheet" |
| Toolbar | `HeaderIconToolbar` | Filter + Group buttons (empty `addActions`) |
| Tab bar | Custom button + span | Shows selected node label + result count |
| Card list | `<ul>` | Scrollable list of template rows |
| Template card | Custom `<li>` | Name, summary, description, total, structure, sample rows |
| Empty state | `EmptyState` | When no templates match current filter |

### 3.3 Template Card (internal)
Each template renders as a list item with:
```
┌─────────────────────────────────────────────┐
│ Template Name                    ₱XX,XXX.XX │
│ X groups / Y areas / Z rows                 │
│ Description text (truncated)                │
│ ┌──────────────────┬──────────────────────┐ │
│ │ Structure        │ Sample rows          │ │
│ │ Category name    │ Material     qty unit│ │
│ │ Node1, Node2...  │ Material     qty unit│ │
│ │                  │ Material     qty unit│ │
│ └──────────────────┴──────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Typography**:
- Template name: `text-[10px] font-medium leading-4`
- Summary: `text-[9px] font-medium leading-3 text-tertiary`
- Description: `text-[9px] leading-3 text-tertiary/80`
- Total: `text-[10px] font-medium tabular-nums` (PHP formatted via `pesoFormatter`)
- Section headers: `text-[9px] font-medium text-ink`
- Row items: `text-[9px] leading-4 text-tertiary`

### 3.4 TemplateLibraryTreePanel
- **Internal component** in `TemplateLibraryManager.tsx`
- **Props**: `{ nodes, templates, selectedNodeId, onSelectNode }`
- **Local state**: `searchQuery`, `expandedNodeIds`

**Sub-components**:
| Element | Component | Description |
|---------|-----------|-------------|
| Panel wrapper | `ResizableSidePanel` | Right-side resizable panel (216-432px) |
| Search bar | `SearchInput` | "Search Template Tree" |
| Toolbar | `HeaderIconToolbar` | Filter, Group, Expand All, Collapse All |
| Tabs | `WorkshopTreeTabs` | Single tab: "Templates" |
| Tree | `WorkshopTree` | Hierarchical tree with custom render |
| Empty state | `EmptyState` | When search has no matches |

### 3.5 Tree Node Renderers

**Category node** (organizer/template-category):
- Chevron icon (CaretDown/CaretRight) — click toggles expand, does NOT select
- FolderSimple icon (12px, tertiary)
- Label text
- Selected state: highlight background

**Template leaf node**:
- SquaresFour icon (12px, tertiary)
- Label + meta (e.g., "2 groups / 3 areas / 8 rows")
- Cost badge (PHP formatted, tabular-nums)
- Cursor: pointer
- Selected state: highlight background

---

## 4. Shared UI Components Used

| Component | Source | Usage |
|-----------|--------|-------|
| `SearchInput` | `@/components/ui/search-input` | Two instances: sheet search + tree search |
| `HeaderIconToolbar` | `@/components/ui/header-icon-toolbar` | Two instances: sheet toolbar + tree toolbar |
| `EmptyState` | `@/components/ui/empty-state` | Four variants: no templates, empty category, no search results, no tree results |
| `Skeleton` | `@/components/ui/skeleton` | Loading state placeholders |
| `ResizableSidePanel` | `@/components/workshop/ResizableSidePanel` | Tree panel with drag resize |
| `WorkshopTree` | `@/components/workshop/workshop-tree` | Hierarchical tree component |
| `WorkshopTreeRow` | `@/components/workshop/workshop-tree` | Individual tree row |
| `WorkshopTreeTabs` | `@/components/workshop/workshop-tree` | Tab bar for tree views |
| `WorkshopTitleHeader` | `@/components/workshop/WorkshopTitleHeader` | Page title header |
| `WorkshopRouteErrorState` | `@/components/workshop/WorkshopRouteErrorState` | Error boundary display |
| `StaticWorkshopLoadingShell` | `@/components/workshop/StaticWorkshopLoadingShell` | Loading skeleton shell |
| `WorkshopFeedbackModal` | `@/components/workshop/WorkshopFeedbackModal` | Beta feedback modal |
| `WorkshopSettingsModal` | `@/components/workshop/WorkshopSettingsModal` | Settings modal |
| `WorkshopNotificationEntry` | `@/features/notifications/components/WorkshopNotificationEntry` | Notification bell |
| `MainSidebar` | `@/components/sidebar/MainSidebar` | Left navigation sidebar |

---

## 5. Utility Functions (internal to TemplateLibraryManager)

| Function | Purpose |
|----------|---------|
| `normalizeLabel(value)` | Normalizes text for search: lowercase, strip special chars |
| `templateMatchesSheetQuery(template, query)` | Checks if template matches search across name, description, category, node names |
| `formatTemplateResultCount(visible, total)` | Formats "X of Y templates" |
| `getTemplateEmptyDescription(...)` | Returns appropriate empty state description based on context |
| `getTemplateStructure(template)` | Extracts first 4 node labels (depth ≤ 1) for structure preview |
| `getTemplateSampleRows(template)` | Extracts first 3 sample rows for preview |
