# UX/UI Audit And Direction

## Audit Scope

Surface: `/workshop/library/templates`

Comparator: estimate editor route `/workshop/projects/0139e1e5-951d-4f2f-9081-6c953d288d8a/estimates/8080f04c-fe18-4314-a1d8-9222e62d1eed`

User goal: manage reusable estimate templates, inspect their structure, compose or refine them from library/project sources, and insert them into estimates without mode confusion.

Accessibility target: WCAG 2.1 AA-aligned keyboard and semantic support for the critical workspace path.

## Confirmed Strengths

- The Library parent route already has a persistent Overview / Components / Templates tab strip.
- The browse route already uses compact glass workspace surfaces and a left template tree.
- Template grouping and move actions already have non-drag equivalents.
- The detail editor already proves that a template can use estimate sheet anatomy.
- Existing design guidance supports a full-browser workspace with left rail, dominant center, and right contextual dock.

## UX Risks

### UX-001: Browse/edit route collapse

If the browse route becomes a full editor without preserving mode distinction, users lose the difference between library management and structural editing. Current architecture intentionally hides parent Library tabs on `[templateId]` and replaces them with breadcrumb/template editor chrome.

Decision: keep route identities explicit. Browse route may become a workbench, but full editing remains the detail route unless a higher-risk integrated-editor phase is selected.

### UX-002: Templates inside Templates

The estimate right sidebar has a `Templates` tab because the estimate page consumes reusable templates. On `/workshop/library/templates`, that creates nested IA: a Templates route with a Templates dock tab.

Decision: template-focused routes must not render a right-dock `Templates` tab.

### UX-003: Project tab without project context

The user's requested `Library + Project` dock is valid in an estimate route because there is an active project. On a workspace-level library route, `Project` needs an explicit source scope.

Decision: the `Project` tab is required and visible. It must include a project selector when projects are available, or a clear unavailable state when no authorized project source exists. Do not show a fake empty tree and do not defer/hide the tab.

### UX-004: Data-integrity mismatch

Estimate editor parity implies permission, history, conflict, load-limit, and route-context guarantees that the template editor does not fully have.

Decision: call the target a template workbench, not estimate parity, unless future phases add revision/transaction/history semantics.

## Direction

### Desktop Layout

Use estimate-family workspace proportions:

- Left rail: templates inventory, default `272px`, min `216px`, max `432px`.
- Center surface: dominant selected-template work surface.
- Right dock: source dock default `380px` to `420px`, max `560px`, collapsible, lazy-loaded.
- Internal rhythm: compact `gap-2`, `p-2`, no centered page cards.
- Library parent tabs remain visible on browse route.
- Template editor route continues hiding Library parent tabs and showing editor breadcrumb/chip/save state.

### Tablet And Mobile Policy

V1 policy: **desktop/laptop workbench first, non-squeezed mobile fallback.**

- Desktop and wide laptop: render the full three-zone workbench.
- Narrow laptop/tablet: keep the left template inventory and center selected-template surface as the primary pair; the right source dock may collapse behind an explicit `Sources` control or drawer.
- Mobile: do not render a squeezed three-pane editor. Show the Library Templates list/preview as a read-oriented single-column surface with a clear desktop-required notice for structural editing and source-dock composition.
- Browser proof is required only if implementation adds an actual mobile drawer/focus trap. If v1 uses the simpler desktop-required/read-only notice, DOM tests are sufficient.

### Left Rail

Purpose: template inventory and organization.

Must include:

- All Templates root.
- Category/group folders.
- Template rows.
- Search.
- Expand/collapse.
- New template.
- Rename/duplicate/move/delete.
- Keyboard and menu equivalents for drag/drop.

### Center Surface

Conservative track:

- No selection: ask user to select or create a template.
- Category selected: show list/table of templates in that category.
- Template selected: show selected-template structure preview, row counts, totals, source trust, and primary actions (`Open editor`, `Insert into estimate`, rename/duplicate/delete).
- Full structural editing is in `[templateId]`.

Integrated editor track:

- Template selected: show editable structure/sheet directly in center.
- Must add capability gating, conflict semantics, mobile policy, and mutation hardening first.

### Right Dock

Allowed tabs on template-focused routes:

- `Library`: workspace component library for composing template rows.
- `Project`: visible in v1; starts with a project selector or unavailable state, then loads project-scoped reusable **estimate sources** only after a real scope is selected.

`Project` means reusable estimate structures from authorized projects, not project-owned component-library rows. It should support the same product job as the estimate sidebar's project-source/template-source family: copying existing project estimate structure into reusable templates. Project-owned component rows are out of scope unless a future source model explicitly adds them.

Forbidden:

- `Templates` tab on `/workshop/library/templates`.
- Hiding or deferring the `Project` tab on `/workshop/library/templates`.
- A dock that restores `Templates` from localStorage/account prefs.
- Permanent preview dock replacing the source dock after the transition.

### Visual System

Follow PRODUCT.md and DESIGN.md:

- Full-browser professional workspace.
- SF Pro app scale with compact text, max app text around 12px unless existing component contract requires otherwise.
- Neutral palette, restrained orange only for sanctioned active states/affordances.
- 3px dense inner radii, 8px glass pills, 12px floating panels where already established.
- One soft surface shadow.
- No decorative construction motifs, gradient blobs, nested card clutter, or marketing-style hero layout.

## Required States

- Loading with stable rail/center/dock footprints.
- Empty library.
- No selection.
- Category selected.
- Template selected.
- Read-only member/viewer.
- Editor/admin.
- Saving/saved/error.
- Destructive confirmation.
- Insert picker open.
- Right dock lazy/unloaded/loading/error.
- Project tab no scope / project selected / project load error.
- Mobile/tablet fallback.

## Accessibility Requirements

- Page-level Library tabs keep `tablist` semantics.
- Dock tabs keep tab/tabpanel linkage and keyboard navigation.
- Left rail exposes clear `aria-label`, selected state, expand/collapse state, and keyboard navigation.
- Dialogs return focus to invoking control.
- Errors are announced without closing the dialog.
- Escape behavior must not close the wrong layer when a blocking dialog is open.
- All icon buttons need visible labels or accessible labels.
- Drag/drop actions need non-drag equivalents.
