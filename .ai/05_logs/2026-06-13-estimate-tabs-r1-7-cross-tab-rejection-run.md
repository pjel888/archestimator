# Estimate Tabs R1.7 Cross-Tab Rejection Run

## Summary

Resolved the safe local part of R1.7 without changing the D-7 product boundary.
Cross-tab node moves still require a new tab-aware move RPC and remain deferred,
but the v1 UI now rejects estimate-tree node drops on a different tab strip button
with the documented workaround message instead of spring-loading to that tab.
Template and project-source drags still spring-load inactive tabs for normal
insert/drop targeting.

## Files changed

- `src/components/workshop/estimate-sheet/drag-types.ts` centralizes the estimate-tree drag MIME type used by the sheet tree and tab strip.
- `src/components/workshop/EstimateSheetTree.tsx` uses the shared tree drag MIME type for tree drags.
- `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx` distinguishes estimate-tree drags from template/project-source drags, prevents cross-tab node drops, and raises the D-7 workaround toast/live-region message.
- `tests/vitest/estimate-tab-strip.test.tsx` covers the cross-tab tree-node rejection path.

## Gates run

```text
label=vitest-r1-7-cross-tab-rejection exit_code=0 command="bun x vitest run tests/vitest/estimate-tab-strip.test.tsx --maxWorkers=1" result="1 file / 9 tests passed"
label=eslint-r1-7-cross-tab-rejection exit_code=0 command="bunx eslint src/components/workshop/estimate-sheet/EstimateTabStrip.tsx src/components/workshop/EstimateSheetTree.tsx src/components/workshop/estimate-sheet/drag-types.ts tests/vitest/estimate-tab-strip.test.tsx" result="0 errors / 0 warnings"
label=vitest-r1-7-tree-reorder-regression exit_code=0 command="bun x vitest run tests/vitest/estimate-tab-strip.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-tabs-schema.test.ts --maxWorkers=1" result="5 files / 62 tests passed"
label=type-check-r1-7-cross-tab-rejection exit_code=0 command="bun run type-check" result="tsc --noEmit passed"
label=diff-check-r1-7-cross-tab-rejection exit_code=0 command="git diff --check" result="no whitespace errors"
```

## Remaining boundary

- Cross-tab node movement is not implemented; D-7 remains the follow-up for a new move RPC, sort semantics, DB simulation, and linked/provider proof.
- No linked Supabase apply/typegen, hosted browser proof, Vercel deploy, production deploy, or manual two-browser QA was performed.

## Full-validation closeout

The first full `bun run validate` after the R1.7 update reached DOM Vitest and
found one stale AI package-builder security-contract assertion from the earlier
R11.3 tab-context change. After updating that contract, full validation passed.

```text
label=vitest-ai-package-builder-security-contract-tab-context exit_code=0 command="bun x vitest run tests/vitest/ai-package-builder-security-contract.test.ts --maxWorkers=1" result="1 file / 9 tests passed"
label=validate-after-r1-7-r11-3-security-contract exit_code=0 command="bun run validate" result="type-check passed; ESLint 0 errors / 549 warnings; design-system passed; design lint passed; unit 9 passed; DOM Vitest 243 files passed / 1 skipped, 1808 tests passed / 3 skipped"
```
