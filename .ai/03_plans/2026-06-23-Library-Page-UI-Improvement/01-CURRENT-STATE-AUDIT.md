# 01 - Current-State Audit

## Evidence Boundary

This audit uses source inspection and prior project state. No browser screenshots were captured for this planning pass because no UI implementation was changed.

## Route Map

| Area | Current files | Current state |
|---|---|---|
| Library shell | `src/app/workshop/library/layout.tsx:8`, `src/components/workshop/WorkshopPageShell.tsx:133` | Correctly uses the authenticated workshop shell, title slot, subheader, tab panel wrapper, glass backdrop, and full-height workspace surface. |
| Title bar | `src/components/workshop/library/LibraryTitleBarClient.tsx:18`, `src/components/workshop/library/LibraryTitleBarClient.tsx:63` | Compact and mostly correct. Editor route gets breadcrumb, template mode chip, save state, and insert action. |
| Route tabs | `src/components/workshop/library/LibraryTabsLayoutClient.tsx:47`, `src/components/ui/tab-strip.tsx:45` | Uses shared route-backed `TabStrip` with ARIA wiring. Active tab still lifts onto white/paper chrome and needs glass-context tuning. |
| Overview | `src/components/workshop/library/overview/LibraryOverview.tsx:209`, `src/app/workshop/library/loading.tsx:10` | Functional global search/actions/recent rows/health line, but still a plain `bg-white` scrolling page with centered padding. |
| Components route | `src/components/workshop/LibraryPageClient.tsx:135`, `src/components/workshop/library/library-surface-variant.tsx:14`, `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1158` | Most advanced route. It already uses glass variant plumbing, left tree, center sheet, sticky header, filter chips, and manager state. Inner surfaces still drift into hard white panels and local card effects. |
| Component cards/dense | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1499`, `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1583` | Data hierarchy is strong; visual hierarchy is noisy. Cards and dense headers mix local white surfaces, nested borders, and custom shadows. |
| Folder tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx:992`, `src/components/workshop/component-library-manager/LibraryFolderTree.tsx:1105` | Uses `TreePanelHeader` and `HeaderIconToolbarAddAction`. Good structural fit; needs stronger material consistency. |
| Inspector and docks | `src/components/workshop/library/ComponentInspectorDock.tsx:136`, `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx:91` | Behaviorally useful, but visually solid-white side panels rather than Library glass rails/docks. |
| Templates browse | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:788`, `src/components/workshop/library/templates-browse/TemplateGallery.tsx:61` | Correct IA: tree, gallery, preview dock. It is not wired to `LibrarySurfaceVariantProvider` and uses `bg-white`, `bg-canvas`, borders, and plain list cards. |
| Template Editor | `src/components/workshop/library/template-editor/TemplateEditorClient.tsx:238` | Functional and behavior-heavy. Left rail/root still read white/admin; polish should come after lower-risk browse surfaces. |

## What Already Works

- The Library route lives inside the correct `WorkshopPageShell` and does not need a new top-level shell (`src/app/workshop/library/layout.tsx:8`).
- The Library title bar and tabs already provide top-level orientation and should not be duplicated in content (`src/components/workshop/library/LibraryTabsLayoutClient.tsx:47`).
- Components manager already has the right behavioral architecture: folder tree, center sheet, toolbar, filters, modals/drawers, route-state support, and glass variant provider (`src/components/workshop/LibraryPageClient.tsx:135`).
- Dense mode and source-trust fields are valuable and must be preserved. Prior state records 5,000-row dense proof and browser matrix pass in `.ai/10_state/current-state.md:196` and `.ai/10_state/current-state.md:321`.
- Previous Library work already locked functional/a11y/performance behaviors; this pass should not reopen data, mutation, authz, or taxonomy contracts (`.ai/10_state/current-state.md:176`, `.ai/10_state/current-state.md:196`, `.ai/10_state/current-state.md:321`, `.ai/10_state/current-state.md:346`, `.ai/10_state/current-state.md:3615`).

## Current Failures

### Failure 1 - The route family has multiple material languages

The shell is modern glass, Components has partial `LibrarySurfaceVariant` plumbing, Overview is plain white, Templates is plain white/canvas, and Template Editor is white/admin. This makes the Library feel like unrelated screens collected under one tab row.

Evidence:

- Shell: `src/components/workshop/WorkshopPageShell.tsx:133`.
- Components glass provider: `src/components/workshop/LibraryPageClient.tsx:135`.
- Overview white scroll surface: `src/components/workshop/library/overview/LibraryOverview.tsx:209`.
- Templates hardcoded browse surface: `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:788`.

### Failure 2 - Overview is the clearest visual mismatch

Overview has useful jobs: search, creation entry points, recent components/templates, and library health. Its current composition reads as a generic white admin page rather than a compact Library command surface inside a glass workspace.

Evidence:

- Overview root uses white page treatment at `src/components/workshop/library/overview/LibraryOverview.tsx:209`.
- The route loading skeleton mirrors the white column at `src/app/workshop/library/loading.tsx:10`.

### Failure 3 - Components route has good structure but mixed inner surfaces

Components already uses the right route state and shared primitives. The visual debt is mostly inside cards, dense rows, display toggles, sticky heads, fallback panels, and inspector docks that bypass the variant.

Evidence:

- `librarySurfaceClass` bridges Library to estimate surface classes at `src/components/workshop/library/library-surface-variant.tsx:14`.
- The center sheet and tree rail pass variant classes around `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1158`.
- Inner bodies still include white or surface-muted branches around `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1499`.

### Failure 4 - Templates browse does not share Components surface grammar

Templates has similar IA to Components, but not the same material system. This is the biggest parity gap after Overview.

Evidence:

- Templates manager browse shell uses hard white/canvas/border treatment at `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:788`.
- Template gallery row/card shells are solid white at `src/components/workshop/library/templates-browse/TemplateGallery.tsx:61`.
- Preview dock is a white side panel at `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx:91`.

### Failure 5 - Shared chrome is present, but Library-specific usage is uneven

`TreePanelHeader`, `HeaderIconToolbar`, `ToolbarIconButton`, `SearchInput`, `DropdownSelect`, and `TabStrip` are available and already used in parts of the route. The plan must standardize where each primitive belongs instead of adding local rows.

Evidence:

- `HeaderIconToolbar` renders start/filter/expand/leading/add action groups at `src/components/ui/header-icon-toolbar.tsx:88`.
- `TreePanelHeader` owns the sticky 38px row and optional tabs at `src/components/ui/tree-panel-header.tsx:194`.
- `LibraryFolderTree` already builds a `HeaderIconToolbarAddAction` at `src/components/workshop/component-library-manager/LibraryFolderTree.tsx:992`.

## Screenshots

No screenshots are attached to this planning pack. The browser proof requirement is deferred to implementation phases where paint, geometry, focus, and responsive claims can be verified against changed UI.
