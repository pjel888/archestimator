# 05 - Implementation Roadmap

## P0 - Reliability, Route State, And Overlay Consistency

### LIB-P0-01 - Add component selection route state

Target:

- Component search/recent links can route to a selected component.
- Components tab opens inspector, highlights card, and preserves focus behavior.

Likely files:

- `LibraryOverviewSearch.tsx`
- `RecentComponentCard.tsx`
- `LibraryPageClient.tsx`
- `ComponentLibraryManager.tsx`
- `ComponentInspectorDock.tsx`

Validation:

- Focused test for Overview search result to Components selected item.
- Focused test for direct URL to selected component.
- Existing tab and cache tests still pass.

### LIB-P0-02 - Replace component folder native prompts

Target:

- Folder create/rename/delete use shared dialogs.
- Inline validation and server errors do not close prematurely.

Likely files:

- `ComponentLibraryManager.tsx`
- Shared text-prompt or `ConfirmDialog` primitives if needed.

Validation:

- New `library-folder-actions.test.tsx`.
- Static grep guard for no `window.prompt` / `window.confirm` in primary Library files.

### LIB-P0-03 - Replace Add Component dirty discard native confirm

Target:

- Closing dirty Add Component shows a design-system confirmation.
- Nested popup close order remains predictable.

Likely files:

- `AddComponentModal.tsx`
- Possibly shared `ConfirmDialog` usage.

Validation:

- Add modal dirty-close test.
- Focus return test to Add Component trigger.

### LIB-P0-04 - Fix bulk archive copy

Target:

- Archive confirmation copy accurately describes reversibility.
- Destructive language is reserved for irreversible actions.

Likely files:

- `BulkDestructivePreviewModal.tsx`
- `ComponentLibraryManager.tsx`

Validation:

- Existing `bulk-destructive-preview-modal.test.tsx`.
- Add action-specific copy expectations if missing.

## P1 - Findability And Filters

### LIB-P1-01 - Visible applied filters

Target:

- Applied filters are visible outside the filter popover.
- Users can remove individual filters and clear all.

Likely files:

- `component-facet-filter.tsx`
- `ComponentLibraryManager.tsx`
- Possibly a shared compact chip primitive if one already exists.

Validation:

- DOM tests for chip rendering, remove, clear all, and URL params.

### LIB-P1-02 - Search result continuity

Target:

- Component results preserve selection.
- Template results continue to open editor.
- Empty/no-results states remain clear.

Likely files:

- `LibraryOverviewSearch.tsx`
- `library-overview.test.tsx`
- New focused navigation test.

Validation:

- Keyboard Enter, click, Escape, and route semantics tests.

### LIB-P1-03 - Result count and scope clarity

Target:

- Components view communicates result count, active scope, and active filters in one compact strip.

Likely files:

- `ComponentLibraryManager.tsx`
- `BulkActionToolbar.tsx` if selected count overlaps.

Validation:

- DOM tests for filtered and unfiltered counts.

## P2 - Source Trust At Decision Points

### LIB-P2-01 - Trust chips on overview and recent cards

Target:

- Recent components show pricing date/freshness, confidence, and source/supplier where data exists.

Likely files:

- `RecentComponentCard.tsx`
- `LibraryOverview.tsx`
- `getLibraryOverview()` response mapping if data is not already present.

Validation:

- `library-overview.test.tsx` expectations for metadata and missing-data fallback.

### LIB-P2-02 - Template trust summary

Target:

- Template gallery/preview/editor surfaces summarize source freshness/confidence for component-backed rows.

Likely files:

- `TemplateGallery.tsx`
- `TemplatePreviewDock.tsx`
- `TemplateEditorSheet.tsx`
- Repository mappings only if needed.

Validation:

- `template-gallery.test.tsx`
- `template-editor.test.tsx`

### LIB-P2-03 - Normalize create/edit source fields

Target:

- Add and Edit use consistent confidence/source/freshness language and validation.

Likely files:

- `AddComponentModal.tsx`
- `EditComponentDrawer.tsx`
- Shared field helpers if duplication becomes meaningful.

Validation:

- Add/edit payload tests.
- Error display tests.

## P3 - Add Component Flow Split

### LIB-P3-01 - Quick-add default path

Target:

- Add Component opens in a short quick-add mode.
- Advanced details are progressive and do not block common saves.

Likely files:

- `AddComponentModal.tsx`
- Potential internal subcomponents extracted from the large modal.

Validation:

- Split tests by form area instead of extending the current mega-test.

### LIB-P3-02 - Advanced catalog record mode

Target:

- Variants, cost entries, attachments, measurements, activity, and lifecycle remain available.
- Mode switch preserves data safely.

Likely files:

- `AddComponentModal.tsx`
- Extracted form sections under `component-library-manager/`.

Validation:

- Tests for variant tab switching, cost entries, folder picker, submit payload, and failure recovery.

## P4 - Templates And Insertion Clarity

### LIB-P4-01 - Explicit insert target

Target:

- Insert picker displays or allows selecting project, estimate, and target group/area.

Likely files:

- `InsertIntoEstimatePicker.tsx`
- Insert target resolution helpers/actions if needed.

Validation:

- New `library-template-insert-picker.test.tsx`.

### LIB-P4-02 - Scalable template move control

Target:

- Template move uses a combobox/select for existing groups plus create-new.

Likely files:

- `TemplatesBrowseManager.tsx`
- Shared dropdown/select primitive.

Validation:

- `template-gallery.test.tsx` move flow update.

## P5 - Dense Maintenance And Browser-Proven Polish

### LIB-P5-01 - Component table/list mode

Target:

- Catalog stewards can scan components by name, folder, supplier, brand, cost, source, pricing date, confidence, lifecycle, usage, and actions.

Likely files:

- `ComponentLibraryManager.tsx`
- New compact row/list subcomponents.

Validation:

- DOM tests for toggle, sort, selection, and action parity.
- Browser proof for sticky columns/headers only if implemented.

### LIB-P5-02 - Browser verification pass

Target:

- Prove real viewport behavior only after layout/overlay implementation changes.

Scenarios:

- Desktop and mobile Library overview.
- Component select from Overview to inspector.
- Add Component with nested popups and dirty close confirmation.
- Component folder create/rename/delete.
- Template insert picker with target disclosure.
- Keyboard-only top tasks.

Validation:

- Playwright/manual proof only for browser-only claims.

## Phase 0 Contract Lock Addendum

The hardening pass adds a prerequisite before `P0` implementation work:

### LIB-P0A-01 - Route, payload, and cache contracts

Target:

- Lock `component=<id>` and `template=<id>` behavior, invalid-param recovery,
  overview payload additions, insert target re-resolution, and mutation cache
  invalidation.

Validation:

- Route-state tests for valid, invalid, deleted, and permission-denied selected
  objects.
- Cache tests that include workspace identity and mutation fanout.
- Insert target tests that prove stale targets cannot mutate the wrong estimate.

### LIB-P0A-02 - Security and data-exposure contracts

Target:

- Lock actor capability, object-level authorization, RLS expectations,
  cross-workspace IDOR behavior, public/shared redaction, and workspace-switch
  cache behavior.

Validation:

- Viewer/editor/admin/public/unauthenticated test cases.
- Cross-workspace component/folder/template/estimate/project/file ID tests.
- Public/shared route assertions that source URLs, internal notes, confidence
  labels, and workspace-only price history are redacted.

### LIB-P0A-03 - Performance, network, and concurrency contracts

Target:

- Lock large-list budgets, server/index fallback thresholds, slow/failing
  network states, out-of-order response handling, and concurrent edit behavior.

Validation:

- 500-row dense-mode budget or documented fallback.
- Slow search response cannot overwrite newer search/filter intent.
- Concurrent edit/delete/insert cases return conflict or refetch states.

## Phase Gate Matrix

| Gate | Required Before Merge |
| --- | --- |
| P0A | Contracts and targeted security/route/cache tests exist or are explicitly scoped. |
| P0 | No remaining native prompt/confirm in primary Library-owned flows touched by the phase; focus/error behavior tested. |
| P1 | Overview search opens exact item, invalid selected params fail safely, and context is preserved. |
| P2 | Trust metadata renders in card/row/inspector/template decision points with private/public exposure rules. |
| P3 | Quick Add validates required fields, preserves data on failure, blocks read-only actors, and uses app-owned discard confirmation. |
| P4 | Template preview names target, dependency health, stale/missing links, and partial failure recovery. |
| P5 | Dense mode meets performance/accessibility budget or uses the documented fallback. |
| Final | `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` has pass/skipped-risk entries and no no-go release condition remains. |
