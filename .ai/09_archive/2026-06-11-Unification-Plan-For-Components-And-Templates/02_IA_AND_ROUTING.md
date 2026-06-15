# 02 — Information Architecture & Routing

## Route map (target)

```
/workshop/library                          → Overview home (default landing) [PHILIP 2026-06-11]
/workshop/library/components               → Components tab
/workshop/library/templates                → Templates tab, browse state
/workshop/library/templates/[templateId]   → Template editor
/workshop/library/suppliers                → RESERVED (future supplier catalogues)

/workshop/templates                        → permanent redirect → /workshop/library/templates
/workshop/components                       → existing redirect → /workshop/library (unchanged)
```

### Decision notes

- **`/workshop/library` = Overview:** Philip confirmed the overview home for v1. During Phases 0–2 (before the Overview ships in Phase 2.5), `/workshop/library` temporarily renders the components view so the merge never regresses the current landing; the flip to Overview is a one-line layout change when Phase 2.5 lands.
- **Tab strip:** `Overview | Components | Templates` — Overview has no count badge.
- **Why not `?tab=` search params:** sub-routes give per-tab server fetching (Templates tab stops paying for the 154-item component dataset), App Router loading/error boundaries per tab, and clean prefetch on tab hover via `next/link`.
- **Template editor is a page, not a modal/panel:** editing a template is a work session (D5), the same altitude as editing an estimate. Browser back returns to the browse state with tree selection preserved (Zustand, mirroring `useEstimateWorkspaceState`).

## File layout (App Router)

```
src/app/workshop/library/
  layout.tsx                  ← NEW: title bar ("Library") + page TabStrip; shared by all tabs
  page.tsx                    ← Overview home (Phase 2.5); renders components view until then
  components/
    page.tsx                  ← NEW: server fetch getCurrentWorkspaceComponentRowsLibrary()
    loading.tsx / error.tsx
  templates/
    page.tsx                  ← NEW: server fetch getCurrentWorkspaceEstimateTemplates()
    loading.tsx / error.tsx
    [templateId]/
      page.tsx                ← NEW: server fetch single template (nodes + row items) + library dataset for the dock
      loading.tsx / error.tsx

src/app/workshop/templates/
  page.tsx                    ← becomes: redirect("/workshop/library/templates")
  (loading.tsx, error.tsx, TemplatesPageClient.tsx retired once redirect lands)
```

The tab strip lives in `layout.tsx` so it never re-renders on tab switch; active tab derives from `usePathname()`. In the template editor route the layout hides the TabStrip and swaps the title bar into breadcrumb mode (see `03_SCREEN_SPECS.md` §3) — implemented with a layout-level segment check (`useSelectedLayoutSegments`), not a separate layout, so the shell DOM persists.

**Shell architecture fact (verified):** `src/app/workshop/layout.tsx` is logic-only — auth check (`getCurrentUserContext()` → `/login`), terms-acceptance redirect, and the `react-complex-tree` CSS import; it renders `children` directly with no visual shell. Each page currently renders its own `WorkshopPageShell` (which contains `MainSidebar`, `WorkshopTitleHeader`, notifications/settings/feedback chrome, and the `lg:pl-[64px]` rail offset). The unification moves `WorkshopPageShell` up into `src/app/workshop/library/layout.tsx` so the shell and TabStrip persist across tab navigation; sub-pages then render content only. `WorkshopPageShell` needs an optional `subHeader?: ReactNode` slot (rendered under `WorkshopTitleHeader`) to host the TabStrip — see `04_COMPONENT_REUSE_MAP.md`.

## Navigation changes

`src/components/sidebar/MainSidebar.tsx` (`sidebarNavItems`, lines 31–44):

| Before | After |
|---|---|
| `{ id: "library", href: "/workshop/library", label: "Components", icon: Books, shortcut: "⌘3" }` | `{ id: "library", href: "/workshop/library", label: "Library", icon: Books, shortcut: "⌘3" }` |
| `{ id: "templates", href: "/workshop/templates", label: "Templates", icon: Blueprint, shortcut: "⌘4" }` | *(removed)* |

- The rail entry is renamed **Library** (it now contains both; calling it "Components" would orphan templates).
- **Shortcut truth (verified):** the `⌘1`–`⌘4` strings in `sidebarNavItems` are display labels only — no keydown listener implements them (MainSidebar only binds `⌘B` for sidebar toggle). So "remapping ⌘4" is just changing the label on a nav item, or removing it. If real navigation hotkeys are wanted, that's a small new hook (`keydown` on `metaKey + 1..4` → `useNavigationRouter()`); treat it as an optional Phase 4 nicety, not a migration requirement.
- `isActiveHref(pathname, "/workshop/library")` (line ~48) prefix-matches, so the rail highlights for all library sub-routes with no change.

## Tab strip contract

- Component: existing `TabStrip` (`src/components/ui/tab-strip.tsx`) rendered in the library layout, 32px file-folder tabs on `surfaceMuted` band — identical vocabulary to the estimate dock's Components|Templates tabs.
- Items in final v1: `Overview`, `Components` (count = visible `cost_library_items`), `Templates` (count = `estimate_templates`). Phase 0 may ship `Components | Templates` while `/workshop/library` temporarily renders components; Phase 2.5 adds `Overview` and flips the index route. Counts come from the layout-level lightweight count query (two `count: "exact", head: true` Supabase calls), cached per request; they must not block tab render (render tabs, stream counts).
- Tabs are links (`<Link href>` wrapped in the tab button) so prefetching works; `role="tablist"` semantics stay per the existing primitive.
- A third **Suppliers** tab is NOT rendered until the feature exists (no disabled teaser tabs — inert controls are banned).

## URL/state contract

| State | Where it lives |
|---|---|
| Active tab | URL (route segment) |
| Open template | URL (`[templateId]`) |
| Tree selection + expanded nodes (per tab) | Zustand store, keyed by tab — survives tab switches within a session, mirrors `useEstimateWorkspaceState` pattern |
| Sheet search query | Local state; NOT in URL for v1 (matches estimate page) |
| Tree panel width | localStorage (existing keys: keep `template_library_tree_width`; add `component_library_tree_width` if missing) |
| Dock open/width | localStorage per tab |

## Redirect & migration safety

- `/workshop/templates` → `redirect("/workshop/library/templates")` in the server page (same mechanism as the shipped `/workshop/components` redirect — `import { redirect } from "next/navigation"`). No feature flag needed — the Components→Library precedent shipped flag-less and Vercel instant-rollback covers regressions.
- **Complete in-repo reference list (verified by exhaustive grep — exactly 4 occurrences of `/workshop/templates`):**
  1. `src/components/sidebar/MainSidebar.tsx:43` — the nav item (removed in this phase)
  2. `src/lib/component-library/actions.ts:806` — `revalidatePath("/workshop/templates")` → `/workshop/library/templates`
  3. `src/lib/component-library/actions.ts:841` — same change
  4. `src/lib/component-library/actions.ts:861` — same change
  There are NO command-palette navigation entries (the `CommandPalette` in `component-library/` is a component-insert search, not navigation) and NO joyride/tour steps targeting these pages (verified: zero joyride references in src/). The grep gate in Phase 0 re-checks this list is empty post-change.
- The estimate workspace's right-sidebar Templates tab is untouched; its "manage templates" affordances (if any link out) should point to `/workshop/library/templates`.
