# Estimate Tabs R10.4 Publication Snapshot Tabs Run

Date: 2026-06-13
Branch: `feat/estimate-tabs-phase5-templates-panel`
Scope: local-only implementation proof for R10.4 publication snapshot v1.2 tabs and legacy shared-link rendering.

## Summary

Publication snapshots now include estimate-tab grouping when tab metadata is present at publish time. The server-side publication builder reads active `estimate_tabs` with nodes and rows, passes tab metadata into the snapshot builder, and emits schema version `1.2` for tabbed snapshots. Estimate-level rows/tree nodes remain present for compatibility, while each tab carries its own rows, totals, and tree nodes. Legacy snapshots without `tabs` still render through the existing estimate-level rows/tree path.

The public share page now renders a nested tab strip inside the selected estimate when a snapshot estimate has more than one tab. The donut, tree view, grid preview, and total reflect the active nested estimate tab. Old v1/v1.1 snapshots do not render the nested tab strip and continue to show the existing estimate-level content.

## Changed files

- `src/lib/publication/types.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/publication/actions.ts`
- `src/components/share/SharePageTabs.tsx`
- `tests/vitest/project-publication-snapshot.test.ts`
- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-actions.test.ts`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/10_state/current-state.md`

## Gates run

```text
label=vitest-publication-r10-4-focused-red exit_code=1 result=initial focused run failed on legacy row tabId:null drift and duplicate UI labels; failure was read and fixed
label=vitest-publication-r10-4-focused-green exit_code=0 command="bun x vitest run tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-actions.test.ts --maxWorkers=1" result="3 files / 48 tests passed"
label=type-check-r10-4 exit_code=0 command="bun run type-check" result="tsc --noEmit passed"
label=eslint-r10-4-focused-initial exit_code=0 command="bunx eslint src/lib/publication/types.ts src/lib/publication/snapshot.ts src/lib/publication/actions.ts src/components/share/SharePageTabs.tsx tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-actions.test.ts" result="0 errors; hook dependency warnings fixed"
label=eslint-r10-4-focused-final exit_code=0 command="bunx eslint src/lib/publication/types.ts src/lib/publication/snapshot.ts src/lib/publication/actions.ts src/components/share/SharePageTabs.tsx tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-actions.test.ts" result="0 errors / 0 warnings"
label=design-system-r10-4 exit_code=0 command="bun run lint:design-system" result="passed"
label=design-r10-4 exit_code=0 command="bun run lint:design" result="impeccable strict detect passed"
label=build-r10-4 exit_code=0 command="bun run build" result="Next.js 16.2.6 build passed; 35 static pages generated; next-env.d.ts route-type churn restored"
label=diff-check-r10-4 exit_code=0 command="git diff --check" result="passed"
```

## Proof boundary

- Local-only proof: snapshot builder, publication action source contract, share-page rendering tests, type-check, focused ESLint, design-system lint, strict design lint, production build, and diff whitespace check.
- Provider/manual proof pending: linked Supabase apply/typegen, hosted shared-link publish/read smoke with a real tabbed publication, spreadsheet/browser/manual proof, Vercel production deploy, and any live client review flow.
