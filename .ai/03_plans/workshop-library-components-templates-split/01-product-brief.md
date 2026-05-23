# 01 Product Brief

## Problem

`/workshop/library` currently mixes three concepts in one UI:

1. component organization through editable folders and suppliers;
2. row collection switching through a sheet dropdown;
3. estimate templates through a top-level `Templates` tab.

That makes the Library page feel like a mode container instead of a direct workspace. The dropdown is especially wrong because it adds a second navigation system inside the sheet, duplicates what the right sidebar selection should own, and exposes implementation categories like `Custom Row Items` and `Supplier Row Items` as user-facing destinations.

## Target Outcome

`/workshop/library` should become a component browsing/organization page:

- right sidebar is the organizing surface;
- left sheet shows rows for the currently selected folder or supplier context;
- no sheet dropdown exists;
- no template mode exists on this route.

Templates move to `/workshop/templates`:

- same compact two-pane workspace rhythm;
- template tree/filter on the right;
- template list/sheet on the left;
- route and nav label make templates first-class.

## Non-Goals

- No Supabase schema changes.
- No change to estimate-template insertion from the estimate-page sidebar.
- No route removal for `/workshop/components`; it remains a redirect to `/workshop/library`.
- No full template editor/CRUD in this slice unless separately approved.
- No import/export, price-health, inspector, or old manager-table restoration.
- No broad redesign of the main workshop shell.

## Principles

- **Route clarity:** Components and Templates are sibling destinations, not tabs inside one generic Library mode.
- **One navigation source per route:** The right sidebar determines the sheet context; the sheet does not have a competing dropdown.
- **Preserve route-specific behavior:** `/workshop/library` is browsing/organization; the estimate sidebar remains insertion-oriented.
- **Small shared abstractions:** Extract layout seams only when they remove real duplication.
- **Test the removal:** Tests must prove the dropdown UI and behavior are gone, not merely hidden.

## Alternatives Considered

### Option A - Recommended: Route-scoped managers with shared frame

Create a component-only manager for `/workshop/library`, create a dedicated `TemplateLibraryManager` for `/workshop/templates`, and extract a lightweight shared workspace frame only if useful.

Pros:
- Clear route ownership.
- Easier React DevTools inspection.
- Avoids a mode-heavy component.
- Makes removal of dropdown state straightforward.

Cons:
- Some short-term duplication between component and template routes.

### Option B - Minimal mode flag in current manager

Keep one `ComponentLibraryManager` and add props like `mode="components" | "templates"`.

Pros:
- Smallest file count.
- Fast initial patch.

Cons:
- Keeps the already-large manager as the owner of unrelated concepts.
- Increases conditional branches.
- Makes future template work harder to isolate.

### Option C - Full generic library workspace engine

Build a highly generic `LibraryWorkspace` that accepts tree/search/sheet/render callbacks for components and templates.

Pros:
- Least duplication long term.
- Could support future library-like pages.

Cons:
- Over-abstracts before the interaction model is stable.
- Higher risk and larger diff.
- Harder to verify against the current user request.

## Recommendation

Use Option A. Extract a shared shell/frame only where it is obviously stable: two-pane workspace container, right-side resizable panel use, and maybe common search/header rows. Keep domain logic route-scoped.
