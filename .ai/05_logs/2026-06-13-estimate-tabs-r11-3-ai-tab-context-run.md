# Estimate Tabs R11.3 AI Tab Context Run

**Date:** 2026-06-13
**Branch/worktree:** `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`

## Summary

Closed the additive R11.3 AI read-context/audit follow-up locally.

- Ask read context now reads `estimate_tabs` alongside current-estimate nodes/rows, groups the provider-safe current estimate by tab name, exposes active/default tab summaries without leaking tab IDs to the provider context, and keeps the legacy `currentEstimate.tree`/`rows` shape for existing answers.
- Current-estimate activity reads select `estimate_sheet_events.estimate_tab_id`, map events to provider-safe tab names, and include tab counts without exposing raw tab IDs in the provider context.
- AI data-access audit inputs now include `estimate_tabs` in `sourceTables` and tab IDs/active tab IDs inside the hashed `filter` payload for current-estimate tree/row/activity reads, using the existing no-schema-change audit storage path.
- Package-builder read tools already had active-tab routing coverage; the wider AI/package-builder regression suite stayed green.

## Red/green evidence

```text
label=vitest-r11-3-ai-tab-context-red exit_code=1 command="bun x vitest run tests/vitest/ai-ask-read-context.test.ts --maxWorkers=1" result="new current-route tab grouping contract failed before implementation: node select lacked estimate_tab_id"
label=vitest-r11-3-ai-read-context-green exit_code=0 command="bun x vitest run tests/vitest/ai-ask-read-context.test.ts --maxWorkers=1" result="1 file / 9 tests passed"
label=vitest-r11-3-ai-regression exit_code=0 command="bun x vitest run tests/vitest/ai-ask-read-context.test.ts tests/vitest/ai-ask-route.test.ts tests/vitest/ai-audit-flow.test.ts tests/vitest/ai-audit-schema.test.ts tests/vitest/ai-package-builder-read-tools.test.ts tests/vitest/ai-package-builder-draft.test.ts tests/vitest/ai-package-builder-route.test.ts --maxWorkers=1" result="7 files / 118 tests passed"
label=eslint-r11-3-ai-tab-context exit_code=0 command="bunx eslint src/lib/ai/read-context.ts tests/vitest/ai-ask-read-context.test.ts" result="0 errors / 0 warnings"
label=type-check-r11-3-ai-tab-context exit_code=0 command="bun run type-check" result="tsc --noEmit passed"
label=diff-check-r11-3-ai-tab-context exit_code=0 command="git diff --check" result="no whitespace errors"
```

## Remaining boundary

- This is local code/test evidence only.
- No live AI provider request, linked Supabase audit-table insert, hosted browser proof, Vercel deploy, production deploy, or provider dashboard proof was performed.

## Full-validation security-contract addendum

A later full `bun run validate` run exposed one stale source-string assertion in
`tests/vitest/ai-package-builder-security-contract.test.ts`: the security
contract still expected activity-history reads to select no `estimate_tab_id` and
to omit `estimate_tabs` from source-table summaries. The assertion was updated to
match the R11.3 tab-aware read context while preserving the bounded-read and
no-snapshot guarantees.

### Additional gates run

```text
label=vitest-ai-package-builder-security-contract-tab-context exit_code=0 command="bun x vitest run tests/vitest/ai-package-builder-security-contract.test.ts --maxWorkers=1" result="1 file / 9 tests passed"
label=validate-after-r1-7-r11-3-security-contract exit_code=0 command="bun run validate" result="type-check passed; ESLint 0 errors / 549 warnings; design-system passed; design lint passed; unit 9 passed; DOM Vitest 243 files passed / 1 skipped, 1808 tests passed / 3 skipped"
```
