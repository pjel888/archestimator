# 25 — UX State Matrix

> Closes the audit-prompt gap: "Loading, empty, success, partial-success, and error states" per surface.
> Cross-references [03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) and [12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md).

## Schema

For each surface, document: `State | Trigger | UI | Persistence side-effect | Copy`. `N/S` = not specified in current plan — these are gaps to close.

## Library tree

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Loading (initial) | First mount, lazy load via `loadProjectComponentLibraryLite` | Skeleton tree rows in fallback | None | (none — skeleton only) |
| Loading (refetch) | `onLibraryDataChanged` invalidation | Inline tree stays visible; no overlay | None | (none) |
| Loaded | Library data resolved | Tree renders rows | None | (none) |
| Empty (no components) | Loaded but `libraryItems.length === 0` | **N/S — gap**: no empty state defined | None | Suggested: "No components yet. Click 'Add Component' to create one." |
| Empty (no search matches) | Search returns no rows | Empty tree area, no message (verified in test `:748-754`) | None | Suggested: "No matches for '{query}'." |
| Error (load failed) | RPC rejects | Error banner in fallback slots; "Retry" button | None | Banner: "Couldn't load library. Tap to retry." |
| Error (RLS denial) | User is read-only on workspace | **N/S — gap**: should show library in browse-only mode without CRUD affordances | None | (Silently degrade — current behavior; documented) |
| Success (after Create) | `createCostLibraryComponent` resolves | Modal closes; new row appears | Cache invalidated | Toast: "Component created." |
| Success (after archive) | Phase 1 Task 1.1 — RPC resolves | Row removed; toast with Restore | Cache invalidated | Toast: "{name} archived." |
| Success (after Edit) | Phase 1 Task 1.2 — `updateCostLibraryComponent` resolves | Modal closes; row updates in place | Cache invalidated | Toast: "{name} updated." |
| Success (after Duplicate) | Phase 1 Task 1.3 — `createCostLibraryComponent` resolves | Modal closes; new row appears | Cache invalidated | Toast: "{name} (copy) created." |
| Partial-success (bulk archive) | Some items archive, some fail | Failed items remain visible; successful items removed; toast per failure | Cache invalidated for successes | Toast: "Archived {N}. {M} failed: see console." (Eng: surface failed names in toast body) |
| Permission denied | Read-only user attempts CRUD | Buttons not rendered (client); server rejects if bypassed | None | (No UI — actions hidden) |
| Offline | Network unreachable | Next mutate fails; toast | None | Toast: "Offline. Try again when connected." |

## Project tree (projection)

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Loading | Library data loading (shares lifecycle with Library tree) | Skeleton | None | (none) |
| Loaded | Projection derived | Tree renders read-only rows | None | (none) |
| Empty (no estimates yet) | Project has no estimate_row_items | **N/S — gap** | None | Suggested: "No components in this project yet. Add components to estimates to see them here." |
| Empty (search) | Search returns no rows | Empty area | None | Suggested: "No matches." |
| Error | Underlying library load fails | Shares error banner with Library tab | None | (same as Library error) |
| Success (after insert) | Projected row inserted into estimate | Toast from center sheet | New estimate_row_items row | Toast: "{name} added to {targetArea}." |

## Templates tree

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Loading (custom templates) | Templates query pending | Skeleton | None | (none) |
| Loading (reusable sources) | Templates tab activated | 150ms-delayed skeleton | None | (none) |
| Loaded | Both queries resolved | Tree renders | None | (none) |
| Empty (no custom templates) | User has no templates | **N/S — gap** | None | Suggested: "No templates yet. Right-click an Area in your estimate and choose 'Save as template'." |
| Empty (no reusable sources) | Workspace has one project (current) | **N/S — gap** | None | Suggested: "No other projects to reuse from yet." (or hide section) |
| Error (templates) | RPC rejects | Toast | None | Toast: "Couldn't load templates. Retry." |
| Error (reusable sources) | `listReusableProjectSources` rejects | Toast | None | Toast: "Couldn't load reusable sources." |
| Success (template create) | RPC resolves | New template row | Cache invalidated | Toast: "Template '{name}' created." |
| Success (template rename) | RPC resolves | Inline name update | Cache invalidated | Toast: "Template renamed." |
| Success (template delete) | RPC resolves | Row removed | Cache invalidated | Toast: "Template '{name}' deleted." **N/S — gap: confirm dialog copy does not show dependent count** |
| Partial-success (bulk insert) | Some templates insert, some fail | Toasts per item | Per-item | Toast per item: success or error |

## Reusable project sources

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Loading (expand project) | User expands project row | 150ms-delayed skeleton under row | None | (skeleton only) |
| Loading (expand estimate) | User expands estimate row | Skeleton | None | (skeleton only) |
| Loaded | Estimates / outline resolved | Rows render | None | (none) |
| Empty (project has no estimates) | Expanded project returns `[]` | **N/S — gap** | None | Suggested: "This project has no estimates yet." |
| Empty (estimate has no tabs/nodes) | Expanded estimate returns `[]` | **N/S — gap** | None | Suggested: "This estimate is empty." |
| Error (expand) | RPC rejects | Inline error row with Retry | None | Row: "Couldn't load. Retry." |
| Error (search) | `searchReusableProjectSources` rejects | Toast | None | Toast: "Search failed. Retry." |
| Success (source insert) | RPC resolves | Toast; estimate tree refreshes | New subtree in estimate | Toast: "Inserted a copy of {sourceName}. Changes to the source will not propagate." (Phase 1 Task 1.4) |
| Permission denied (source) | Source estimate access revoked between browse and insert | Toast | None | Toast: "This project source is no longer available." (existing behavior) |

## Preview panel

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Loading | Preview item set, data resolving | Skeleton preview card | None | (none) |
| Loaded | Preview data available | Card with image, name, price, chips | None | (none) |
| Empty (no preview) | `previewItemId === null` | Empty state with hint | None | Suggested: "Select a component to preview." |
| Error (preview data missing) | Item id stale (deleted/filtered out) | **N/S — gap**: current behavior keeps stale preview | None | Suggested: clear preview and show empty state |
| Trust-chip states | Various | Existing `SourceTrustChips` | None | (existing) |

## Folder create / rename flows

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Idle | Default | Normal tree | None | (none) |
| Creating (input active) | "Add folder" click | Temp row with inline input | None | Placeholder: "Folder name" |
| Saving | Enter / blur | Input persists; commit in flight | None | (none — input remains until RPC resolves) |
| Saved | RPC success | Temp id → real id; toast | Cache invalidated | Toast: "Folder created." |
| Save failed | RPC rejects | Row removed; toast | None | Toast: "Couldn't create folder. {error}." |
| Cancelled | Escape | Row removed | None | (none) |
| Name empty | Enter / blur with empty input | Input retains focus (current behavior) | None | Suggested: inline validation "Name required" (currently throws silently) |
| Name too long | Input exceeds char limit | **N/S — gap**: no maxlength enforced | None | Suggested: `maxlength=120` on input |

## Search

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Closed | Default | Search dropdown hidden | None | (none) |
| Open, empty | "/" pressed or magnifier clicked | Dropdown with input | None | Placeholder: "Search components…" |
| Typing | User input | Deferred filter; tree updates | None | (none) |
| No matches | Filter returns empty | Empty tree area | None | Suggested: "No matches for '{query}'." |
| Error (server search) | Reusable-source search rejects | Toast | None | Toast: "Search failed. Retry." |
| Stale-response-dropped | Phase 1 Task 1.6 — guard rejects | (silent — user sees only latest) | None | (none — by design) |

## Facets

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Closed | Default | Facet popover hidden | None | (none) |
| Open | Filter button click | Popover with checkboxes/radios | None | (none) |
| Active | Facet selected | Chips appear in applied strip | None | (none) |
| No options | Dataset has no values for a facet | **N/S — gap**: facet hidden or empty? | None | Suggested: hide facet row when no options |
| Clear-all | "Clear all" clicked | Chips removed; back to default | None | (none) |

## Bulk actions

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| None selected | Default | No dock | None | (none) |
| Some selected | Checkbox toggle | Bulk-action dock floats at bottom | None | Dock shows count |
| All selected | Header checkbox | Dock | None | (none) |
| Acting (add/delete in flight) | Bulk action clicked | Dock buttons disabled; spinner | None | (none) |
| Partial failure | Some items succeed, some fail | Dock clears; per-item toasts | Cache invalidated for successes | Per-item toast: success or error |
| Confirmation (bulk delete) | "Delete selected" clicked | Confirm dialog | None | Dialog: "Archive {N} components? This can be undone via Restore." (Phase 1 Task 1.1 copy update) |

## Drag and drop

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Drag start | Mouse down on draggable | Cursor changes; row gets `aria-grabbed` | None | (none) |
| Drag over valid target | Mouse over drop zone | Drop zone highlights | None | (none) |
| Drag over invalid target | Mouse over non-drop zone | No highlight | None | (none) |
| Drop (success) | Mouse up on valid target | Toast; row inserted | New estimate_row_items | Toast: "{name} added." |
| Drop (invalid payload) | Malformed MIME | Silently ignored | None | (none — silent by design) |
| Drop (permission denied) | Server rejects | Toast | None | Toast: "Couldn't add. You may not have edit access." |

## Panel shell

| State | Trigger | UI | Side-effect | Copy |
|---|---|---|---|---|
| Expanded (default) | Mount | Full-width panel | None | (none) |
| Resizing | Mouse drag / arrow keys | Width changes; CSS var updates | None | (none) |
| Collapsed | Toggle button | 32px rail | None | (none) |
| Hidden (mobile) | Viewport < 1024px | `display: none` | None | **N/S — gap**: no fallback message; user has no way to know feature exists |

## Gap summary

Surfaces with **N/S — gap** markers above require copy and component updates during Phase 1 / Phase 2 implementation. None are blocking; they are tracked as P3 polish unless explicitly P1/P2 in [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md).

Eng implementation note: when implementing Phase 1 tasks, also close the **N/S — gap** items in the surfaces you touch. Do not defer all gaps to Phase 3.
