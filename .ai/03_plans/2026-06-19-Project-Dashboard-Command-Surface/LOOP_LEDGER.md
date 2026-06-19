# Loop Ledger

## Goal
Implement and verify the Project Dashboard Command Surface plan for `/workshop/projects/[projectId]`.

## Scope
- Phase 1: dashboard simplification with existing data, recent sheets, current published-link shortcut panel, honest activity/location placeholders, route loading/fallback alignment, focused accessibility/responsive states.
- Phase 2/3: deferred unless their migration/RLS/provider/privacy gates are explicitly satisfied.

## Non-goals
- No fake estimate activity.
- No fake map or fake pin.
- No map/geocoder dependency in Phase 1.
- No production/provider claims from local-only checks.
- No unrelated cleanup of pre-existing dirty `.ai` files.

## Branch / Status
- Branch: `main`
- Baseline status: `.ai/08_prompts/README.md` and `.ai/10_state/current-state.md` modified; implementation prompt file untracked before this run.
- Context snapshot: `.omx/context/project-dashboard-command-surface-20260619T100305Z.md`

## Source of Truth Read
- `AGENTS.md`
- `.ai/10_state/current-state.md` FAST PATH
- `.ai/08_prompts/IMPLEMENT-2026-06-19-Project-Dashboard-Command-Surface-Loop.md`
- Full plan pack `00-README.md` through `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md`
- `DESIGN.md`, `PRODUCT.md` via Impeccable context, and Impeccable product register
- Current route, dashboard, fallback, chrome, repository, and test files listed in the implementation prompt

## Acceptance Criteria
- Phase 1 requirements from `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md` pass with evidence.
- Phase 2 and Phase 3 rows are passed only if implemented; otherwise explicitly deferred by phase gate.
- `ProjectChromeAsync` streaming remains behind Suspense.
- No monolithic dashboard fetch or per-sheet fan-out.
- `loading.tsx` and `ProjectRouteContentFallback` do not render the old white slab.
- Targeted tests and `git diff --check` pass or failures are documented with next-best proof.

## Validation Plan
- Focused Vitest/source tests for project dashboard UI, route shell, recent sheets helper, and publication shortcut DTO.
- `git diff --check`.
- Browser proof only if needed for browser-only Phase 1 claims: route shell continuity, desktop/mobile stacking, no horizontal overflow, visible focus/tap sizing.

## Iteration Log

### Iteration 0 - Baseline And Ledger
- Hypothesis: Phase 1 is not implemented; the current dashboard still matches the older card/action-tile shape.
- Action: Loaded prompt, plan pack, design context, current source, current tests, active goal, and worktree state. Spawned read-only parallel agents for repo map, design/a11y, test mapping, and adversarial scope review.
- Files changed:
  - `.omx/context/project-dashboard-command-surface-20260619T100305Z.md` - Ralph/loop context snapshot.
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/LOOP_LEDGER.md` - required loop ledger.
- Evidence:
  - `get_goal` returned active objective for this implementation task.
  - `git status --short --branch` showed unrelated dirty `.ai` prompt/state files before implementation.
  - Source inspection found `ProjectActionTile`, `ProjectMetric`, `Project overview`, and white `ProjectRouteContentFallback` slab.
- Result: Baseline confirms Phase 1 implementation work remains.
- Next decision: Implement Phase 1 data contracts and UI/fallback updates; keep Phase 2/3 deferred unless gates are satisfied.

## Stop Condition
Stop only when Phase 1 is proven with targeted evidence and later phases are honestly marked deferred, or when a real blocker repeats and cannot be worked around.

## Proof Boundary
Current proof boundary: local-only until targeted tests/browser artifacts are collected.

## Remaining Risks
- Existing broad validation reds on `main` are known unrelated; targeted tests must distinguish new failures.
- Browser-only visual/layout claims may need a dev-server proof pass.

## Follow-up Bugs / Plans
- Phase 2 activity timeline requires migration/RLS proof before implementation.
- Phase 3 exact location/map requires provider/privacy/CSP proof before implementation.
