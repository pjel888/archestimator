# Phase 3 Implementation Run — Editor Tab UI Wiring

**Date:** 2026-06-12
**Branch:** `feat/estimate-tabs-phase3-editor-ui`
**Base commit:** `8c98ed6d` (Phase 2 repository/domain compatibility wrappers)
**Scope label:** Phase 3 local editor UI tab switching, tab-scoped tree/sheet state, and release-gated lifecycle controls.

## Objective

Implement the Phase 3 local-code slice from `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/10_IMPLEMENTATION_PHASES.md` and `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/05_ESTIMATE_TABS_UI_UX_PLAN.md`:

- Render an estimate tab strip in the editor with WAI-ARIA `tablist` semantics and roving keyboard focus.
- Resolve estimate routes through the tab-aware route context and pass initial tabs/active tab into the client workspace.
- Switch tree and sheet content between legacy estimate-wide queries and tab-scoped queries without breaking pre-apply fallback behavior.
- Scope tree selection/expansion, sheet collapse state, row mutation invalidation, and cursor collaboration payloads by active tab.
- Add an empty-tab state with add-group and template-browser affordances.
- Honor D-15: keep create/duplicate/rename/reorder lifecycle controls hidden from beta editor routes until tab-aware export ships.

## Files changed

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx`
- `src/components/workshop/estimate-sheet/events.ts`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-cursor-broadcast.ts`
- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/estimate-tab-strip.test.tsx`
- `tests/vitest/estimate-tabs-domain.test.ts`
- `tests/vitest/estimate-sheet-tree-dom.test.tsx`
- `tests/vitest/estimate-cursor-broadcast-throttle.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase3/*`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase3-implementation-run.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`

## Implementation notes

- The tab strip's lifecycle controls are intentionally present only as an opt-in internal path (`enableLifecycleActions`) and are not enabled by `EstimateSheetContent`. Default beta editor rendering shows switchable tabs only, protecting D-15 until Phase 6 export parity.
- The workspace uses the route-resolved tab as the initial active tab and stores later tab switches in client state. When no applied tab schema/tab route exists, the client renders a fallback Main display tab while keeping `dataTabId` undefined so legacy area-tree queries/actions continue to run.
- `resolveEstimateTabRouteContext` now treats an estimate-id route as a default-tab route after node lookup misses, while preserving missing-schema legacy fallback.
- `useEstimateAreaTreeQuery` and `useEstimateTabTreeQuery` now accept `enabled` flags so the editor does not fetch both legacy and tab-scoped trees for one active scope.
- Cursor collaboration payloads carry optional `tabId`; remote cursor rendering filters to the active tab when one exists.
- Export preview remains disabled when multiple persisted tabs are present and shows a local warning that export currently includes Main/default only.
- No linked Supabase apply, generated remote type refresh, Vercel deploy, or hosted provider proof was run.

## Validation results

| Gate | Exit | Classification | Artifact |
|---|---:|---|---|
| Phase 3 tab UI/domain/tree/cursor tests | 0 | PASS; 4 files / 20 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/phase3-tab-ui-vitest.log` |
| Sheet/editor regression/perf tests | 0 | PASS; 4 files / 54 tests | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/phase3-sheet-regression-vitest.log` |
| `bun run type-check` | 0 | PASS | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/type-check.log` |
| `bun run build` | 0 | PASS; `next-env.d.ts` restored after generated route-type churn | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/build.log` |
| `bun run lint:design-system` | 0 | PASS | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/lint-design-system.log` |
| `git diff --check` | 0 | PASS | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/diff-check.log` |
| `bun run lint` | 1 | PRE-EXISTING baseline only: 3 errors / 548 warnings, matching Phase 0/2 baseline | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/lint.log` |
| Localhost auth smoke | 0 | ROUTE PROTECTED as expected; `/workshop/projects` redirects to login | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/localhost-auth-smoke.log` |
| Browser visual proof | blocked | In-app Browser `iab` unavailable; authenticated editor visual proof not claimed | `.ai/05_logs/2026-06-12-estimate-tabs-phase3/browser-visual-proof-blocker.log` |

## Phase 3 RTM audit

Local implementation evidence advances these rows:

- R1.4 / Phase 3 editor UI: tab strip renders in the estimate editor and switches active tab state.
- R1.5 / per-tab workspace state: tree selection/expansion and sheet collapse state are scoped by active tab.
- R1.6 / per-tab tree isolation: content/tree use tab-scoped query keys when `dataTabId` exists and legacy area-tree keys otherwise.
- R4.1 / route compatibility: estimate-id routes resolve the default tab after tab-schema apply while legacy fallback remains intact before apply.
- R6.2 / collaboration isolation: cursor payloads and remote cursor filtering include active tab scope.
- R7.1 / D-15 release gate: create/duplicate lifecycle controls are hidden from beta editor routes and export preview is blocked for multi-tab persisted state.

Rows that intentionally stay open: Phase 4 copy rebrand, Phase 5 template/source automation, Phase 6 all-tabs export, Phase 7 AI/package-builder, Phase 8 cleanup/archive, hosted/manual proof, and owner-gated linked Supabase apply/typegen.

## Proof boundary

- **Local-only proven:** TypeScript, targeted tab UI/domain/tree/cursor tests, targeted sheet regression/perf tests, production build, design-system lint, diff whitespace.
- **Provider/manual pending:** linked Supabase apply/typegen, hosted DB proof, authenticated browser/manual editor proof, hosted export smoke, production deploy.
- **Not claimed:** user-visible tab creation/duplication, tab-aware export, production availability, or regenerated remote Supabase types.

## Next action

Commit Phase 3 local editor UI, then proceed to Phase 4 terminology/copy updates while preserving the non-target vocabulary guardrails and the D-15 export/lifecycle boundary.
