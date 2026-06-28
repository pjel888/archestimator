# Implementation Units And Proof Contract

## Approved Scope

The approved implementation scope is the conservative track only: a Library Templates workbench plus template editor capability hardening. The integrated editor track is deferred and must not be implemented without a new plan covering conflict, transaction, mobile, and history semantics.

## Implementation Units

### U0 - Characterize Current Behavior

- Requirement IDs: REQ-001, REQ-002, REQ-005, REQ-006, REQ-014.
- Goal: lock current browse/editor/sidebar behavior before changing shared dock code.
- User/system outcome: implementation can prove estimate routes keep their current source dock while template-focused hosts change.
- Scope: tests only; no production behavior change.
- Non-goals: no source UI refactor beyond test harness seams.
- Likely files: `tests/vitest/library-tabs-layout.test.tsx`, `tests/vitest/library-templates-cache.test.tsx`, `tests/vitest/component-library-ui.test.tsx`, `tests/vitest/template-editor.test.tsx`.
- Patterns to follow: existing DOM tests and focused `--maxWorkers=1` route/component matrices.
- Dependencies: none.
- Data/security/performance implications: none beyond proving current cache and tab behavior.
- Detailed scenarios: route keeps parent Library tabs; detail route hides parent tabs; estimate route shows current three-tab dock; stored active tab can currently restore `templates`; viewer/editor current UI behavior documented.
- Verification: focused Vitest matrix plus `git diff --check`.
- Rollback: delete characterization additions if they prove stale/incorrect, but do not remove useful regression locks.
- Stop condition: current behavior is characterized, or gaps are documented as implementation-time discovery.

### U1 - Configurable Right Dock Tabs

- Requirement IDs: REQ-005, REQ-006, REQ-010, REQ-014, REQ-016.
- Goal: make `EstimateRightSidebar` host-configurable without changing default estimate route behavior.
- User/system outcome: template-focused hosts can render exactly `Library` and `Project`; estimate hosts keep `Library`, `Project`, `Templates`.
- Scope: `EstimateRightSidebar`, right-sidebar state hook, preference hydration/persistence, hidden-tree guards, targeted tests.
- Non-goals: no Project selector data model yet; no template editor redesign.
- Likely files: `src/components/workshop/component-library/index.tsx`, `src/components/workshop/component-library/use-estimate-right-sidebar-state.ts`, `tests/vitest/component-library-ui.test.tsx`, `tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx`, new visible-tabs test.
- Patterns to follow: existing `enableReusableProjectSources` guard, `useStoredPreferences` hydration effect, render-profiler test, `TreePanelHeader` tabs.
- Dependencies: U0 recommended first.
- Data/security/performance implications: hidden excluded tabs must not fetch or render; stored/account prefs must be clamped before activation.
- Detailed scenarios: `visibleTabs={["components","project"]}` omits `Templates`; stored `templates` pref falls back to `components`; disabled Project falls back only where `project` is excluded; no templates toolbar/tree/dialog renders when hidden.
- Required clamp points: initial chrome state, host `initialActiveTab`, localStorage prefs, legacy tab key, account prefs, `handleTabChange`, visible-tabs prop changes, and local/account persistence writes.
- Verification: `bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx tests/vitest/estimate-right-sidebar-visible-tabs.test.tsx --maxWorkers=1`, `bun run type-check`, `git diff --check`.
- Rollback: remove template-host prop usage first; default no-prop behavior must remain current.
- Stop condition: default estimate behavior and two-tab template behavior are both proven.

### U2 - Template Workbench Browse Route

- Requirement IDs: REQ-001, REQ-003, REQ-004, REQ-006, REQ-007, REQ-010, REQ-011, REQ-012, REQ-013, REQ-015, REQ-016.
- Goal: reshape `/workshop/library/templates` into the three-zone template workbench.
- User/system outcome: users browse template inventory on the left, inspect selected templates in the center, and use Library/Project sources on the right without entering a recursive Templates dock.
- Scope: `TemplatesBrowsePageClient`, `TemplatesBrowseManager`, `TemplateGallery`, `TemplatePreviewDock` replacement/removal path, source dock host wrapper, project selector/unavailable state.
- Non-goals: no full in-place structural editor; no DB/RLS/RPC work; no new dependency.
- Likely files: `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`, `TemplatesBrowseManager.tsx`, `TemplateGallery.tsx`, `TemplatePreviewDock.tsx`, possible extracted selected-template center component, new project-tab selector support tests.
- Patterns to follow: current browse reducer-local state, `ResizableSidePanel`, `TreePanelHeader`, `LibrarySurfaceVariantProvider`, estimate route proportions from `EstimateWorkspaceClient`.
- Dependencies: U1 before source dock replacement.
- Data/security/performance implications: preserve server-seeded TanStack cache; Project source data loads after explicit project selection only; center remains dominant at desktop widths.
- Detailed scenarios: empty/no selection/category/template selected; `Open editor` primary path; Project tab visible with selector/unavailable state; reusable estimate-source data loads only after authorized project selection; no unauthorized project data; no hidden source-dock first-paint fetch; mobile/tablet fallback.
- Browse dock/cache owner: `TemplatesBrowseManager` owns `dockRequested`, selected project id, and stale-response guards; Library dock data uses `workspaceComponentLibraryLiteQueryKey(workspaceId)` after intent; Project source data uses `{ userId, workspaceId, selectedProjectId }`; dock-only changes invalidate scoped queries rather than broad `router.refresh()`.
- Mobile v1: single-column/read-oriented template list/preview with desktop-required notice for structural editing/source composition unless a drawer/focus-trap implementation is explicitly added.
- Verification: `bunx vitest run tests/vitest/template-gallery.test.tsx tests/vitest/library-template-insert-picker.test.tsx tests/vitest/library-templates-cache.test.tsx tests/vitest/library-templates-workbench-transition.test.tsx --maxWorkers=1`, scoped ESLint, `bun run type-check`, `git diff --check`.
- Rollback: restore current `TemplateGallery` plus `TemplatePreviewDock` center/right composition while keeping U1 safe if it is already proven.
- Stop condition: route state matrix passes and right dock tabs are exactly `Library` and `Project`.

### U3 - Template Editor Capability And Integrity Hardening

- Requirement IDs: REQ-002, REQ-008, REQ-009, REQ-012.
- Goal: make viewer/editor capability explicit in the template editor UI while keeping server actions authoritative.
- User/system outcome: viewers can browse/preview templates without seeing misleading mutation affordances; editors/admins keep mutation controls.
- Scope: `[templateId]/page.tsx`, `TemplateEditorClient`, `use-template-editor` consumers, editor buttons/dialogs/source-dock mutation affordances, authz tests.
- Non-goals: no estimate-grade history/revision system; no transaction RPC conversion unless integrated track is separately approved.
- Likely files: `src/app/workshop/library/templates/[templateId]/page.tsx`, `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`, `src/components/workshop/library/template-editor/use-template-editor.ts`, `src/lib/component-library/template-editor-actions.ts`, editor tests.
- Patterns to follow: estimate route edit capability resolution, existing `is_workspace_editor` action checks, local rollback/error pattern.
- Dependencies: U0; U1 only if dock mutation affordances need visible-tab/capability interplay.
- Data/security/performance implications: UI capability is not security; server actions must still deny direct calls; copy semantics stay snapshot-based.
- Detailed scenarios: viewer opens editor; add/rename/move/delete/insert controls hidden or disabled in `TemplateStructureTree`, `TemplateEditorSheet`, and right source dock; direct server action denial remains; editor user can still mutate; save/error indicators remain truthful.
- Verification: `bunx vitest run tests/vitest/template-editor.test.tsx tests/vitest/template-editor-actions-authz.test.ts --maxWorkers=1`, `bun run type-check`, `git diff --check`.
- Rollback: preserve server action denial; revert only UI hiding logic if tests reveal a capability mismatch.
- Stop condition: capability state is explicit in props and tests cover UI plus direct-call denial.

### U4 - Performance, Accessibility, And Route Transition Guard

- Requirement IDs: REQ-007, REQ-010, REQ-012, REQ-013, REQ-015.
- Goal: prove the workbench transition did not add render, route, or accessibility regressions.
- User/system outcome: dense workspace remains fast, keyboard-accessible, and stable.
- Scope: DOM a11y assertions, hidden-tree render tests, scoped route-transition/browser proof only when implementation changes browser-only behavior.
- Non-goals: no blanket Playwright run for static class/layout work; no hosted/provider proof.
- Likely files: new or extended DOM/perf tests, possibly `e2e/route-transition-performance.spec.ts` only if route behavior changes.
- Patterns to follow: `tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx`, existing route transition scripts, design QA policy in `DESIGN.md`.
- Dependencies: U1-U3.
- Data/security/performance implications: browser proof is required only for changed navigation/provider/mobile/focus claims; otherwise static/DOM proof is sufficient.
- Detailed scenarios: tab/tabpanel linkage; focus return after dialogs; Escape layering; inactive template tree render count zero; no text overlap in compact shell by static DOM assertions where possible.
- Verification: targeted matrix from `06_TEST_QA_AND_ULTRAQA_PLAN.md`, `bun run type-check`, scoped ESLint, `git diff --check`, gated Playwright only with documented claim.
- Rollback: remove or adjust the regressing UI slice and keep characterization tests as guardrails.
- Stop condition: all applicable DOM/perf/type/lint/diff checks pass or skipped browser proof is documented with residual risk.

## Proof Contract

| Proof ID | Requirement IDs | Unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PROOF-001 | REQ-001, REQ-002 | U0 | DOM route/layout | Render library templates route and detail route shells. | Browse route keeps Library tabs; detail editor route hides parent tabs and shows editor chrome. | `library-tabs-layout.test.tsx`, `template-editor.test.tsx` | Focused Vitest command from U0. | Characterization may start red only where current gap is intended to drive implementation. | No temp artifacts. |
| PROOF-002 | REQ-005, REQ-006 | U1 | DOM/component | `visibleTabs=["components","project"]`, stored pref `templates`. | `Templates` absent; active tab clamps to `components`; Project remains visible. | `estimate-right-sidebar-visible-tabs.test.tsx` | U1 command. | Red before U1, green after U1. | Clear test localStorage between cases. |
| PROOF-003 | REQ-010, REQ-013 | U1/U4 | Perf/render | Hidden `templates` tab excluded. | Template tree and toolbar render zero work while hidden. | `perf/estimate-right-sidebar-active-tab-renders.test.tsx` | U1 or U4 command. | Green after hidden-tree guard. | No browser proof unless route behavior changes. |
| PROOF-004 | REQ-003, REQ-004, REQ-007, REQ-015 | U2 | DOM/layout | Empty, no selection, category, selected template, desktop/mobile widths where testable. | Three-zone shell, dominant center, no squeezed mobile three-pane. | `library-templates-workbench-transition.test.tsx` | U2 command. | Red before U2, green after U2. | Browser proof only if drawer/focus behavior is implemented. |
| PROOF-005 | REQ-006, REQ-011 | U2 | Component/data contract | No project selected; authorized project selected; unauthorized/tampered project id. | Project tab shows selector/unavailable first; reusable estimate-source data loads only after authorized selection and uses project-scoped key; unauthorized project data never appears. | New project-tab scope test | U2 command. | Red before U2, green after U2. | Mock authorized projects; do not hit provider. |
| PROOF-006 | REQ-008, REQ-009 | U3 | DOM + server action | Viewer/member and editor/admin contexts. | Viewer mutation affordances hidden/disabled; direct server action fails closed; editors can mutate. | `template-editor.test.tsx`, `template-editor-actions-authz.test.ts` | U3 command. | Existing authz should stay green; UI gating red before U3, green after. | No provider mutation; use existing mocks/fixtures. |
| PROOF-007 | REQ-012 | U2/U4 | DOM/a11y | Context menus, dialogs, tree and dock tabs. | Move/insert/open/rename/duplicate/delete all have keyboard/menu path; focus return and labels present. | Workbench + visible-tabs tests | U4 command. | Green before completion. | No screenshots required unless visual QA requested. |
| PROOF-008 | REQ-013, REQ-014 | U2/U4 | Cache/route | User/workspace cache key fixture; optional route transition fixture. | No cross-user/workspace leak; no route transition claim without measurement. | `library-templates-cache.test.tsx`, route transition spec only if changed. | U2/U4 command; optional Playwright. | Green for cache; route e2e skipped unless claim exists. | Document skip reason and residual risk. |

## Known Broad Validation Constraint

Full `bun run validate` is known red on current `main` in the repo-wide DOM phase. Use targeted DOM matrices above for changed behavior, then `bun run type-check`, scoped ESLint, and `git diff --check`. Do not claim repo-wide green unless a fresh full validation run actually passes.
