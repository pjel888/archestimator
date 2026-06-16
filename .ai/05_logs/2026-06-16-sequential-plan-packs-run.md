# Sequential Plan Packs Run

**Date:** 2026-06-16
**Branch:** `codex/sequential-plan-packs`
**Mode:** implementation, ultragoal + ultrawork + ultraqa
**Prompt:** `.ai/08_prompts/IMPLEMENT-2026-06-16-Sequential-Plan-Pack-Goal.md`

## Coordination

- Lead owns integration, shared-file conflict checks, validation, UltraQA evidence, archival moves, and final completion claims.
- Parallel worker lanes are scoped to the active plan only.
- Workers must treat the directory as shared, avoid staging/committing, avoid broad formatting, and report changed files or read-only findings.

## Plan Order

1. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table`
2. `.ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan`
3. `.ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan`

## Active Plan 1 Lanes

- `plan1-repo-map`: read-only implementation touchpoint map.
- `plan1-test-qa-map`: read-only verification and UltraQA scenario map.
- `plan1-ux-design-map`: read-only UX, a11y, and design-system fit map.

## Plan 1 Checkpoint - 2026-06-16 03:11 PST

**Implemented**

- Canonical estimate-sheet column model in `src/lib/estimate-sheet/column-model.ts`.
- Shared CSS-grid template applied to row-table headers/body rows without adding width props to branch/table components.
- Default-disabled `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED` workshop flag.
- Shared sticky column ruler with six accessible resize separators, per-column keyboard/double-click reset, and compact all-column reset.
- Imperative pointer-drag controller that mutates CSS vars on `[data-estimate-pointer-surface]` during live movement and commits only on release.
- Per-estimate Zustand/localStorage committed-width store with versioned scoped keys and `__last-used` fallback.

**Design / Product Decisions**

- `material` stayed at default/min `160px` as planned. The feature remains behind a disabled flag, so express-card floor measurement can happen before rollout without changing default production behavior.
- Width state remains screen-only/private: localStorage only, no Supabase/provider writes, no collaboration broadcast, no export/public/proposal influence.

**Verification**

- `bun run type-check` - pass.
- `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED=1 bunx vitest run tests/vitest/estimate-sheet-column-model.test.ts tests/vitest/estimate-column-widths-store.test.ts tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx --maxWorkers=1` - pass, 17 tests.
- `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED=0 bunx vitest run tests/vitest/estimate-sheet-column-resize-flag.test.ts --maxWorkers=1` - pass, 2 tests.
- `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED=1 bunx vitest run tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/estimate-component-drag.test.tsx tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/project-publication-snapshot.test.ts --maxWorkers=1` - pass, 28 tests.
- Changed-file ESLint command covering implementation and focused tests - pass.
- `git diff --check` - pass.

**Browser / Auth Boundary**

- Local server was already listening on `localhost:3000`.
- `curl -I http://localhost:3000/workshop` returned HTTP `307` to `/login?next=%2Fworkshop`.
- Required auth proof inputs were absent in this shell: `ARCHESTIMATOR_DEV_AUTH_BYPASS`, `ARCHESTIMATOR_DEV_AUTH_EMAIL`, `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PLAYWRIGHT_STORAGE_STATE`.
- Browser E2E/manual authenticated proof is recorded as `AUTH-BLOCKED`; strongest substitute evidence is the focused component/store/perf/export/publication suite above.

**UltraQA Summary**

- Malformed/corrupt storage: covered by store tests.
- Unknown/out-of-range widths: covered by column model and store tests.
- Feature flag off: covered by flag test; no default enablement.
- Repeated pointer movement: covered by ruler test proving zero commit until pointer-up.
- Keyboard and reset a11y: covered by ruler test with separator roles and ARIA values.
- Virtualization/default DOM contracts: covered by row-table virtualization suite.
- Export/publication isolation: covered by proposal preview, workbook route, and publication snapshot tests.
- Remaining external proof gap: authenticated browser smoke for real layout, text selection, horizontal scroll, and two-context collaboration cursor anchoring.

## Plan 2 Checkpoint - 2026-06-16

**Implemented**

- `WorkshopCollectionLayout` now forwards a `filterSlot` into the tree panel header so project-list controls can live beside existing actions without changing shared collection layout semantics.
- `/workshop/projects` now uses compact `DropdownSelect` controls for View and Sort field, plus a separate direction button with date/text-aware labels.
- Sort remains v1 in-memory only: no localStorage key, query string, repository, database, or server preference changes.
- Untouched default ordering preserves the server/repository order inside the active tab; explicit sort applies after active-tab filtering and search.
- Empty/sample states disable View with an accessible explanation and hide Sort.
- Large live cards now expose `Created {date}` secondary metadata with a full-date title; shared and pending card copy remains on its existing badge/status paths.

**Design / Product Decisions**

- View pattern recorded as `DropdownSelect` by product override. The options are labeled `View: List`, `View: Small`, `View: Medium`, and `View: Large`, so the active density remains visible while collapsed.
- The documented F11 client-side threshold remains a future boundary, not an implemented pagination/server-sort change.

**Verification**

- `bunx vitest run tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-creation-ui.test.ts --maxWorkers=1` - pass, 39 tests.
- `bun run type-check` - pass.
- Changed-file ESLint command covering the three source files and five focused tests - pass.
- `git diff --check` - pass.

**Browser / Auth Boundary**

- Authenticated `/workshop/projects` browser smoke is recorded as `AUTH-BLOCKED` for the same local auth boundary observed in Plan 1: local `/workshop` redirects to `/login`, and no dev-auth/storage-state/Supabase credentials are available in this shell.
- Substitute evidence is the focused render/interaction/unit/static suite above; it covers toolbar coexistence, dropdown selection, sorting, search+sort, access tabs, empty/sample behavior, bulk selection persistence, and large-card created-date rendering.

**UltraQA Summary**

- Search, View, Sort, direction, Add, and tabs coexistence: covered by `projects-page-sort-controls.test.tsx`.
- Untouched default order preservation: covered by the sort controls suite.
- Date and text sort null/tie behavior: covered by the sort controls suite.
- Bulk-selection stability through reorder: covered by the sort controls suite.
- Empty/sample disabled/hidden control rules: covered by the sort controls suite.
- Shared/pending badge/status regression: covered by shared/access tab tests.
- Static source contract: covered by `project-creation-ui.test.ts`.
- Remaining external proof gap: authenticated desktop/narrow toolbar smoke, dropdown clipping, and real browser keyboard focus behavior.

## Plan 3 Checkpoint - 2026-06-16

**Implemented**

- `/workshop/projects/[projectId]/data` now renders `ProjectDataClient` from `getProjectDataRouteSummary`, not the legacy `ProjectChartsClient`.
- Added `src/lib/repositories/project-data-repository.ts` for project-scoped sheet summaries, selected-sheet fallback, mixed-currency rollups, and stacked vs totals-only mode.
- Added a pure `resolveProjectDataRouteState` helper so canonical `?sheet=` and legacy read-only `?left=` fallback are tested without booting a Next route.
- Added `ProjectDataKpiHeader`, `CostBreakdownSection`, and `CostAcrossSheetsSection` using shared workshop UI primitives and shared chart color/format utilities.
- Extended `CostDonutChart` with controlled active-bucket state and 11px callout text for the data route.
- Updated `buildCompareHref` to emit canonical `/data?sheet=<firstEstimate>` links and preserve grouping mode without emitting `right=`.
- Added a permanent Next redirect from `/workshop/projects/:projectId/charts` to `/workshop/projects/:projectId/data`.
- Replaced the old comparison loading skeleton with a data-shaped KPI/breakdown/across-sheets skeleton.
- Retargeted stale static tests from "Project charts" to "Project data" and loosened dashboard fixtures so legacy project-chart components can be pruned later without import-time crashes.

**Design / Product Decisions**

- Default grouping is Category.
- Cross-sheet bars are discrete estimate-sheet comparisons, not trends or timelines.
- Mixed-currency projects hide Section 2 and show a notice instead of summing across currencies.
- Projects with more than 20 estimate sheets switch to totals-only bars.
- Pairwise `left/right` comparison is retired from generated links; old `left` links are accepted as a scoped selected-sheet fallback, while `right` is ignored.

**Review Fixes**

- Removed invalid `aria-pressed` from focusable table rows; row focus/hover now remains a visual highlight only.
- Changed client query replacement to overwrite stale invalid `sheet` params with the current selected fallback on grouping changes.
- Added behavior-level coverage for route state parsing, repository-derived mixed/totals-only decisions, and real redirect config shape.
- Removed unused exported bucket-selection helpers from the repository boundary.

**Verification**

- `bunx vitest run tests/vitest/project-data-route-state.test.ts tests/vitest/project-data-repository.test.ts tests/vitest/route-error-smoke-gate.test.ts tests/vitest/project-charts-cache-freshness.test.ts tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/charts-to-data-redirect.test.ts tests/vitest/project-data-cost-breakdown-ui.test.tsx tests/vitest/project-data-cost-across-sheets-ui.test.tsx tests/vitest/project-data-a11y.test.tsx` - pass, 32 tests.
- `bun test tests/unit/compare-href.test.ts` - pass, 6 tests.
- Cross-pack focused regression bundle: `bunx vitest run tests/vitest/estimate-sheet-column-model.test.ts tests/vitest/estimate-column-widths-store.test.ts tests/vitest/estimate-sheet-column-resize-flag.test.ts tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/project-creation-ui.test.ts tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/charts-to-data-redirect.test.ts tests/vitest/project-data-cost-breakdown-ui.test.tsx tests/vitest/project-data-cost-across-sheets-ui.test.tsx tests/vitest/project-data-a11y.test.tsx` - pass, 75 tests.
- `bun run type-check` - pass.
- Changed-file ESLint command covering tracked modified files plus untracked new source/tests - pass.

**Browser / Auth Boundary**

- Authenticated `/workshop/projects/:projectId/data` browser smoke is recorded as `AUTH-BLOCKED` for the same local auth boundary observed in Plans 1 and 2: local workshop routes redirect to login, and no dev-auth/storage-state/Supabase credentials are available in this shell.
- Substitute evidence is the focused route-state/repository/component/static/type/lint suite above; it covers old-link fallback, stale sheet cleanup, no-sheets empty state, one-sheet hidden cross-section, mixed-currency gate, >20 totals-only mode, chart-table ARIA links, and redirect config shape.

**UltraQA Summary**

- Malformed/stale URL state: covered by `project-data-route-state.test.ts` and `project-data-a11y.test.tsx`.
- Foreign selected sheet fallback: covered by `project-data-repository.test.ts`.
- Mixed currency and >20-sheet branch: covered at both repository and component levels.
- Empty/no-sheet state: covered by `project-data-cost-breakdown-ui.test.tsx`.
- One-sheet cross-section hidden: covered by `project-data-cost-across-sheets-ui.test.tsx`.
- Chart/table a11y: covered by `project-data-a11y.test.tsx` and `project-data-cost-across-sheets-ui.test.tsx`.
- Redirect/back-compat: covered by `charts-to-data-redirect.test.ts` and route-state tests; browser-level redirect smoke remains auth/browser blocked.

## Final Verification - 2026-06-16

- `bun test tests/unit/compare-href.test.ts` - pass, 6 tests.
- `bunx vitest run tests/vitest/estimate-sheet-column-model.test.ts tests/vitest/estimate-column-widths-store.test.ts tests/vitest/estimate-sheet-column-resize-flag.test.ts tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/project-creation-ui.test.ts tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-data-route-state.test.ts tests/vitest/project-data-repository.test.ts tests/vitest/route-error-smoke-gate.test.ts tests/vitest/project-charts-cache-freshness.test.ts tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/charts-to-data-redirect.test.ts tests/vitest/project-data-cost-breakdown-ui.test.tsx tests/vitest/project-data-cost-across-sheets-ui.test.tsx tests/vitest/project-data-a11y.test.tsx` - pass, 19 files / 90 tests.
- `bun run type-check` - pass.
- Changed-file ESLint over tracked modified files plus untracked new TypeScript/TSX files - pass.
- `git diff --check` - pass.

**Final blocker / residual risk**

- Authenticated browser proof remains blocked by the local auth boundary and missing dev-auth/storage-state/Supabase credentials. This is documented as an external proof gap, not a local implementation failure.

## Stop-Hook Fresh Verification - 2026-06-16

The Codex stop hook reported OMX ultrawork was still active after the goal was completed. Fresh evidence was gathered before clearing the runtime state:

- `omx state read --input '{"mode":"ultrawork"}' --json` - confirmed `active: true` before cleanup.
- `bun test tests/unit/compare-href.test.ts` - pass, 6 tests.
- `bunx vitest run tests/vitest/estimate-sheet-column-model.test.ts tests/vitest/estimate-column-widths-store.test.ts tests/vitest/estimate-sheet-column-resize-flag.test.ts tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/project-creation-ui.test.ts tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-data-route-state.test.ts tests/vitest/project-data-repository.test.ts tests/vitest/route-error-smoke-gate.test.ts tests/vitest/project-charts-cache-freshness.test.ts tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/charts-to-data-redirect.test.ts tests/vitest/project-data-cost-breakdown-ui.test.tsx tests/vitest/project-data-cost-across-sheets-ui.test.tsx tests/vitest/project-data-a11y.test.tsx` - pass, 19 files / 90 tests.
- `bun run type-check` - pass.
- Changed-file ESLint over tracked modified files plus untracked new TypeScript/TSX files - pass.
- `git diff --check` - pass.

## UltraQA Stop-Hook Fresh Verification - 2026-06-16

The Codex stop hook reported OMX ultraqa was still active in `planning` with an empty scenario matrix. A fresh adversarial QA closeout was run before clearing the runtime state.

**Scenario matrix**

| ID | User / attacker model | Scenario | Command / harness | Expected signal | Actual result | Status | Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UQA-001 | Normal signed-out user | New Data route remains protected | `curl -D - http://127.0.0.1:3000/workshop/projects/demo/data?sheet=demo&mode=breakdown` | Redirect to `/login` | `HTTP/1.1 307`, `location: /login?next=.../data...` | Pass | No artifact |
| UQA-002 | Malformed / injection-shaped request | Encoded path traversal and script-shaped query cannot expose Data page | `curl -D - http://127.0.0.1:3000/workshop/projects/%2e%2e%2fetc%2fpasswd/data?...` | Redirect to `/login`, no route render | `HTTP/1.1 307`, `location: /login?next=...` | Pass | No artifact |
| UQA-003 | Legacy-link user | Retired Charts route still canonicalizes | `curl -D - http://127.0.0.1:3000/workshop/projects/demo/charts?sheet=...` | Permanent redirect to `/data` | `HTTP/1.1 308`, `location: /workshop/projects/demo/data?...` | Pass | No artifact |
| UQA-004 | Legacy-link + signed-out user | Following old Charts link does not leak Data page | `curl -L .../charts?...` plus marker check | No `data-project-data-page`; login marker present | Data marker `no`; login marker `yes` | Pass | No artifact |
| UQA-005 | Stale / malformed UI state | Query, selected sheet fallback, mixed currency, >20-sheet, empty and a11y states | Targeted Vitest bundle, 19 files | All assertions pass | 90 tests passed | Pass | No artifact |
| UQA-006 | Dirty worktree / generated artifact risk | Verify lint and whitespace on modified plus untracked source/tests | Changed-file `bunx eslint`; `git diff --check` | Exit 0 | Exit 0 | Pass | No artifact |
| UQA-007 | Hung / conflicting dev server | Attempted new dev server on `3046` while repo server already active | `PORT=3046 bun run dev -- --hostname 127.0.0.1` | Bounded failure, use existing server | Next reported existing server at `localhost:3000`; substituted live probe there | Pass | Spawned process exited |
| UQA-008 | Stale workflow state | UltraQA state is active before cleanup and inactive after cleanup | `omx state read/write/read` | `active: false`, `current_phase: complete` | Completed after verification | Pass | State closed |

**Commands run**

- `omx state read --input '{"mode":"ultraqa"}' --json` - confirmed `active: true`, `current_phase: planning` before QA closeout.
- `bun test tests/unit/compare-href.test.ts` - pass, 6 tests.
- `bun run type-check` - pass.
- `bunx vitest run tests/vitest/estimate-sheet-column-model.test.ts tests/vitest/estimate-column-widths-store.test.ts tests/vitest/estimate-sheet-column-resize-flag.test.ts tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/project-creation-ui.test.ts tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-data-route-state.test.ts tests/vitest/project-data-repository.test.ts tests/vitest/route-error-smoke-gate.test.ts tests/vitest/project-charts-cache-freshness.test.ts tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/charts-to-data-redirect.test.ts tests/vitest/project-data-cost-breakdown-ui.test.tsx tests/vitest/project-data-cost-across-sheets-ui.test.tsx tests/vitest/project-data-a11y.test.tsx --maxWorkers=1` - pass, 19 files / 90 tests.
- Live unauthenticated route probes against existing local Next server on `127.0.0.1:3000` - pass for normal data route, malformed/injection-shaped data route, old charts redirect, and follow-redirect no-data-leak check.
- Changed-file ESLint over tracked modified files plus untracked new TypeScript/TSX files - pass.
- `git diff --check` - pass.

**Residual risks**

- Authenticated browser walkthrough remains blocked by local auth/storage-state/Supabase credentials. Safe substitute evidence is route-level fail-closed probing plus the targeted route-state, repository, component, a11y, redirect, type, and lint suites.

## UltraQA Stale-State Cleanup - 2026-06-16

A later stop hook still reported UltraQA active. Fresh evidence was gathered and the project-local OMX state tree was inspected directly.

- `omx state read --input '{"mode":"ultraqa"}' --json` - initially returned a newer `active: true`, `current_phase: planning` state for session `019ecdbb-4e5d-79d2-921d-5ebd05383eee`.
- `find /Users/philiplewis/Documents/archestimator/.omx /Users/philiplewis/.omx -path '*ultraqa*state*.json' -o -name 'ultraqa-state.json'` - found three project-local UltraQA session records.
- `bun test tests/unit/compare-href.test.ts` - pass, 6 tests.
- `bunx vitest run tests/vitest/project-data-route-state.test.ts tests/vitest/charts-to-data-redirect.test.ts tests/vitest/project-data-a11y.test.tsx --maxWorkers=1` - pass, 3 files / 10 tests.
- Live unauthenticated probes against `127.0.0.1:3000` - Data route returned `307` to `/login`; legacy Charts route returned `308` to `/workshop/projects/demo/data?sheet=demo`.
- `git diff --check` - pass.
- All three project-local `.omx/state/sessions/*/ultraqa-state.json` records were marked `active: false`, `current_phase: complete`, `run_outcome: finish`, and `lifecycle_outcome: finished`.
- Final `omx state read --input '{"mode":"ultraqa"}' --json` - returned `active: false`, `current_phase: complete`.
