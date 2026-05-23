# 09 Decisions and Open Questions

## Decisions

### ADR-001: Components and Templates become sibling routes

**Decision:** `/workshop/library` remains the component route and `/workshop/templates` becomes the template route.

**Drivers:**
- User explicitly requested templates move to their own page/route.
- Templates are estimate structures, not component row items.
- This reduces mode confusion inside the Library page.

**Consequence:** Main sidebar should expose both destinations under the Library group.

### ADR-002: Remove dropdown behavior, not only UI

**Decision:** Remove `RowCollectionSelect` and the collection state branches that make it work.

**Drivers:**
- User explicitly said the dropdown is the wrong implementation and to remove all functionality.
- Right-sidebar selection should be the only browsing context.

**Consequence:** `Custom Row Items`, `Uncategorized`, `Estimate Row Items`, and `Supplier Row Items` stop being selectable sheet modes in `/workshop/library`.

### ADR-003: Preserve direct folder and supplier sheet scoping

**Decision:** After dropdown removal, the sheet derives rows from the selected right-sidebar folder or supplier.

**Drivers:**
- The page already has a right-sidebar organization model.
- Removing the dropdown should not make the sheet global or ambiguous.

**Consequence:** Tests must assert folder/supplier selection changes the sheet directly.

### ADR-004: Use route-scoped managers first

**Decision:** Prefer a dedicated component manager and template manager over a single heavily parameterized manager.

**Drivers:**
- `ComponentLibraryManager` is already large and mode-heavy.
- Template route will evolve differently from component route.
- The user wants React DevTools-friendly component boundaries.

**Consequence:** Extract shared layout only after obvious duplication appears.

### ADR-005: Template route uses a template-only repository helper

**Decision:** Add `getCurrentWorkspaceEstimateTemplates()` and use it from `/workshop/templates`.

**Drivers:**
- Templates are now a first-class route, not a tab in a combined component dataset.
- The route should not load component rows, folders, and suppliers only to discard them.
- A single helper name avoids future drift between `TemplateLibrary` and `EstimateTemplates` naming.

**Consequence:** Existing template query/build logic must be factored so `getCurrentWorkspaceComponentLibrary()` and `getCurrentWorkspaceEstimateTemplates()` share normalization.

### ADR-005B: Component route uses component-only data

**Decision:** `/workshop/library` should use a component-only helper, tentatively `getCurrentWorkspaceComponentRowsLibrary()`, instead of the combined component/template dataset helper.

**Drivers:**
- The user asked to move templates completely out of `/workshop/library`.
- Loading templates on a component-only route preserves hidden coupling even if UI props are removed.
- The estimate workspace still needs the combined helper, so replacing the helper globally would be riskier than adding a route-specific component helper.

**Consequence:** Repository tests must prove the component-only helper excludes templates while the existing combined helper still supports estimate-sidebar insertion.

### ADR-006: View copy is locked for first implementation

**Decision:** The component route uses `Components` as the route/surface label, and the view buttons are `View By: Default` and `Suppliers`.

**Drivers:**
- The user explicitly requested `Categories` become `Components`.
- The user explicitly requested `Default Folders` become `View By : Default`.

**Consequence:** Tests should assert this copy directly and avoid accepting `Component Library` or a separate `View By:` label plus `Default` button for this slice.

## Open Questions / Assumptions

### Q1: Should a one-tab `Components` tab remain visible?

Assumption for implementation:
- Keep a visible `Components` label in the right sidebar for now because the user specifically requested renaming `Categories` to `Components`.
- This should be treated as a static/header label or visually tab-like single selection, not as a surviving multi-tab system.

### Q2: What should `All Suppliers` show after dropdown removal?

Assumption for implementation:
- Preserve current semantic default: `All Suppliers` shows supplier-backed rows and excludes unsourced rows.

### Q3: How are custom/uncategorized rows reached after dropdown removal?

Assumption for implementation:
- Custom rows are reached through the folders they belong to.
- Uncategorized rows are not exposed as a special route in this slice.
- If the product needs an `Uncategorized` system folder later, that should be planned separately in the right-sidebar tree, not through a sheet dropdown.

### Q4: Should `/workshop/templates` support template CRUD immediately?

Assumption for implementation:
- No. First route is browsing-only using the current template list/tree behavior.
- CRUD can be planned once the template route is validated.

## Review Notes

If implementation reveals that template route duplication is large, extract a `LibraryWorkspaceFrame` before continuing. Do not collapse route-specific data rules into one generic manager just to reduce lines.
