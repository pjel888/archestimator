# 01 - Current State Audit

## Overall Assessment

The Library architecture is already directionally strong. It has a unified route family, a distinct overview/components/templates split, useful route-level loading/error states, a strong component inspector, a reusable template browse/editor structure, and a growing test suite.

The weak points are less about missing features and more about continuity, consistency, and decision confidence. Users can find a component but not land on it, see trust data in one place but not another, and encounter both polished design-system dialogs and native browser prompts in the same product area.

## Scorecard

| Area | Score | Rationale |
| --- | ---: | --- |
| Information architecture | 4 / 5 | Unified Library hub and route tabs are clear. Template editor hides route tabs appropriately. |
| Findability | 3 / 5 | Search, folder tree, facets, and recent lists exist, but exact component selection is lost from Overview. |
| Source trust | 3 / 5 | Component cards and inspector expose useful source metadata, but overview and template decision points are lighter. |
| Overlay consistency | 2 / 5 | Strong shared primitives exist, but component folder actions and draft discard still use native prompts/confirms. |
| Keyboard/accessibility posture | 3 / 5 | Tabs, comboboxes, trees, and primitives have coverage, but Library-specific top-task keyboard journeys need more tests. |
| Maintenance scalability | 3 / 5 | Cards and folder branches work now; large libraries will need a denser table/list maintenance mode. |
| Verification readiness | 4 / 5 | Good focused test inventory exists. Future changes need smaller tests instead of extending mega-tests. |

## Hardening Audit Addendum

The initial audit was strong on UI/product issues and light on implementation
control issues. The hardening pass adds these highest-severity planning gaps:

| Severity | Gap | Risk | Closure |
| --- | --- | --- | --- |
| High | Actor/RLS/authz matrix missing. | Viewers, public links, or cross-workspace users could get unsafe access. | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` |
| High | Public/private field exposure undefined. | Source URLs, internal notes, confidence labels, or price history could leak. | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` |
| High | Route-state and invalid-param behavior underspecified. | Deep links could lose context or leak object existence. | `13-DATA-CONTRACTS-ROUTE-CACHE.md` |
| High | Insert target re-resolution underspecified. | A stale picker could mutate the wrong estimate/project. | `13-DATA-CONTRACTS-ROUTE-CACHE.md`, `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` |
| High | Cache invalidation not mapped by mutation. | Overview/components/templates/estimate insert state could drift. | `13-DATA-CONTRACTS-ROUTE-CACHE.md` |
| Medium | Large-list behavior lacks budgets. | Dense mode may be attractive but slow at beta scale. | `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` |
| Medium | Input/import/export/file safety deferred without guardrails. | Later catalog import/export could require rework or unsafe defaults. | `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` |
| Medium | Rollback and no-go gates too implicit. | Implementation could ship broad UI changes without a safe backout. | `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md`, `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` |

## Route and Component Map

| Surface | Current structure | Notes |
| --- | --- | --- |
| Overview | `src/app/workshop/library/page.tsx`, `src/components/workshop/library/overview/*` | Fetches `getLibraryOverview()`, shows search, recent components/templates, health links, New Template modal, and Add Component deep link. |
| Components | `src/app/workshop/library/components/page.tsx`, `src/components/workshop/LibraryPageClient.tsx`, `src/components/workshop/component-library-manager/*` | Seeds TanStack Query, renders folder tree, catalogue branches/cards, filters, inspector, Add Component modal, Edit drawer, bulk archive modal. |
| Templates browse | `src/app/workshop/library/templates/page.tsx`, `src/components/workshop/library/templates-browse/*` | Tree/gallery/preview dock with New Template modal, Insert Into Estimate picker, and design-system text/destructive confirmations. |
| Template editor | `src/app/workshop/library/templates/[templateId]/page.tsx`, `src/components/workshop/library/template-editor/*` | Editor shell with structure tree, editable sheet, component library dock, and ConfirmDialog-backed add/rename/delete actions. |
| Shared overlays | `src/components/ui/overlays/*`, `src/components/ui/modal.tsx`, `src/components/ui/dropdown-popup.tsx` | Good primitive base. Library should lean on these instead of one-off browser prompts. |

## What Works Well

- The unified Library route family matches the 2026-06-11 project decision to keep Library as a single hub.
- `LibraryTabsLayoutClient` and `LibraryTabPanel` establish route-backed tab semantics and panel relationships.
- Overview has a useful cross-library role: search, create actions, recent items, and health deep links.
- Components has a strong source-trust foundation: supplier, brand, source, pricing date, confidence, lifecycle, usage, and price history are available on cards and in the inspector.
- Templates browse has a coherent tree/gallery/preview layout and has already moved rename/move/delete prompts into design-system dialogs.
- Template editor has already replaced native add/rename/delete prompts with `ConfirmDialog`.
- Existing tests cover overview behavior, tab semantics, caches, folder tree selection, template browse, template editor, and shared overlay primitives.

## P1 Findings

### P1.1 - Component search loses the selected item

Evidence:

- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx` comments note component results deep-link only to the Components tab.
- `src/components/workshop/library/overview/RecentComponentCard.tsx` sends component recents to the generic Components route.

Impact:

An estimator can identify the exact component from Overview, then lands in the catalogue without the selected component opened or highlighted. This creates repeated search work and breaks the "find cost/source now" path.

Direction:

Add URL-driven component selection, such as `/workshop/library/components?component=<id>` or `?inspect=<id>`, open the inspector automatically, scroll/highlight the card, and preserve search/folder/filter context where possible.

### P1.2 - Add Component is overloaded

Evidence:

- `src/components/workshop/component-library-manager/AddComponentModal.tsx` is 2,359 lines and combines identity, foldering, image, variants, cost baselines, cost entries, unit conversion, measurements, attachments, lifecycle, activity, and validation.
- `src/components/workshop/library/EditComponentDrawer.tsx` is much smaller and has a simpler edit model.

Impact:

The modal is powerful for catalog stewardship but heavy for quick beta capture. The user must operate a large modal even when they only need a reusable component with name, folder, unit, cost, date, source, and confidence.

Direction:

Split the experience into quick-add and advanced catalog-record modes. Keep quick-add short and make variants, attachments, measurements, activity, and secondary evidence progressive.

### P1.3 - Template insertion target is under-specified

Evidence:

- `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx` asks for project and estimate, then resolves the insertion target during submit.
- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` uses fallback target logic.

Impact:

Inserting a template is a high-trust action. Users should know exactly where rows will land before commit.

Direction:

Expose Project, Estimate, and target group/area. If full target selection is deferred, at least show "Will insert under: <group>" and add an "Open estimate" success action.

## P2 Findings

### P2.1 - Native prompts remain in Library-owned flows

Evidence:

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` uses `window.prompt` for folder create/rename and `window.confirm` for folder delete.
- `src/components/workshop/component-library-manager/AddComponentModal.tsx` uses `window.confirm` for draft discard.
- Template browse and template editor already use design-system dialogs for similar tasks.

Impact:

Native prompts break visual consistency, weaken focus control, and make Library feel less finished during beta.

Direction:

Replace these with shared text-prompt and destructive confirmation dialogs. Preserve focus return to the invoking action.

### P2.2 - Trust/source confidence is not visible everywhere decisions happen

Evidence:

- Component cards and inspector expose source metadata.
- Overview recent cards are lighter.
- Template rows and editor rows focus on item, quantity, unit, cost, and total with less source confidence context.

Impact:

Users can reuse stale or low-confidence costs without seeing enough warning at the exact decision point.

Direction:

Add compact trust chips across overview, template preview/editor, and insert decisions: pricing date, confidence, source/supplier, lifecycle, and stale/source-changed indicators.

### P2.3 - Bulk archive copy conflicts

Evidence:

- Component sheet copy describes archive as reversible.
- `BulkDestructivePreviewModal` copy says the action cannot be undone.

Impact:

Conflicting safety copy undermines trust and slows destructive/reversible actions.

Direction:

Make the modal action-specific. For archive, explain that it hides components from insertion and can be restored if that is true. Reserve "cannot be undone" for irreversible deletes.

## P3 Findings

### P3.1 - Template move prompt will not scale

Evidence:

- `TemplatesBrowseManager` uses a text prompt with existing group names listed in the label.

Impact:

This works for a small group set but becomes error-prone once categories grow.

Direction:

Use a combobox/select that supports existing groups and create-new.

### P3.2 - Component catalogue needs dense maintenance mode

Evidence:

- Components are card/branch oriented, with strong metadata but limited table-like comparison.

Impact:

Cards are good for visual selection, but catalog stewards need fast scanning across cost, source, date, lifecycle, folder, supplier, brand, and usage.

Direction:

Add a compact table/list toggle after the route-state and trust work is stable.

## Source-Based Evidence Gaps

- No rendered screenshots were inspected.
- No browser viewport, portal placement, sticky header, drag/drop, or focus-trap claims were verified.
- Future implementation should not claim those behaviors without the browser proof named in `06-QA-AND-VALIDATION-PLAN.md`.
