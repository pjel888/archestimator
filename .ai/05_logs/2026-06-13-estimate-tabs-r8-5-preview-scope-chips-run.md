# Estimate Tabs R8.5 Preview Scope Chips Run

**Date:** 2026-06-13
**Branch/worktree:** `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`

## Summary

Closed the R8.5 local hardening follow-up for preview/export model alignment. The proposal export preview now exposes explicit scope chips for multi-tab estimates:

- **All tabs** is selected by default and keeps the download link on the default all-tabs route (`/export/proposal.xlsx`).
- **Active tab** switches the download link to the `?tab={tabId}` active-tab route.
- The preview copy now says consolidation happens “within each tab,” matching the all-tabs workbook model.
- The preview staleness signature includes the active export scope and tab list so scope changes cannot drift from the download href.

## Red/green evidence

```text
label=vitest-r8-5-preview-scope-red exit_code=1 command="bun x vitest run tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1" result="new scope-chip/default-all-tabs assertions failed before implementation"
label=vitest-r8-5-preview-scope-green exit_code=0 command="bun x vitest run tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1" result="1 file / 3 tests passed"
label=vitest-r8-5-export-regression exit_code=0 command="bun x vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts --maxWorkers=1" result="5 files / 25 tests passed"
label=eslint-r8-5-preview-scope exit_code=0 command="bunx eslint src/components/workshop/EstimateSheetContent.tsx src/components/workshop/ProposalExportPreviewDialog.tsx tests/vitest/proposal-export-preview.test.tsx" result="0 errors / 0 warnings"
label=type-check-r8-5-preview-scope exit_code=0 command="bun run type-check" result="tsc --noEmit passed"
label=diff-check-r8-5-preview-scope exit_code=0 command="git diff --check" result="no whitespace errors"
```

## Remaining boundary

- This is local DOM/route/workbook/model evidence only.
- Hosted browser proof, spreadsheet-app manual inspection, Vercel deploy, production deploy, and linked provider proof were not performed.
