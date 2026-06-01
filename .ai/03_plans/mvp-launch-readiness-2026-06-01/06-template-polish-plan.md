# Template Polish Plan

## Fourth-Pass Closed Beta Reframe - 2026-06-02

Closed beta needs enough templates to prove value, not a complete template marketplace or admin suite.

Beta criteria:

- Template preview works.
- Template insert works without corrupting estimate structure.
- Seed templates demonstrate a realistic path to first estimate value.
- Full template admin CRUD, marketplace behavior, and bulk management are deferred unless already trivial.
- Investor demo should use one polished template path end to end.

## Third-Pass Launch Audit

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. Templates are launch-visible only if discovery, preview, insertion feedback, and seed quality are understandable to a first-time estimator.

| Requirement | Affected files | Required path | Tests | Manual QA | Demo implication |
| --- | --- | --- | --- | --- | --- |
| Data source verification | `TemplatesPageClient`, template repositories/actions, template sidebar | Document whether templates come from seeded/local/Supabase data; no hardcoded demo-only assumptions in UI copy. | Repository/action tests. | Compare page and sidebar template lists. | Avoids fake-feature impression. |
| Preview UX | template card/sidebar preview components | Show section count, row count, trade/category scope, expected insertion target, and pricing assumptions. | DOM preview test. | Preview before insert. | Investor sees reusable estimating structure. |
| Insertion feedback | estimate sheet insert/drop handlers | Confirm rows inserted, target group visible, undo/Activity state clear where available. | Template insertion tests. | Insert into group, area, empty estimate. | Prevents silent action confusion. |
| Empty/loading/error states | templates route loading/error/page | Concrete copy: no templates, retry, clear filters, create/import later if deferred. | Render tests. | Force no seeded templates. | First-run credibility. |
| Seed/template audit | fixtures/helpers | Trade-realistic names, no placeholder costs, consistent units, plausible quantities. | Fixture validation. | Demo template scan. | Bad templates damage domain trust. |
| Accessibility | cards/buttons/drop zones | Named buttons, focus states, keyboard path for preview/insert. | Role/name tests. | Keyboard-only browse/insert. | Production polish. |

Templates are estimate-structure bundles, not cost-library rows. Do not create duplicate seed migrations.

## Current Evidence

| Area | Evidence |
| --- | --- |
| Route | `src/app/workshop/templates/page.tsx:6` loads `getCurrentWorkspaceEstimateTemplates()`. |
| Client | `TemplatesPageClient.tsx:10` renders `TemplateLibraryManager`. |
| Manager state | `searchQuery` at `TemplateLibraryManager.tsx:58`, `expandedNodeIds` at `TemplateLibraryManager.tsx:157`, `selectedTemplateNodeId` at `TemplateLibraryManager.tsx:299`. |
| Search | `templateMatchesSheetQuery` matches name, description, category, and node names at `TemplateLibraryManager.tsx:34`. |
| Empty state | Custom empty block at `TemplateLibraryManager.tsx:130`; tree empty state at `TemplateLibraryManager.tsx:286`. |
| No create action | `HeaderIconToolbar addActions={[]}` at `TemplateLibraryManager.tsx:87` and `:196`. |
| Persisted-first source | Repository persisted template path at `component-library-repository.ts:700`; fallback path at `component-library-repository.ts:717` and `:503`. |
| Existing migration/seed | `20260522091621_component_library_templates.sql:4` creates tables; seed starts at `:425`; copy RPC starts at `:207`. |
| Insert into estimate | `EstimateSheetContent.tsx:3759` calls action; `actions.ts:1645` calls `insert_estimate_template_into_estimate_with_history`. |

## Data Source Decision

- Current production direction is Supabase-backed templates with static fallback only when persisted tables are unavailable.
- Do not add another seed migration for the current default templates.
- Add tests that distinguish "table exists but empty" from "table missing", because fallback should not silently mask an empty configured workspace if product expects no templates.

## Preview UI Contract

Add a details panel or inline expandable preview inside `TemplateLibraryManager`:

| Field | Source | Display |
| --- | --- | --- |
| Template name | `EstimateTemplate.name` | Header. |
| Description | `EstimateTemplate.description` | One or two lines, truncated with full text in details. |
| Category | `EstimateTemplate.category` | Metadata line. |
| Summary | `summarizeEstimateTemplate(template)` | Groups, areas, rows, total. |
| Structure | `template.nodes` | Compact tree preview; max depth as data provides. |
| Row samples | first N row items from nodes | Material, qty, unit, item cost, misc if present. |

No create/edit/delete/import controls in MVP.

## Empty/Loading/Error Contract

| State | Copy | Component |
| --- | --- | --- |
| Loading | Keep route `loading.tsx` skeleton. | Existing route loading. |
| Route error | Add `/workshop/templates/error.tsx` using `WorkshopRouteErrorState`. | New file in ticket TPL-001. |
| No templates | "No templates in this workspace yet." | Shared `EmptyState`. |
| No matches | `No templates match "<query>".` | Shared `EmptyState`. |
| Empty category | "No templates in this category yet." | Shared `EmptyState`. |

## Insertion Feedback Contract

Template insertion happens inside estimate workspace, not the standalone templates route. Keep insertion flow in `EstimateSheetContent`:

- On submit, show pending state on the actual insert control.
- On success, refresh tree and select inserted parent/first area if existing behavior supports it.
- On error, show a concise inline error and do not duplicate rows.
- History must be written by `insert_estimate_template_into_estimate_with_history`.

## Tickets

| Ticket | Implementation details | Acceptance criteria | Tests | Rollback |
| --- | --- | --- | --- | --- |
| TPL-001 | Add preview/details UI, shared empty states, `/workshop/templates/error.tsx`, persisted/fallback tests. | Templates route shows useful structure without authoring scope; route states are consistent. | `template-library-manager-ui.test.tsx`, route error test, repository tests. | Revert preview/details and error boundary; current view-only list remains. |
| TPL-001 | Improve estimate-workspace template insertion feedback and error handling. | Insert action gives pending/success/error feedback and no duplicate inserts. | `estimate-node-reorder-action.test.ts`, DOM insertion smoke. | Revert UI feedback; RPC remains unchanged. |

## Visual QA

- Preview panel does not create nested cards.
- Template totals use tabular numerals and fit in narrow columns.
- Long template names truncate.
- Empty states align with library route.
- Tree and sheet search states do not fight each other.
