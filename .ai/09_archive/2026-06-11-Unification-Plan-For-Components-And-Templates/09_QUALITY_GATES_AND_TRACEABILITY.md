# 09 — Quality Gates & Traceability

This document is the plan-level proof harness. It prevents future implementation from treating the unification as "just move two pages together." The work is ready only when each requirement below is implemented, verified through the named evidence, and still aligned with `DESIGN.md` plus the reusable UI library at `http://localhost:6006/`.

## Requirement traceability

| ID | Requirement | Source | Implementation evidence required |
|---|---|---|---|
| R1 | `/workshop/library` is the single reusable-content home with Overview, Components, and Templates routes; `/workshop/templates` redirects. | User request, `00_INDEX.md`, `02_IA_AND_ROUTING.md` | Route smoke, redirect assertion, sidebar active-state proof, grep showing no stale live references except redirect. |
| R2 | Overview is a real work surface: cross-library search, recents, creates, and health line, not a marketing dashboard. | Philip decision in `01_DESIGN_BRIEF.md`, Library audit P0/P1 | `getLibraryOverview()` test, Storybook/static fixture review, authenticated browser smoke for deep links and empty state. |
| R3 | Components tab closes Library audit gaps: left tree, usable filters, neutral add action, lifecycle badges, detail inspector, no inert controls. | Library audit `06_IMPROVEMENT_RECOMMENDATIONS.md`, `03_SCREEN_SPECS.md` | Vitest DOM coverage for search/filter/inspector/focus return, design-system lint, browser screenshot, no visible no-op controls. |
| R4 | Templates browse closes Templates audit gaps: selection, preview dock, Open, Insert into estimate, CRUD menus, dynamic import, singular copy, row-content search. | Templates audit `04-audit-findings.md`, `07-implementation-readiness-plan.md` | Template gallery tests, insert handoff e2e, zero RSC round-trips for tree/search after load, copy tests for singular/plural counts. |
| R5 | Template editor is estimate-style but structurally differentiated as template mode. | `01_DESIGN_BRIEF.md` D5/D6, `03_SCREEN_SPECS.md` | Estimate regression suite, editor mutation tests, 5/5 hallway-or-owner orientation check, visual screenshot showing breadcrumb + `TEMPLATE` chip. |
| R6 | The implementation uses the shared reusable UI component library and Storybook-reviewed primitives before local markup. | User request, `DESIGN.md`, `04_COMPONENT_REUSE_MAP.md` | Storybook inspection checklist completed, no duplicated button/input/dropdown/panel patterns, `bun run storybook:check-components` if stories change. |
| R7 | Product UI stays in the Archestimator app register: SF Pro, <=12px, 3px radius, zero tracking, neutral palette, semantic color only. | `DESIGN.md`, Impeccable product register | `bun run lint:design-system`, contrast check, responsive screenshots, no app/workshop orange except explicitly approved legacy surfaces. |
| R8 | Data layer remains migration-free unless live evidence contradicts the verified schema. | `05_DATA_AND_SERVER_ACTIONS.md` | Type/schema recheck before Phase 3, no migration added without a plan update and owner review. |
| R9 | Blast radius is examined before editing shared symbols and after each phase. | AGENTS.md, GitNexus/code-review-graph rules, `08_IMPLEMENTATION_HANDBOOK.md` | Per-symbol `gitnexus_impact` or code-review-graph equivalent before edits, `gitnexus_detect_changes()`/graph review before commit, high/critical findings recorded. |
| R10 | Accessibility, performance, and UltraQA scenarios are executable and fail the work on objective evidence. | Library audit docs 12/14, Templates audit scorecard, `06_PHASED_IMPLEMENTATION.md` | Keyboard/focus/a11y tree evidence, Web Vitals/INP trace, adversarial scenario matrix run after implementation, cleanup proof. |
| R11 | `.ai` state is synchronized after implementation and source audits are retired only when their findings are actually closed. | `.ai` operating protocol, `06_PHASED_IMPLEMENTATION.md` Phase 4 | `.ai/10_state/current-state.md` and `decisions.md` updated with evidence; source audit folders marked superseded only by implemented proof. |

## Source-audit closure matrix

| Source finding | Unification response | Proof needed |
|---|---|---|
| Library P0: authenticated visual/performance/a11y baseline missing | Phase 0 starts with baseline capture and every phase re-captures affected surfaces. | Screenshots, console/network logs, accessibility snapshots, trace artifacts. |
| Library P1-1: no-op Filter/Group controls | Components tab wires filter facets or hides unwired actions; Group is removed from v1. | Browser check plus component test proving no inert visible action. |
| Library P1-2: orange Add action violates product register | Shared `HeaderIconToolbar` add styling becomes neutral for workshop UI. | Design-system lint and visual screenshot. |
| Library P1-3: no detail/inspection surface | `ComponentInspectorDock` with price history, confidence, lifecycle, and used-in counts. | Inspector open/close/focus tests and selected-card screenshot. |
| Library P1-4/P1-6: lifecycle and task-backed facets unclear | Lifecycle badge/filter and freshness/confidence/supplier/brand facets are first-class. | Filter state tests, live-region result count, no-results recovery. |
| Templates critical: browse purpose unclear | Templates browse becomes explicit selection + preview + Open/Insert flow. | User can inspect and insert without guessing where to go next. |
| Templates high: cards look inert | Template rows are selectable and keyboard-operable; Open is explicit. | Pointer and keyboard tests. |
| Templates audit: search ignores row content | Search index includes row material, description, supplier, discipline, category. | Search unit tests against seeded row data. |
| Templates audit: duplicate insertion pathways risk | Browse uses existing `insertEstimateTemplateIntoEstimate()` path. | E2E proves the existing server-action/RPC path remains the insertion path. |
| Templates audit: dynamic import missing | Templates manager is dynamically imported like the components manager. | Bundle/chunk diff and route smoke. |

## Storybook and reusable UI gate

Before creating or extending any UI in Phases 0-4, the implementer must inspect the matching Storybook stories at `http://localhost:6006/` and record which primitive was used or why it could not fit. The 2026-06-11 check proved Storybook responds with HTTP 200 and exposes 524 entries through `index.json`.

Required story targets:

| Need | Storybook title / story | Production module |
|---|---|---|
| Primary, ghost, destructive, disabled, loading buttons | `Actions/Button` | `src/components/ui/button.tsx` |
| Icon-only and icon+label toolbar actions | `Actions/IconButton`, `Layout/Toolbar`, `Trees/TreePanelHeader` | `src/components/ui/icon-button.tsx`, `toolbar-icon-button.tsx`, `tree-panel-header.tsx` |
| Page file-folder tabs | `Navigation/TabStrip` | `src/components/ui/tab-strip.tsx` |
| Dense search fields | `Forms/SearchInput` | `src/components/ui/search-input.tsx` |
| Selects, menus, tree CRUD menus | `Menus/DropdownSelect`, `Menus/DropdownMenu`, `Menus/ContextMenu` `Tree Crud Pattern`, `Menus/ActionMenu` | `dropdown-select.tsx`, `dropdown-menu.tsx`, `context-menu.tsx`, `action-menu.tsx` |
| Filters and popovers | `Overlays/Popover` `Filter` | `src/components/ui/overlays/popover.tsx` |
| Inspector/drawer/sheet/modal surfaces | `Overlays/SheetDrawer`, `Overlays/AppModal`, `Overlays/Modal`, `Overlays/ConfirmDialog` | `sheet-drawer.tsx`, `modal.tsx`, `confirm-dialog.tsx` |
| Data rows and tables | `Data Display/DataTable`, `Data Display/EditableCell`, `Domain/Workshop/EstimateRow`, `Domain/Workshop/EstimateCell` | `data-table.tsx`, `estimate-cell.tsx`, estimate-row story fixtures |
| Empty/loading/status states | `Feedback/EmptyState`, `Feedback/Skeleton`, `Feedback/Alert`, `Status/StatusBadge`, `Status/ConfidenceIndicator` | matching `src/components/ui/*` modules |
| Component-library visual grammar | `Domain/Workshop/ComponentLibraryCard`, `Blocks/ComponentLibraryBlock`, `Domain workshop/Compositions and Static Blocks` | shared fixtures plus route implementation components |

Rules:

1. Do not create a route-local button, input, select, menu, card shell, drawer, modal, tab, or empty state if the reusable primitive can be extended.
2. If a new primitive is required, add it under `src/components/ui/`, barrel-export it from `src/components/ui/index.tsx`, add a Storybook story, and run `bun run storybook:check-components`.
3. Storybook is a review surface, not production migration approval. Static stories must stay provider-free and obey `tests/vitest/storybook-provider-boundary.test.ts`.
4. When implementation changes a shared primitive, update or add a story before route adoption so Philip can inspect the behavior in isolation.

## Blast-radius and effectivity matrix

| Phase | Shared surface | Expected blast radius | Pre-edit gate | Post-edit effectivity proof |
|---|---|---|---|---|
| P0 | `WorkshopPageShell`, `MainSidebar`, App Router library/templates routes | Moderate: all workshop pages share shell/nav assumptions. | Impact on `WorkshopPageShell` and `MainSidebar`; route reference grep; graph stats freshness check. | Route e2e for library/templates, old redirect, rail highlight, no duplicate shell chrome. |
| P1 | `ComponentLibraryManager`, `HeaderIconToolbar`, `SearchInput`, `FilterPopover`, inspector dock | Moderate/high: shared toolbar primitive can affect estimate/library surfaces. | Impact on `HeaderIconToolbar`, `ComponentLibraryManager`, `FilterPopover`; Storybook review for toolbar/popover. | Component tests, visual compare for estimate header toolbar, no orange regression, no no-op actions. |
| P2 | Templates browse manager, insert picker, component-library actions | Moderate: insertion path touches estimate workflow via existing action. | Impact on `insertEstimateTemplateIntoEstimate`, template actions, old manager deletion surface. | Browse insert e2e, server-action validation tests, zero stale `/workshop/templates` references. |
| P2.5 | Overview fetch, template mapping, health facets | Low/moderate: new query shape but index route changes default landing. | Query cost review; `EstimateTemplate` type mapping impact. | Overview deep-link tests, LCP trace, empty workspace proof. |
| P3.0 | `EstimateSheetContent` extraction and row/cell primitives | Critical: estimate editing is core product surface. | Mandatory per-symbol impact before extraction; separate review; no opportunistic behavior changes. | Estimate page pixel/behavior parity, full estimate vitest/e2e suite, visual diff, no changed totals/editing behavior. |
| P3.1-3.5 | Template editor route, node/row mutations, drag/drop, `EstimateRightSidebar` re-host | High: new mutation surface and shared dock/drag mechanics. | RLS/RPC review, hierarchy validation review, impact on drag store/sidebar/query keys. | CRUD reload proof, optimistic rollback tests, keyboard alternatives for DnD, no self-insert/composition footguns. |
| P4 | Responsive drawers, a11y/performance polish, `.ai` state sync | Moderate: cross-viewport layout and docs truth. | Visual/a11y baseline re-read; no unrelated cleanup. | Desktop/tablet/mobile screenshots, a11y tree snapshots, Web Vitals trace, `.ai` state updated. |

Effectivity rule: a phase is effective only if the user-visible audit gap closes in the browser, the relevant tests fail before/fail after or otherwise prove the behavior, and no shared primitive regresses in Storybook.

## Final completion gate

Implementation is not complete until all of these pass:

1. Every R-ID in this document has direct evidence.
2. `bun run validate` passes, or any pre-existing failure is documented with unrelated proof.
3. `bun run storybook:check-components` and `bun run storybook:check-boundary` pass if any UI primitive/story changes.
4. `bun run lint:design-system` passes with no app/workshop typography/radius/color violations.
5. Browser QA covers Overview, Components, Templates browse, Template editor, redirect, error/loading/empty states, and responsive drawer behavior.
6. UltraQA/adversarial scenarios from the source audits run against the implemented flows with cleanup evidence.
7. High/critical blast-radius findings are resolved or explicitly accepted in a plan update before merge.
8. `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` reflect what shipped and what remains deferred.
