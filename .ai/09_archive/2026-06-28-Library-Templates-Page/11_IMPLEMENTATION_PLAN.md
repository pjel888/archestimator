# Implementation Plan

Approved scope: conservative track. Do not implement full in-place structural editing inside `/workshop/library/templates`; that is a deferred future track recorded in `07_RISKS_DECISIONS_AND_ALTERNATIVES.md`.

Detailed implementation-unit packets and proof-contract rows live in `12_IMPLEMENTATION_UNITS_AND_PROOF_CONTRACT.md`; this file remains the phase sequence.

## Phase 0 - Lock Scope And Characterization

Ultragoal contract:

- Goal: prove current browse/editor/sidebar behavior before edits.
- Success: focused tests cover current tabs, cache partitioning, browse selection, editor authz, and route layout assumptions.
- Stop: proceed only when current behavior is characterized or explicit gaps are documented.

Tasks:

1. Add/extend characterization tests for current `/workshop/library/templates` route state.
2. Add a test proving current estimate right sidebar still renders `Library / Project / Templates` on estimate routes.
3. Add a failing test for template-focused right dock `visibleTabs=["components","project"]` that proves no `Templates` tab appears and stored `templates` prefs clamp.
4. Add viewer/read-only UI characterization for template editor if missing.

Validation:

- `bunx vitest run tests/vitest/library-tabs-layout.test.tsx tests/vitest/library-templates-cache.test.tsx tests/vitest/template-editor.test.tsx tests/vitest/template-editor-actions-authz.test.ts --maxWorkers=1`
- `git diff --check`

## Phase 1 - Configurable Right Dock Tabs

Ultragoal contract:

- Goal: make `EstimateRightSidebar` host-configurable without changing estimate route behavior.
- Success: estimate route keeps three tabs; template-focused hosts can show exactly `Library / Project`.
- Stop: no hidden template-tree work renders when `templates` is excluded.

Tasks:

1. Add `visibleTabs`, `initialActiveTab`, and optional storage-scope support to `EstimateRightSidebar`.
2. Clamp tab changes and stored/account prefs to visible tabs.
3. Guard template-specific toolbar/tree/dialog/render effects when `templates` is not visible.
4. Add tests for estimate route default tabs and template-focused two-tab contract.

Validation:

- `bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx tests/vitest/template-editor.test.tsx --maxWorkers=1`
- `bun run type-check`
- `git diff --check`

## Phase 2 - Template Workbench Browse Route

Ultragoal contract:

- Goal: transition `/workshop/library/templates` to an estimate-family workbench without collapsing full editor route.
- Success: desktop route has template left rail, dominant selected-template center, and right dock without Templates tab.
- Stop: browse/manage actions still work; detail editor remains reachable.

Tasks:

1. Keep `TemplatesBrowsePageClient` query seeding and cache partitioning.
2. Reshape `TemplatesBrowseManager` center into:
   - no-selection state,
   - category state,
   - selected-template state.
3. Replace selected-template preview dock with source dock only after Phase 1.
4. Keep `Open editor` as the primary full-edit action to `[templateId]`.
5. Make right dock lazy-load on user intent.
6. Implement Project tab as a required visible tab with a project selector when authorized projects exist, or an unavailable state when none exist. Load project-scoped data only after selection.
7. Keep browse selection/dialog/status state reducer-local unless a new cross-route persistence requirement is approved.

Validation:

- `bunx vitest run tests/vitest/template-gallery.test.tsx tests/vitest/library-template-insert-picker.test.tsx tests/vitest/library-templates-cache.test.tsx tests/vitest/library-templates-workbench-transition.test.tsx --maxWorkers=1`
- `bun run type-check`
- scoped ESLint for touched files
- `git diff --check`

## Phase 3 - Template Editor Capability And Integrity Hardening

Ultragoal contract:

- Goal: prevent the editor route from looking editable to users who cannot mutate templates.
- Success: viewers can browse/preview/read; editors/admins can mutate; server actions still deny unauthorized direct calls.
- Stop: capability state is explicit in route props and tests cover UI plus server authz.

Tasks:

1. Resolve a `canEditTemplate` capability in `[templateId]/page.tsx`.
2. Pass capability into `TemplateEditorClient`.
3. Disable/hide node/row/source-dock mutation affordances for viewers.
4. Keep server action `is_workspace_editor` checks.
5. If integrated editor track is chosen, add conflict/transaction plan before expanding mutation surface.

Validation:

- `bunx vitest run tests/vitest/template-editor.test.tsx tests/vitest/template-editor-actions-authz.test.ts --maxWorkers=1`
- `bun run type-check`
- `git diff --check`

## Phase 4 - Performance, Accessibility, And Route Transition Guard

Ultragoal contract:

- Goal: prove the transition did not add route, render, or accessibility regressions.
- Success: inactive trees do not render, route state is stable, tab semantics pass DOM assertions.
- Stop: browser proof only if route/provider/mobile claims require it.

Tasks:

1. Add DOM a11y assertions for left rail, right dock tabs, selected center, dialogs, and focus return.
2. Extend right-sidebar render perf test for hidden `templates`.
3. Extend route-transition measurement only if implementation changes navigation behavior.
4. Run gated Playwright only if implementation changes provider insert, mobile drawer, or real route transitions.

Validation:

- Targeted Vitest matrix from `06_TEST_QA_AND_ULTRAQA_PLAN.md`
- `bun run type-check`
- scoped ESLint
- `git diff --check`
- Optional gated Playwright with documented claim.

## Parallelization Plan

Ultrawork lanes for implementation:

- Lane A: right-dock tab configurability and state clamp.
- Lane B: templates browse/workbench center UI plus Project tab selector/unavailable state.
- Lane C: template editor capability/read-only gating.
- Lane D: test/perf/a11y matrix.

Keep Lane A first if possible because Lane B and C both depend on configurable dock behavior.

## Migration Posture

No Supabase migration is part of this implementation plan. If a future integrated-editor phase adds revision guards or transactional copy semantics, that becomes a separate data-integrity slice with migration/RPC proof.
