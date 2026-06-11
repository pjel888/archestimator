# Templates Page — Overview & Architecture

**Date**: 2026-06-11  
**Page URL**: `http://localhost:3000/workshop/templates`  
**Source files audited**: 12 files across route, components, data layer  
**Live testing**: Yes — full browser interaction tested with real data (3 templates)

---

## 1. Route & Layout Architecture

```
Route: /workshop/templates
├── src/app/workshop/layout.tsx          # Auth gate, terms acceptance
├── src/app/workshop/templates/
│   ├── page.tsx                         # Server Component — data fetch
│   ├── loading.tsx                      # Skeleton loading state
│   └── error.tsx                        # Error boundary
```

### Layout Chain

| Layer | Component | Responsibility |
|-------|-----------|---------------|
| Root | `src/app/layout.tsx` | Fonts, metadata, QueryClient, Toast, BFCache providers |
| Workshop | `src/app/workshop/layout.tsx` | Auth check, user context, terms acceptance gate |
| Page Shell | `WorkshopPageShell` | Sidebar, header, footer, scroll container |
| Content | `TemplatesPageClient` → `TemplateLibraryManager` | Templates UI |

### Auth Gate
- `WorkshopLayout` redirects unauthenticated users to `/login`
- Redirects users who haven't accepted terms to terms acceptance page
- Uses `getCurrentUserContext()` for session validation

---

## 2. Data Architecture

### Server Component Data Fetch

```typescript
// src/app/workshop/templates/page.tsx
const templates = await getCurrentWorkspaceEstimateTemplates();
```

**Data pipeline**:
1. `getCurrentWorkspaceEstimateTemplates()` — entry point in `component-library-repository.ts`
2. `ensureDefaultWorkspace()` — gets current workspace context
3. `loadCurrentWorkspaceEstimateTemplates()` — actual Supabase query
4. Queries `estimate_templates` table (filtered by `workspace_id`)
5. If templates exist, parallel-fetches `estimate_template_nodes` and `estimate_template_row_items`
6. `buildEstimateTemplatesFromRows()` assembles hierarchical tree from flat DB rows
7. Falls back to hardcoded `estimateTemplates` array if template table missing (error-tolerant)

### Data Type

```typescript
type EstimateTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;          // e.g., "Residential Rooms", "Exterior + Site"
  nodes: EstimateTreeNode[]; // hierarchical group/area tree with row items
};

type EstimateTemplateSummary = {
  groupCount: number;
  areaCount: number;
  rowCount: number;
  total: number;             // sum of all totalItemCosts
};
```

### Client-Side Processing

1. `buildTemplateNavigationTree(templates)` — builds tree structure by category
2. `summarizeEstimateTemplate(template)` — computes summary (groups, areas, rows, total)
3. `getTemplatesForTreeNode(nodeId, templates)` — filters templates by selected tree node
4. `templateMatchesSheetQuery(template, query)` — client-side search across name, description, category, node names

---

## 3. Component Hierarchy

```
WorkshopPageShell (RSC)
├── <MainSidebar />                    # Fixed left sidebar (64px collapsed, 240px expanded)
│   ├── Workspace icon (collapsed)
│   ├── User avatar + name
│   ├── Nav links: Workshop, Projects, Components(Library), Templates
│   └── Keyboard shortcuts: ⌘1-⌘4
├── <WorkshopTitleHeader />            # "Templates" title, notifications, settings gear
├── <Suspense> → content area
│   └── TemplatesPageClient (Client Component)
│       └── TemplateLibraryManager
│           ├── TemplateLibrarySheet (center panel)
│           │   ├── SearchInput ("Search Template Sheet")
│           │   ├── HeaderIconToolbar (filter, group)
│           │   ├── Tab bar (category name + result count)
│           │   └── Template card list (scrollable)
│           │       └── Template row (per template)
│           │           ├── Name, summary line, description
│           │           ├── Total cost (PHP)
│           │           ├── Structure preview (category + node names)
│           │           └── Sample rows (material + qty × unit)
│           └── TemplateLibraryTreePanel (right side panel, resizable)
│               ├── ResizableSidePanel (216-432px, default 272px)
│               ├── SearchInput ("Search Template Tree")
│               ├── HeaderIconToolbar (filter, group, expand all, collapse all)
│               ├── WorkshopTreeTabs (single "Templates" tab)
│               └── WorkshopTree (hierarchical tree)
│                   ├── "All Templates" (root, always expanded)
│                   ├── Category folders (e.g., "Residential Rooms")
│                   └── Template leaves (with summary + cost)
└── Footer
    ├── WorkshopFeedbackModal ("Send beta feedback")
    └── (AskFlip copilot button — hidden, feature-flagged)
```

---

## 4. Page Shell & Chrome

### WorkshopPageShell (shared across all workshop pages)

| Element | Details |
|---------|---------|
| **Sidebar** | 64px collapsed (icons only), ~240px expanded. Fixed left. |
| **Header** | Title + breadcrumbs, notification bell, settings gear. Height varies. |
| **Content** | Flex column, `overflow-hidden`, `p-2` padding |
| **Footer** | 48px min-height, border-top, feedback button, copilot button |

### Shell States
- **Loading**: `StaticWorkshopLoadingShell` with skeleton cards (3-column grid, 4 placeholder cards)
- **Error**: `WorkshopRouteErrorState` with retry button
- **Content**: Templates workspace with two-panel layout

---

## 5. Seed Data (current state)

Three hardcoded templates serve as fallback when DB table is empty:

| Template | Category | Summary | Total |
|----------|----------|---------|-------|
| Condo Fit-Out Starter | Residential Rooms | 2 groups / 3 areas / 8 rows | ₱71,883.00 |
| Powder Room Basic | Residential Rooms | 1 groups / 1 areas / 4 rows | ₱61,150.00 |
| Roof Deck Lounge | Exterior + Site | 1 groups / 2 areas / 3 rows | ₱97,400.00 |

---

## 6. Navigation Context

### Sidebar position
The Templates page is the 4th nav item in the sidebar (⌘4 shortcut):

```
Workshop (⌘1)  →  /workshop  (homebase dashboard)
Projects (⌘2)  →  /workshop/projects
Components (⌘3) → /workshop/library
Templates (⌘4) → /workshop/templates  ← CURRENT
```

### Adjacent pages
- **Library** (`/workshop/library`): Full component library with categories, suppliers, brands, items — much denser page
- **Projects** (`/workshop/projects`): Project-level list
- Both share the same `WorkshopPageShell` chrome
