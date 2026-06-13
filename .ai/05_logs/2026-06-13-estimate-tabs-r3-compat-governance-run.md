# Estimate Tabs R3 Compatibility Governance Run

Branch/worktree: `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`.
Date: 2026-06-13.
Proof boundary: local governance only. No compatibility shims were deleted, and no internal `EstimateSheet*` rename batch was attempted.

## Summary

- R3.2 now has plan-linked compatibility comments at the retained legacy `sheet` seams that are intentionally not renamed in this release train: legacy `areaTree`, `sheet_code`, `fetchEstimateSheetVersionControl`, `EstimateSheetContent`, pre-tab `dataTabId`, and the narrow `estimate_tabs` type-cast boundary.
- R3.3 cleanup criteria were already explicit in 04 §12 and 14 §6.1; the new source-contract test guards the immediate-vs-one-release-cycle gates so future cleanup agents cannot delete wrappers or rename symbols before grep, provider/manual proof, owner approval, and contract-test batches are ready.

## Changed files

- `src/hooks/use-estimate-query.ts`
- `src/lib/estimates/actions.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/estimate-tabs-domain.test.ts`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/10_state/current-state.md`

## Gates run

```text
label=vitest-r3-compat-governance exit_code=0 command="bun x vitest run tests/vitest/estimate-tabs-domain.test.ts --maxWorkers=1" result="1 file / 6 tests passed"
label=type-check-r3-compat-governance exit_code=0 command="bun run type-check"
label=vitest-r3-compat-governance-post-doc exit_code=0 command="bun x vitest run tests/vitest/estimate-tabs-domain.test.ts --maxWorkers=1" result="1 file / 6 tests passed"
label=eslint-r3-compat-governance exit_code=0 command="bunx eslint src/hooks/use-estimate-query.ts src/lib/estimates/actions.ts src/components/workshop/EstimateSheetContent.tsx tests/vitest/estimate-tabs-domain.test.ts" result="0 errors / 0 warnings"
label=type-check-r3-compat-governance-post-doc exit_code=0 command="bun run type-check"
label=diff-check-r3-compat-governance exit_code=0 command="git diff --check"
```

## Remaining boundary

- Actual deletion of compatibility wrappers, legacy aliases, route fallback scaffolding, or internal `EstimateSheet*` renames remains deferred until the documented Phase 8 gates are satisfied.
- Required future evidence includes grep proof, contract-test updates, a completed beta release carrying Phases 1-7 with provider/manual proof archived, no rollback opened, and owner/reviewer approval.
